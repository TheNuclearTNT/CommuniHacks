import type {
  Answers,
  Incident,
  IncidentListItem,
  IntakeExtractResponse,
} from "@/lib/types";

// Fictional supervisor list (A8), used for q35 + the "done" screen.
export const SUPERVISORS: { id: string; name: string }[] = [
  { id: "u_sup_1", name: "Jordan Reyes" },
  { id: "u_sup_2", name: "Morgan Blake" },
];

export function supervisorNameFromAnswer(answer: string | undefined): string {
  if (!answer) return "your supervisor";
  if (answer === "Other") return "your supervisor";
  return answer;
}

// The spoken Scenario 3 narrative (A1 / B6) returned by the mock transcriber.
export const SCENARIO_3_TRANSCRIPT =
  "This is Riley at Main Site, about 2:15 today. I was moving a sealed supply " +
  "box in the storage room and pinched my hand between the box and the shelf. " +
  "Priya saw it. I put ice on it and Jordan gave first aid. It's minor, I'm " +
  "back at work.";

// A fictional list for /my-reports before the real API is wired (A7 scope=mine).
export const MOCK_MY_REPORTS: IncidentListItem[] = [
  {
    id: "INC-2026-0042",
    status: "SUPERVISOR_REVIEW",
    cycle: 1,
    createdAt: "2026-11-05T14:12:00.000Z",
    location: "Main Site",
    types: ["STAFF_INJURY"],
    severity: "Less Serious",
    oneLiner: "Pinched hand moving a supply box; first aid given.",
    currentOwnerRoles: ["SUPERVISOR"],
    nextClockDueAt: null,
  },
  {
    id: "INC-2026-0039",
    status: "CLOSED",
    cycle: 1,
    createdAt: "2026-10-28T09:40:00.000Z",
    location: "Bishop St",
    types: ["PRIVACY"],
    severity: "Less Serious",
    oneLiner: "Schedule emailed to the wrong address; recall attempted.",
    currentOwnerRoles: [],
    nextClockDueAt: null,
  },
];

// Build a fake Incident from the submitted answers so /done works offline.
export function mockCreateIncident(
  answers: Answers,
  transcript: string | undefined,
  footageHoldRequested: boolean
): Incident {
  const n = 43 + Math.floor(Math.random() * 50);
  const id = `INC-2026-${String(n).padStart(4, "0")}`;
  const supervisorName = String(answers.q35 ?? "");
  const supervisorId =
    SUPERVISORS.find((s) => s.name === supervisorName)?.id ?? "u_sup_1";
  return {
    id,
    cycle: 1,
    status: "SUBMITTED",
    currentOwnerRoles: ["SUPERVISOR"],
    submittedBy: "u_staff_1",
    supervisorId,
    answers,
    transcript,
    footageHoldRequested,
    createdAt: new Date().toISOString(),
    closedAt: null,
  };
}

/**
 * Deterministic keyword extraction for USE_MOCK_AI=true. No network.
 * Maps the canned Scenario 3 narrative (and similar speech) onto form answers.
 * Only fills answers that are currently null/absent — never overwrites manual.
 */
