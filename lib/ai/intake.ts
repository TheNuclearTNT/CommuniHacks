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
    if (q.type === "single" && q.options) {
      properties[q.id] = { type: "string", enum: [...q.options, ""] };
    } else if (q.type === "multi" && q.options) {
      properties[q.id] = {
        type: "array",
        items: { type: "string", enum: q.options },
      };
    } else {
      properties[q.id] = { type: "string" };
    }
  }
  return { type: "object", properties };
}

const SYSTEM_INSTRUCTION = [
  "You map a spoken incident narrative onto a fixed health-centre form.",
  "Fill only what the speaker actually said or clearly implied. Never invent.",
  "If something is unknown, leave it out (null).",
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

  const prompt = [
    SYSTEM_INSTRUCTION,
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
