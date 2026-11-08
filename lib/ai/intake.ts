// Mathew owns intake extraction. Maps a spoken narrative onto the 35-question
// form. Real path calls Gemini with structured JSON output; mock path uses
// deterministic keyword rules so the demo runs offline with no key.
//
// IMPORTANT: missingRequired and followUp are computed with our own logic.ts
// after the merge — never trusted from the model.

import type {
  Answers,
  IntakeExtractRequest,
  IntakeExtractResponse,
} from "@/lib/types";
import { QUESTIONS, QUESTION_BY_ID } from "@/components/form/questions";
import { missingRequired } from "@/components/form/logic";
import { mockExtract, mockFollowUpText } from "@/lib/mock/mathew";
import {
  deriveBranches,
  relevantMissingRequired,
  relevantQuestionIds,
  type Branch,
} from "@/lib/ai/relevance";

// Priority order for which missing-required question to ask next (B5).
const FOLLOW_UP_PRIORITY = [
  "q1", "q2", "q5", "q13", "q14", "q16", "q18", "q9", "q11", "q35",
];

function isEmptyVal(v: Answers[`q${number}`] | undefined): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Merge newly-extracted answers over existing, without overwriting manual ones. */
function mergeAnswers(existing: Answers, extracted: Answers): Answers {
  const merged: Answers = { ...existing };
  for (const [id, value] of Object.entries(extracted)) {
    const key = id as `q${number}`;
    if (isEmptyVal(merged[key]) && !isEmptyVal(value as Answers[`q${number}`])) {
      merged[key] = value as Answers[`q${number}`];
    }
  }
  return merged;
}

/** Choose the single most important missing-required question to ask next. */
function pickFollowUp(
  missing: string[]
): { questionId: string; text: string } | null {
  if (missing.length === 0) return null;
  const ordered = [
    ...FOLLOW_UP_PRIORITY.filter((id) => missing.includes(id)),
    ...missing.filter((id) => !FOLLOW_UP_PRIORITY.includes(id)),
  ];
  const id = ordered[0];
  return { questionId: id, text: conversationalPrompt(id) };
}

/** A conversational phrasing of a question for the follow-up loop. */
function conversationalPrompt(id: string): string {
  const q = QUESTION_BY_ID[id];
  const canned = mockFollowUpText(id);
  if (canned && !canned.startsWith("Can you tell me")) return canned;
  // Fall back to a softened version of the form label.
  return q ? `${q.label}?`.replace(/\?\?$/, "?") : "Can you tell me more?";
}

/** Build a compact JSON schema describing valid answers, for Gemini. */
function buildSchema() {
  const properties: Record<string, unknown> = {};
  for (const q of QUESTIONS) {
    // The question text tells the model what each q-id means.
    const description = q.help ? `${q.label} (${q.help})` : q.label;
    if (q.type === "single" && q.options) {
      // Gemini rejects empty enum values; unknown answers are simply left out.
      properties[q.id] = { type: "string", description, enum: q.options, nullable: true };
    } else if (q.type === "multi" && q.options) {
      properties[q.id] = {
        type: "array",
        description,
        items: { type: "string", enum: q.options },
        nullable: true,
      };
    } else {
      properties[q.id] = { type: "string", description, nullable: true };
    }
  }
  // Every field required-but-nullable: with all-optional fields Gemini fills
  // only two or three answers and stops.
  return { type: "object", properties, required: QUESTIONS.map((q) => q.id) };
}

const SYSTEM_INSTRUCTION = [
  "You map a spoken incident narrative onto a fixed health-centre form.",
  "Answer every question the narrative states or clearly implies, including",
  "yes/no questions (e.g. someone was hurt -> injury involved = Yes; an email",
  "sent to the wrong person -> confidentiality involved = Yes). Never invent",
  "facts the narrative does not support; use null for those.",
  "Always fill q32.",
  "Map loose speech to the exact option text provided in the schema enums.",
  "For the free-text narrative field q32, write a factual, first-person-neutral",
  "rewrite with NO assumptions or opinions.",
  "Only fill a child question if its parent answer makes it visible.",
  "Use fictional, non-identifiable data only.",
].join(" ");

/**
 * Main entry. Returns merged answers + missingRequired + the next follow-up.
 * Mock mode is deterministic and offline.
 */
export async function extractIntake(
  req: IntakeExtractRequest
): Promise<IntakeExtractResponse & { mock: boolean }> {
  const useMock = (process.env.USE_MOCK_AI ?? "true").toLowerCase() === "true";

  let extracted: Answers;
  let mock = true;

  if (useMock || !process.env.GEMINI_API_KEY) {
    extracted = mockExtract(req.transcript, req.answers);
    mock = true;
  } else {
    try {
      extracted = await callGemini(req);
      mock = false;
    } catch (err) {
      // Any AI failure falls back to deterministic rules — demo never breaks.
      console.error("Gemini extract failed, using mock fallback:", err);
      extracted = mockExtract(req.transcript, req.answers);
      mock = true;
    }
  }

  const answers = mergeAnswers(req.answers, extracted);
  const missing = missingRequired(answers); // our logic, not the model's
  const followUp = pickFollowUp(missing);

  return { answers, missingRequired: missing, followUp, mock };
}

