import type { Answers } from "@/lib/types";
import { QUESTIONS } from "@/components/form/questions";
import { isVisible } from "@/components/form/logic";

// Which incident "branch" a question belongs to. The adaptive intake only asks
// questions whose branch is relevant to what the reporter described, so an IT
// issue never triggers injury or age questions.
export type Branch =
  | "core" // always relevant (what/where/when/who reporting)
  | "injury"
  | "behavioural"
  | "building" // facilities / privacy / IT / property
  | "emergency"
  | "people"; // the individual(s) involved, their details

// Map each question id to a branch.
const BRANCH_OF: Record<string, Branch> = {
  q1: "core", q2: "core", q3: "core", q4: "core", q5: "core", q6: "core",
  q7: "core", q32: "core", q33: "core", q13: "core", q35: "core",
  // people involved
  q9: "people", q10: "people", q11: "people", q12: "people", q30: "people",
  // injury
  q14: "injury", q15: "injury",
  // behavioural
  q16: "behavioural", q17: "behavioural",
  // building / facilities / privacy / IT
  q18: "building", q19: "building",
  // emergency response
  q20: "emergency", q21: "emergency", q22: "emergency", q23: "emergency",
  q24: "emergency", q25: "emergency", q26: "emergency", q27: "emergency",
  q28: "emergency", q29: "emergency", q31: "emergency", q34: "emergency",
};

export interface RelevantSet {
  // Branches that apply to this incident.
  branches: Set<Branch>;
  // The question ids that are in scope (relevant branch AND currently visible).
  relevantIds: Set<string>;
}

/**
 * Decide which branches apply from the answers gathered so far. Deterministic:
 * used directly in mock mode, and as a safe floor even when Gemini is on (we
 * never drop a branch the rules say is clearly relevant).
 *
 * Rules:
 * - core + people are always relevant (every incident has a what/where/who).
 * - injury: q14=Yes, or the narrative implied an injury (q14 set at all).
 * - behavioural: q16=Yes.
 * - building: q18=Yes.
 * - emergency: an emergency signal (q20/q22/q23/q28 = Yes) OR severity Critical.
 */
export function deriveBranches(answers: Answers): Set<Branch> {
  const b = new Set<Branch>(["core", "people"]);

  if (answers.q14 === "Yes") b.add("injury");
  if (answers.q16 === "Yes") b.add("behavioural");
  if (answers.q18 === "Yes") b.add("building");

  const emergencySignals = [answers.q20, answers.q22, answers.q23, answers.q28];
  if (emergencySignals.includes("Yes") || answers.q13 === "Critical") {
    b.add("emergency");
  }

  return b;
}

/**
 * Given answers + the set of relevant branches, return the question ids that
 * are (a) in a relevant branch and (b) currently visible per showIf. The three
 * gate questions q14/q16/q18 are always kept so we can confirm "no" for the
 * record, but their detail children only appear when the gate is Yes.
 */
export function relevantQuestionIds(
  answers: Answers,
  branches: Set<Branch>,
): Set<string> {
  const ids = new Set<string>();
  for (const q of QUESTIONS) {
    const branch = BRANCH_OF[q.id] ?? "core";
    // The three yes/no gates stay in scope so the form records a clear "No".
    const isGate = q.id === "q14" || q.id === "q16" || q.id === "q18";
    if (!branches.has(branch) && !isGate) continue;
    if (!isVisible(q, answers)) continue;
    ids.add(q.id);
  }
  return ids;
}

/**
 * The required question ids still empty, limited to the relevant set. This is
 * what the conversation chases — never the full 35.
 */
export function relevantMissingRequired(
  answers: Answers,
  branches: Set<Branch>,
): string[] {
  const relevant = relevantQuestionIds(answers, branches);
  return QUESTIONS.filter((q) => {
    if (!relevant.has(q.id)) return false;
    if (!q.required) return false;
    const v = answers[q.id as `q${number}`];
    const empty =
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);
    return empty;
  }).map((q) => q.id);
}
