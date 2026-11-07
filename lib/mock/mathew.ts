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
  const t = transcript.toLowerCase();
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
  if (t.includes("main site") || t.includes("main building")) {
    setIfEmpty("q5", "Main Site");
  } else if (t.includes("bishop")) {
    setIfEmpty("q5", "Bishop St");
  }

  // Reporting person
  if (t.includes("riley")) {
    setIfEmpty("q3", "Riley Chen");
    setIfEmpty("q11", "Riley Chen");
  }

  // Who was impacted — staff, since Riley is staff and injured
  if (t.includes("my hand") || t.includes("i put ice") || t.includes("back at work")) {
    setIfEmpty("q9", "Staff/Volunteer");
  }

  // Witnesses
  if (t.includes("priya")) setIfEmpty("q4", "Priya Nair witnessed the incident.");

  // Severity
  if (t.includes("minor")) setIfEmpty("q13", "Less Serious");

  // Injury
  if (
    t.includes("pinch") ||
    t.includes("cut my hand") ||
    t.includes("hurt") ||
    t.includes("injur")
  ) {
    setIfEmpty("q14", "Yes");
    setIfEmpty("q15", ["Impact (e.g. head injury, crushed finger etc.)"]);
  }

  // Behavioural / building — none implied here
  setIfEmpty("q16", "No");
  setIfEmpty("q18", "No");

  // Emergency response — none
  setIfEmpty("q20", "No");
  setIfEmpty("q22", "No");
  setIfEmpty("q23", "No");
  setIfEmpty("q28", "No");
  setIfEmpty("q30", "No");

  // Interventions
  if (t.includes("first aid") || t.includes("ice")) {
    setIfEmpty("q31", ["First Aid"]);
  }

  // Time: "2:15 today" -> 2:15PM
  if (t.includes("2:15") || t.includes("2 15")) setIfEmpty("q2", "2:15PM");

  // Date: "today"
  if (t.includes("today")) {
    setIfEmpty("q1", new Date().toISOString().slice(0, 10));
  }

  // Narrative (q32): neutral factual rewrite, no assumptions.
  setIfEmpty(
    "q32",
    "A staff member was moving a sealed supply box in the storage room at " +
      "Main Site and pinched a hand between the box and a shelf. A colleague " +
      "witnessed the event. First aid was given on site."
  );

  // Supervisor default (Jordan gave first aid, so route to Jordan Reyes)
  if (t.includes("jordan")) setIfEmpty("q35", "Jordan Reyes");

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