/** Real Gemini call. Structured JSON output constrained by the form schema. */
async function callGemini(req: IntakeExtractRequest): Promise<Answers> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  // Langs is in Ontario; "today" / "this morning" / "yesterday" resolve against this.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const prompt = [
    SYSTEM_INSTRUCTION,
    `Today's date is ${today} (YYYY-MM-DD, Ontario time). Use it to fill q1 when the reporter says "today", "this morning", "yesterday" and so on. Write q2 like 9:40AM.`,
    "",
    "Answers already provided (do NOT overwrite non-empty ones):",
    JSON.stringify(req.answers),
    "",
    "Spoken narrative:",
    req.transcript,
    "",
    "Return a JSON object keyed by question id (q1..q35) with values that match",
    "the schema. Omit anything you cannot determine.",
  ].join("\n");

  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: buildSchema() as unknown as Record<string, unknown>,
    },
  });

  const text = result.text ?? "{}";
  const parsed = JSON.parse(text) as Record<string, unknown>;

  // Coerce to Answers, dropping empties.
  const out: Answers = {};
  for (const q of QUESTIONS) {
    const v = parsed[q.id];
    if (v == null) continue;
    if (q.type === "multi") {
      if (Array.isArray(v) && v.length) out[q.id as `q${number}`] = v as string[];
    } else if (typeof v === "string" && v.trim() !== "") {
      out[q.id as `q${number}`] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adaptive conversational intake
// ---------------------------------------------------------------------------
// One turn of the "Tell us what happened" conversation. The reporter speaks or
// types; we extract answers, decide which incident branches are relevant, and
// either ask the single most useful next question (relevant branch only) or
// finish. If the reporter's story is too thin to tell what happened, we say so
// and ask them to add detail rather than guessing.

export interface ConverseRequest {
  // Everything the reporter has said so far, joined (newest last).
  transcript: string;
  // Answers gathered so far.
  answers: Answers;
}

export interface ConverseResponse {
  answers: Answers; // merged
  // Which branches the AI judged relevant (for display / debugging).
  branches: Branch[];
  // What to do next.
  next:
    | { kind: "ask"; questionId: string; question: string }
    | { kind: "need_more"; question: string } // story too thin
    | { kind: "done" };
  relevantMissing: string[]; // relevant required ids still empty
  mock: boolean;
}

// Priority for asking the next relevant question.
const CONVERSE_PRIORITY = [
  "q1", "q2", "q5", "q3", "q13", "q14", "q16", "q18",
  "q9", "q11", "q10", "q35", "q32",
];

function orderByPriority(ids: string[]): string[] {
  return [
    ...CONVERSE_PRIORITY.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !CONVERSE_PRIORITY.includes(id)),
  ];
}

// Is the story rich enough to act on? We need at least a sense of WHAT happened.
function storyTooThin(transcript: string, answers: Answers): boolean {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length;
  const hasNarrative =
    typeof answers.q32 === "string" && answers.q32.trim().length > 0;
  // Fewer than 4 words and no extracted narrative → ask them to say more.
  return words < 4 && !hasNarrative;
}

export async function converseIntake(
  req: ConverseRequest,
): Promise<ConverseResponse> {
  const useMock =
    (process.env.USE_MOCK_AI ?? "true").toLowerCase() === "true";

  // 1. Extract answers from the full story so far.
  let extracted: Answers;
  let mock = true;
  if (useMock || !process.env.GEMINI_API_KEY) {
    extracted = mockExtract(req.transcript, req.answers);
    mock = true;
  } else {
    try {
      extracted = await callGemini({
        transcript: req.transcript,
        answers: req.answers,
      });
      mock = false;
    } catch (err) {
      console.error("converse extract failed, using mock:", err);
      extracted = mockExtract(req.transcript, req.answers);
      mock = true;
    }
  }

  const answers = mergeAnswers(req.answers, extracted);

  // 2. Too thin to tell what happened? Ask for more before anything else.
  if (storyTooThin(req.transcript, answers)) {
    return {
      answers,
      branches: ["core"],
      next: {
        kind: "need_more",
        question:
          "I didn't catch enough to go on. Can you tell me what happened, where, and who was involved?",
      },
      relevantMissing: [],
      mock,
    };
  }

  // 3. Decide relevant branches (rules are the floor; always safe).
  const branches = deriveBranches(answers);

  // 4. Which relevant required questions are still empty?
  const missing = relevantMissingRequired(answers, branches);

  if (missing.length === 0) {
    return {
      answers,
      branches: [...branches],
      next: { kind: "done" },
      relevantMissing: [],
      mock,
    };
  }

  // 5. Ask the most useful missing one, phrased conversationally.
  const nextId = orderByPriority(missing)[0];
  return {
    answers,
    branches: [...branches],
    next: {
      kind: "ask",
      questionId: nextId,
      question: conversationalPrompt(nextId),
    },
    relevantMissing: missing,
    mock,
  };
}

// Exposed so the UI can show which questions are in scope if it wants.
export function relevantScope(answers: Answers): string[] {
  return [...relevantQuestionIds(answers, deriveBranches(answers))];
}