export function mockExtract(
  transcript: string,
  existing: Answers
): Answers {
  // Offline / fallback extractor. It also runs when real Gemini fails mid-
  // conversation (e.g. quota), so it must never add answers the story doesn't
  // support: whole-word matches only, no canned narrative, no blanket "No"s.
  const t = transcript.toLowerCase();
  const has = (...words: string[]) =>
    words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t));
  const filled: Answers = {};
  const setIfEmpty = (id: `q${number}`, value: Answers[`q${number}`]) => {
    const cur = existing[id];
    const empty =
      cur === null ||
      cur === undefined ||
      (typeof cur === "string" && cur.trim() === "") ||
      (Array.isArray(cur) && cur.length === 0);
    if (empty && value != null) filled[id] = value;
  };

  // Location
  if (has("main site", "main building")) setIfEmpty("q5", "Main Site");
  else if (has("bishop")) setIfEmpty("q5", "Bishop St");
  else if (has("grow")) setIfEmpty("q5", "Grow Community Centre");
  else if (has("north dumfries")) setIfEmpty("q5", "North Dumfries");

  // Reporting person
  if (has("riley")) setIfEmpty("q3", "Riley Chen");

  // Who was impacted
  if (has("visitor")) setIfEmpty("q9", "Visitor");
  else if (has("my hand", "i put ice", "back at work")) setIfEmpty("q9", "Staff/Volunteer");

  // Witnesses
  if (has("priya")) setIfEmpty("q4", "Priya Nair witnessed the incident.");

  // Severity
  if (has("minor")) setIfEmpty("q13", "Less Serious");

  // Injury — ignore "no one was hurt" / "not hurt"
  const negatedHurt = /\b(no one|nobody|not|wasn't|was not|without)\b[^.]{0,20}\b(hurt|injured)\b/.test(t);
  const injury = !negatedHurt && has("pinched", "pinch", "cut my hand", "hurt", "injured", "injury", "bruised", "slipped", "fell");
  if (injury) {
    setIfEmpty("q14", "Yes");
    if (has("slipped", "tripped", "fell")) setIfEmpty("q15", ["Slip/Trip/Fall"]);
    else setIfEmpty("q15", ["Impact (e.g. head injury, crushed finger etc.)"]);
  } else if (negatedHurt) {
    setIfEmpty("q14", "No");
  }

  // Privacy / building / IT
  if (has("email", "emailed", "wrong recipient", "wrong address", "replied-all", "confidential", "privacy")) {
    setIfEmpty("q18", "Yes");
    setIfEmpty("q19", ["Privacy/Confidentiality"]);
  } else if (has("phishing", "password", "virus", "hacked")) {
    setIfEmpty("q18", "Yes");
    setIfEmpty("q19", ["Cybersecurity"]);
  } else if (has("handrail", "broken", "damage", "damaged", "leak", "stolen", "theft")) {
    setIfEmpty("q18", "Yes");
    setIfEmpty("q19", [has("stolen", "theft") ? "Theft" : "Property Damage"]);
  }

  // Behaviour
  if (has("shouted", "yelled", "aggressive", "threatened", "harassed", "swore")) setIfEmpty("q16", "Yes");

  // The Scenario 3 demo story is a plain injury: nothing behavioural or building-related.
  if (injury && filled.q18 === undefined) setIfEmpty("q18", "No");
  if (injury && filled.q16 === undefined) setIfEmpty("q16", "No");

  // Emergency response — "No" only when the story mentions nothing of the kind.
  if (!has("code", "911", "police", "ambulance", "paramedic", "paramedics", "fire", "panic", "emergency", "cas", "children's aid")) {
    setIfEmpty("q20", "No");
    setIfEmpty("q22", "No");
    setIfEmpty("q23", "No");
    setIfEmpty("q28", "No");
    setIfEmpty("q30", "No");
  }

  // Interventions
  if (has("first aid", "ice", "ice pack")) setIfEmpty("q31", ["First Aid"]);

  // Time: "2:15 today" -> 2:15PM
  if (t.includes("2:15") || t.includes("2 15")) setIfEmpty("q2", "2:15PM");

  // Date: "today" / "this morning"
  if (has("today", "this morning", "this afternoon")) {
    setIfEmpty("q1", new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" }));
  }

  // Narrative (q32): the reporter's own words, not a canned story.
  const story = transcript.replace(/^Type of incident \(chosen by reporter\):[^.]*\.\s*/, "").trim();
  if (story) setIfEmpty("q32", story);

  // Supervisor
  if (has("jordan")) setIfEmpty("q35", "Jordan Reyes");
  else if (has("morgan")) setIfEmpty("q35", "Morgan Blake");

  return filled;
}

// A short canned AI response for /intake/extract when mock mode is on.
export function mockFollowUpText(questionId: string): string {
  const map: Record<string, string> = {
    q1: "What date did this happen?",
    q2: "What time did it happen?",
    q5: "Which site were you at?",
    q10: "What's a phone number for the person involved?",
    q13: "How serious do you think this is?",
    q35: "Who is your direct supervisor?",
  };
  return map[questionId] ?? "Can you tell me a bit more about that?";
}

export type { IntakeExtractResponse };
