# Claude prompt for Mathew: Staff intake (form engine, voice, AI fill)
### Langs SafeReport · CommuniHacks · Langs Community Health Centre incident reporting challenge

**Mathew, how to use this file:** put it in the root of our shared repo (or anywhere on your machine), open Claude Code in the repo folder, and say:

> Read `Mathew.md` fully. You are working for Mathew. Follow it exactly: plan first, then build Part B step by step, staying inside Mathew's files.

Keep the session going and paste back any questions it raises for the team. When teammates merge to `main`, tell Claude to pull and continue.

---

## Who you are working for, and what you're building

You are Claude, helping **Mathew**, one of four teammates building **Langs SafeReport** at a hackathon. Mathew owns the staff reporting experience: Langs' 35-question form rendered from config, voice narration via ElevenLabs, Gemini filling the form and asking only for missing required answers, and the staff 'My reports' list.

Three other Claude sessions are building the other parts in parallel: Mathew (staff intake), Connan (backend), Neel (review consoles), Ananya (dashboard, data, deploy, pitch). **Part A** gives you the full background, plus the exact shared contract that keeps the four parts compatible. **Part B** is Mathew's detailed task list and finish criteria.

**Your first message back** should be a short plan for Part B: steps, files you'll create, what you'll mock until teammates merge, and any questions. Then start building.

---

# PART A — SHARED CONTEXT (identical in all four teammate files)

Everything below this line until "PART B" is the same in Mathew.md, Connan.md, Neel.md and Ananya.md. Treat it as fixed: four Claude sessions are building four parts of one app at the same time, and they only fit together if everyone follows these exact names, types, folders and rules.

## A1. The situation

We are a team of four (Mathew, Connan, Neel, Ananya) at **CommuniHacks**, a hackathon. Our client is **Langs Community Health Centre**, a non-profit community health centre in Ontario, Canada (Cambridge / North Dumfries area). We chose their **incident reporting** challenge.

The official brief:

> Langs staff need a simple and secure way to report workplace incidents from any device, covering injuries, near misses, client safety events, property damage, and other organizational incidents. Reporting today is slow enough that some incidents never get recorded, which means patterns are hard to see and follow-up gets missed.
>
> Build a reporting tool that is quick for front-line staff and useful for supervisors. A supervisor should be able to review a report, route it to the right person, track follow-up actions through to completion, and see trends across incident types, locations, and time. The design tension is that every field you add makes it less likely someone finishes the form mid-shift, but a thin report is not useful for review, and finding that balance is most of the problem.

Langs also handed out printed sheets. The parts that matter:

**"One-Page Build Challenge" sheet:**
- "Langs has already developed the form content and basic routing pathway. The opportunity is to make the review, routing, acknowledgement, closure and future follow-up process easier to see and manage."
- Minimum demonstration:
  1. A staff member submits a fictional incident.
  2. The incident goes first to the staff member's supervisor.
  3. The supervisor completes and submits a Supervisor Review.
  4. The incident type determines whether an additional specialty review is required.
  5. The applicable specialty area reviews and acknowledges the incident.
  6. After the required acknowledgements, the incident goes to the Executive Assistant for final receipt.
  7. The record is electronically filed/closed and can be reopened if future follow-up is needed.
- Start with one working route: *Privacy incident → Supervisor Review → Privacy Officer reviews and acknowledges → Executive Assistant receives → Record closes.*
- If time allows: add a second route; show open / under review / acknowledged / closed statuses; add follow-up actions or reminders; show how a closed record could be reopened; create a simple summary or dashboard using fictional information; make it easy to use on a phone or tablet.
- **Prototype guardrails:**
  - Use fictional, non-identifiable information only.
  - Clearly label assumptions and anything still TO CONFIRM.
  - It does not need to be production-ready.
  - **Do not spend the whole hackathon rebuilding the intake form.**
  - A simple working route is more useful than a large unfinished system.

**"Incident Reporting Routing Pathway" sheet:**
- Core routing rule: every incident first goes to the staff member's supervisor. Additional routing happens only after the supervisor completes and submits the Supervisor Review.
- Steps:
  1. Staff submits.
  2. Supervisor receives and reviews.
  3. Supervisor submits the review, and the system checks the incident type and whether specialty review is needed.
  4. The applicable specialty area reviews and acknowledges. **"This is a review and acknowledgement step, not a formal approval step."**
  5. The Executive Assistant receives the completed incident after all required reviews and acknowledgements are complete.
  6. Electronic filing and closure. The EA is the final administrative checkpoint, so the record can be located again.
  7. Reopen if additional follow-up is needed, **"without creating a disconnected second record."**

**"Sample Routing After Supervisor Review" sheet:**

| Incident type | Route after Supervisor Review | Required action |
|---|---|---|
| Privacy | Privacy Officer | Review and acknowledge |
| Staff injury | JOHSC Chairs (two people) | Review and acknowledge |
| Facilities | IT/Facilities and Director of Operations | Review and acknowledge |
| IT / Cybersecurity | IT/Facilities and Director of Operations | Review and acknowledge |
| Behavioural | Normally remains with the supervisor unless considered serious | Additional pathway TO CONFIRM |
| Critical Incident Debrief | Critical Incident Debrief email or distribution group | Review/follow-up; address TO CONFIRM |

Notes on that sheet:
- Not every incident needs specialty routing.
- Where more than one specialty area applies, each required acknowledgement must be recorded before the incident moves forward.
- The EA receives the incident only after required reviews are complete.
- Use fictional data.
- Useful demonstration: show that changing the incident type changes the route.

(The sheet prints real-looking staff first names for each role. **We do not use them.** The app uses role accounts with fictional names.)

**"Fictional Testing Scenarios" sheet** (our acceptance tests):
1. **Privacy:** a staff member accidentally emails a fictional community-program schedule to the wrong external email address, notices, and tells the supervisor. Immediate action: notified supervisor, attempted recall. Route: Staff → Supervisor Review → Privacy Officer acknowledges → EA receives → Closed.
2. **Facilities near miss:** a loose handrail; a fictional visitor nearly trips; no injury; area temporarily blocked. Immediate action: restricted access, informed supervisor. Route: Staff → Supervisor Review → IT/Facilities **and** Director of Operations acknowledge → EA receives → Closed.
3. **Staff injury:** minor fictional hand injury moving a sealed supply box; first aid given. Route: Staff → Supervisor Review → JOHSC Chairs acknowledge → EA receives → Closed.

Optional variations:
- Change Scenario 1 from Privacy to Facilities and confirm the route changes.
- Keep Scenario 2 open by adding a follow-up action before closure.
- Reopen Scenario 3 after closure and add a follow-up note.
- Show what happens when more than one acknowledgement is required.

**Success check** (judges look for this):
- The prototype shows the current owner or stage.
- It shows the completed acknowledgements.
- It shows the final receipt by the Executive Assistant.
- It shows whether the record is open, closed or reopened.

## A2. Langs' existing intake form (35 questions, Microsoft Forms)

Field ids are `q1`…`q35`. `*` = required **when shown**.

| id | Question | Type | Options / notes | Shown when |
|---|---|---|---|---|
| q1 | Date of incident* | date | | always |
| q2 | Time of incident* | time | e.g. 8:00AM, 3:30PM | always |
| q3 | Reporting person* | short | first + last name | always |
| q4 | Witnesses or others involved | long | | always |
| q5 | Location of incident* | single | 3 Doors Down; Bishop St; Grow Community Centre; Main Site; North Dumfries; Regional Coordination Centre (RCC); Virtual; Youth and Teen Centre (YTC); Other (please specify below) | always |
| q6 | Other location of incident* | short | | q5 = Other |
| q7 | Service area* | single | Admin/Leadership; Administration/Operations; Clinical; Community Services; Diabetes Education Program (DEP); Facilities/IT; HART Hub; Regional Coordination Centre (RCC); Social Work; Women's Health; YWHO; Other (please specify) | always |
| q8 | Other service area* | short | | q7 = Other |
| q9 | Individual(s) impacted* | single | Patient/Participant over 18 years of age; Patient/Participant 18 years of age or younger; Staff/Volunteer; Visitor; Non Applicable; Other | always |
| q10 | Individual involved phone number* | short | | always |
| q11 | Name of individual(s) involved* | short | first + last name or patient ID | always |
| q12 | Has a similar incident occurred with this individual?* | single | Yes; No; Unknown | always |
| q13 | How severe do you think this incident is?* | single | Critical; Less Serious; Unsure | always |
| q14 | Injury/Accident involved?* | single | Yes; No. (Physical injury or health impact incl. sharps/needle stick, medication errors, self-inflicted injury/abuse concerns.) | always |
| q15 | Injury/Accident details | multi | Burn; Exposure to sharps; Faint/Collapse; Slip/Trip/Fall; Impact (e.g. head injury, crushed finger etc.); Medication Error; Other | q14 = Yes |
| q16 | Behavioural involved?* | single | Yes; No. (Verbal aggression, harassment/violence, discrimination, suicidal ideation, non-compliance, complaints, alleged mistreatment.) | always |
| q17 | Behavioural details | multi | Alleged Abuse or Mistreatment; Behavioural Incident Trend (Youth Programming Only); Complaints/Grievances; Discrimination; Harassment; Mischief; Suicidal Ideation; Total Non-Compliance; Verbal Aggression; Workplace Violence; Other | q16 = Yes |
| q18 | Building/Facility/Confidentiality involved?* | single | Yes; No. (Theft, damage, mischief, unsafe conditions, facility/security concerns not under an emergency response.) | always |
| q19 | Building/Facility/Confidentiality details | multi | Building Security System Activated; Cybersecurity; External Disaster; Privacy/Confidentiality; Property Damage; Theft; Other | q18 = Yes |
| q20 | Was an emergency code activated/called?* | single | Yes; No; Unknown | always |
| q21 | Emergency code activated | single | Assistance Required (escalated situation) (Code White); Bomb Threat (Code Black); Cybersecurity Threat (Code Cyber); Fire (Code Red); Hazardous Materials (Code Brown); Hold & Secure and Lockdown (Code Gray); Internal Disaster (Code Orange); Medical Emergency (Code Blue); Missing Child (Code Amber); Missing Person (Code Yellow); Other | q20 = Yes |
| q22 | Was a panic button utilized?* | single | Yes; No; Unknown | always |
| q23 | Were emergency services contacted?* | single | Yes; No; Unknown | always |
| q24 | Any other types of emergency response/support activated? | long | | always |
| q25 | Emergency services contacted* | single | Ambulance; Fire; Police; Other | q23 = Yes |
| q26 | Police officer name or badge #* | short | | q25 = Police |
| q27 | Police incident #* | short | | q25 = Police |
| q28 | Were Family & Children's Services contacted?* | single | Yes; No; Unknown | always |
| q29 | Name of person at F&CS spoken to* | short | | q28 = Yes |
| q30 | Was the involved individual's emergency contact notified?* | single | Yes; No; Unknown | always |
| q31 | Immediate intervention(s) | multi | Ask to Leave Premises; CPR; Crisis Counselling; Descalation; Dismissal/Suspension; First Aid; Security Guard Support; Supervisory Support; Other | always |
| q32 | Describe briefly what happened, including circumstances leading up to the incident. Do not include assumptions.* | long | | always |
| q33 | Follow up — recommendations to prevent re-occurrence; note any follow-ups or referrals | long | | always |
| q34 | Is a Critical Incident Debrief required? | single | Yes; No; Unknown | always |
| q35 | Who is your direct supervisor that this should be emailed to?* | single | fictional supervisor list (see A6 seed users) + Other | always |

Sections:
- "Incident basics": q1–q12
- "Description of Incident": q13–q19
- "Organizational Response": q20–q35

## A3. Product decisions (already made; do not re-decide)

1. **Name:** "Langs SafeReport" (working name).
2. **Pathway statuses:**
   ```
   SUBMITTED → SUPERVISOR_REVIEW → SPECIALTY_REVIEW (only if any area applies) → WITH_EA → CLOSED → REOPENED → (back through SUPERVISOR_REVIEW as the next cycle)
   ```
   - Reopen keeps the **same incident id** and increments `cycle`.
   - Display labels:
     - SUBMITTED "Submitted"
     - SUPERVISOR_REVIEW "Supervisor review"
     - SPECIALTY_REVIEW "Specialty acknowledgement"
     - WITH_EA "With Executive Assistant"
     - CLOSED "Filed and closed"
     - REOPENED "Reopened"
3. **Routing is deterministic rules, never AI.**
   - AI only suggests answers/types and flags discrepancies.
   - The supervisor confirms the types.
   - Suggested types come from the form answers:
     - `PRIVACY`: q19 includes "Privacy/Confidentiality"
     - `STAFF_INJURY`: q14 = Yes AND q9 = "Staff/Volunteer"
     - `FACILITIES`: q19 includes any of Building Security System Activated, Property Damage, Theft, External Disaster
     - `IT_CYBER`: q19 includes "Cybersecurity", or q21 = Code Cyber
     - `BEHAVIOURAL`: q16 = Yes
     - `CID`: q34 = Yes
4. **Acknowledgements required per confirmed type.** Rows are created when the Supervisor Review is submitted; duplicates are merged by role.
   - PRIVACY → `PRIVACY_OFFICER`
   - STAFF_INJURY → `JOHSC_CHAIR`: one row, either chair may complete it (TO CONFIRM whether both must).
   - FACILITIES → `IT_FACILITIES` + `DIRECTOR_OPS`
   - IT_CYBER → `IT_FACILITIES` + `DIRECTOR_OPS`
   - BEHAVIOURAL → none, unless the supervisor marks it serious → `DIRECTOR_OPS` (TO CONFIRM)
   - CID → `CID_GROUP` (TO CONFIRM)
   - If zero rows are created, go straight to WITH_EA.
5. **Wording:** specialty areas "Acknowledge"; never "Approve". The EA "Confirms receipt and files".
6. **Supervisor Review** is our own proposal (Langs didn't supply one); label it "Proposed — Langs to confirm". Fields:
   - confirmed types
   - severity (Critical / Less Serious / Unsure)
   - serious behavioural (bool, only if BEHAVIOURAL)
   - health care beyond first aid (bool)
   - lost time (bool)
   - critical injury (bool)
   - corrective actions (title, owner, due date)
   - footage hold requested (bool)
   - notes
7. **Compliance clocks** (Ontario rules, verified; label "Prototype guidance — Langs to confirm"). Created when the Supervisor Review is submitted:
   - `WSIB_FORM7`: if STAFF_INJURY and (health care beyond first aid OR lost time). Due 3 **business** days from review submission. Source: wsib.ca, employers' initial accident-reporting obligations.
   - `MOL_CRITICAL_NOTICE`: if critical injury. Due immediately, i.e. the same timestamp.
   - `CRITICAL_WRITTEN_48H`: if critical injury. Due in 48 hours. Source: ontario.ca, reporting workplace incidents.
   - `JHSC_4DAY`: if STAFF_INJURY and health care beyond first aid and not critical. Due in 4 calendar days.
8. **Footage hold instead of CCTV AI.**
   - We do **not** analyse video: privacy, plus the guardrails.
   - If "might this be on camera?" is yes, create a follow-up action for IT_FACILITIES: "Preserve camera footage — {location}, {date}, {time −30 min to +30 min}".
9. **AI = Google Gemini.**
   - Call it only from server code.
   - Use structured JSON output.
   - Model id comes from env `GEMINI_MODEL` (use a current Gemini Flash model).
   - Fictional data only.
   - Every AI output shown in the UI carries a small "AI-generated — check" label.
10. **Voice = ElevenLabs.** Speech-to-text for intake; optional text-to-speech read-back.
11. **Every TO CONFIRM item** shows a small grey "TO CONFIRM" tag in the UI.
12. **Fictional data only, everywhere.**

## A4. Tech stack (fixed)

- **One Next.js app** (App Router) with TypeScript (strict) and Tailwind CSS. The API is Next.js route handlers under `app/api/`. There is no separate backend server.
- **Database:** TigerData (Postgres with TimescaleDB), accessed via Drizzle ORM (`drizzle-orm` + `postgres` driver). If TigerData isn't reachable, any local Postgres works; Timescale-only features must degrade gracefully.
- **Charts:** Recharts.
- **Gemini:** `@google/genai`.
- **ElevenLabs:** the REST API (speech-to-text endpoint) from a server route; the browser records audio with MediaRecorder and posts it.
- **Package manager:** npm. Node 20+.
- **Env vars** (`.env.local`, never committed; an `.env.example` with these names lives in the repo):
  - `DATABASE_URL`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `ELEVENLABS_API_KEY`
  - `USE_MOCK_AI` (`true` = return canned AI responses so demos work offline)
- **Hosting:** Vultr (Toronto region); domain via GoDaddy.
- **No real auth:** a role switcher stored in a cookie (`role`, `userId`). The server reads it.

## A5. Repo layout and ownership

Only edit files you own. If you need a change in someone else's file, write it in `docs/requests/<owner>.md` and tell the human.

```
langs-safereport/
  app/
    page.tsx                         Neel   (landing + role switcher)
    (staff)/report/...               Mathew
    (staff)/my-reports/...           Mathew
    (review)/supervisor/...          Neel
    (review)/inbox/...               Neel   (specialty acknowledgement inbox)
    (review)/ea/...                  Neel
    (review)/records/[id]/...        Neel   (shared record view)
    (exec)/dashboard/...             Ananya
    api/**                           Connan (except api/intake/** = Mathew, api/trends + api/insights = Connan, consumed by Ananya)
  components/
    ui/                              Neel   (Button, Card, Badge, ToConfirmTag, AiLabel, StatusPill)
    tracker/PathwayTracker.tsx       Neel   (used by everyone)
    form/                            Mathew
    charts/                          Ananya
  lib/
    types.ts                         Connan (SHARED CONTRACT, see A6; change only with team agreement)
    db/schema.ts, db/index.ts        Connan
    workflow/                        Connan (state machine, routing, deriveTypes, clocks)
    ai/gemini.ts                     Connan (client + helpers)
    ai/intake.ts                     Mathew
    api-client.ts                    Connan (typed fetch helpers for every endpoint)
    mock/                            each owner adds fixtures in mock/<name>.ts
  config/
    questions.json                   Mathew (all 35 questions per A2)
    routing.ts                       Connan
  scripts/seed.ts                    Ananya (Connan writes the base users seed first)
  docs/status/<name>.md              each person's progress + handoff notes
  docs/requests/<name>.md            change requests to that person
```

**Git:**
- One repo. Each person works on branch `<name>/<feature>` and opens small pull requests into `main`.
- Pull `main` often, and never force-push `main`.
- Connan creates the repo scaffold first: Next.js, Tailwind, Drizzle, `lib/types.ts`, `lib/api-client.ts` stubs and `.env.example`. **Everyone else:** if the scaffold isn't on `main` yet, start building inside your own folders against the types in A6 and mock data. Don't create a second scaffold.

## A6. Shared contract: `lib/types.ts` (exact)

```ts
export type Role =
  | 'STAFF' | 'SUPERVISOR' | 'PRIVACY_OFFICER' | 'JOHSC_CHAIR'
  | 'IT_FACILITIES' | 'DIRECTOR_OPS' | 'CID_GROUP'
  | 'EXEC_ASSISTANT' | 'EXECUTIVE';

export type Status =
  | 'SUBMITTED' | 'SUPERVISOR_REVIEW' | 'SPECIALTY_REVIEW'
  | 'WITH_EA' | 'CLOSED' | 'REOPENED';

export type IncidentType =
  | 'PRIVACY' | 'STAFF_INJURY' | 'FACILITIES' | 'IT_CYBER' | 'BEHAVIOURAL' | 'CID';

export type AnswerValue = string | string[] | null;
export type Answers = Partial<Record<`q${number}`, AnswerValue>>;

export interface User { id: string; name: string; role: Role; site?: string }

export interface AiAnalysis {
  summaryBullets: string[];                 // 3–6 bullets
  suggestedTypes: IncidentType[];
  discrepancies: { field: string; note: string }[];
  draftReview: Partial<SupervisorReviewInput>;
  generatedAt: string;                      // ISO
  mock: boolean;                            // true if USE_MOCK_AI
}

export interface Incident {
  id: string;                               // "INC-2026-0042"
  cycle: number;                            // 1, then 2 after first reopen…
  status: Status;
  currentOwnerRoles: Role[];                // who must act now
  submittedBy: string;                      // user id
  supervisorId: string;                     // from q35
  answers: Answers;
  transcript?: string;                      // voice narrative, if used
  ai?: AiAnalysis;
  footageHoldRequested: boolean;
  createdAt: string;
  closedAt?: string | null;
}

export interface SupervisorReviewInput {
  confirmedTypes: IncidentType[];
  severity: 'Critical' | 'Less Serious' | 'Unsure';
  seriousBehavioural: boolean;
  healthCareBeyondFirstAid: boolean;
  lostTime: boolean;
  criticalInjury: boolean;
  correctiveActions: { title: string; ownerRole: Role; dueAt: string }[];
  footageHold: boolean;
  notes: string;
}
export interface SupervisorReview extends SupervisorReviewInput {
  incidentId: string; cycle: number; reviewerId: string; submittedAt: string;
}

export interface Acknowledgement {
  id: string; incidentId: string; cycle: number;
  type: IncidentType; role: Role;
  ackedBy: string | null; ackedAt: string | null; comment?: string;
  toConfirm: boolean;
}

export interface FollowUpAction {
  id: string; incidentId: string; title: string; ownerRole: Role;
  dueAt: string; status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  completedAt?: string | null; kind: 'CORRECTIVE' | 'FOOTAGE_HOLD' | 'REOPEN_NOTE';
}

export type ClockKind = 'WSIB_FORM7' | 'MOL_CRITICAL_NOTICE' | 'CRITICAL_WRITTEN_48H' | 'JHSC_4DAY';
export interface ComplianceClock {
  id: string; incidentId: string; kind: ClockKind;
  startedAt: string; dueAt: string; metAt: string | null;
}

export type EventKind =
  | 'SUBMITTED' | 'OPENED' | 'REVIEW_SUBMITTED' | 'ROUTED' | 'ACKNOWLEDGED'
  | 'EA_RECEIVED' | 'CLOSED' | 'REOPENED' | 'NOTE' | 'ACTION_UPDATED' | 'CLOCK_MET';
export interface IncidentEvent {
  time: string; incidentId: string; cycle: number; actorId: string;
  kind: EventKind; fromStatus?: Status; toStatus?: Status; payload?: Record<string, unknown>;
}

export interface IncidentDetail {
  incident: Incident;
  reviews: SupervisorReview[];              // one per cycle
  acknowledgements: Acknowledgement[];      // all cycles
  actions: FollowUpAction[];
  clocks: ComplianceClock[];
  events: IncidentEvent[];                  // oldest first
}

export interface IncidentListItem {
  id: string; status: Status; cycle: number; createdAt: string;
  location: string; types: IncidentType[]; severity: string;
  oneLiner: string; currentOwnerRoles: Role[]; nextClockDueAt?: string | null;
}

export interface IntakeExtractRequest { transcript: string; answers: Answers }
export interface IntakeExtractResponse {
  answers: Answers;                         // merged
  missingRequired: string[];                // visible + required + empty, e.g. ["q10","q35"]
  followUp: { questionId: string; text: string } | null;
}

export interface TrendsResponse {
  totals: { thisMonth: number; lastMonth: number; open: number; awaitingAck: number; avgDaysToClose: number; overdueClocks: number; reopenedRate: number };
  byWeekType: { week: string; type: IncidentType; count: number }[];
  bySite: { site: string; count: number }[];
  heatmap: { dow: number; hour: number; count: number }[];   // dow 0=Sun
  stageDurations: { stage: Status; avgHours: number }[];
}
export interface InsightsResponse {
  bullets: { text: string; incidentIds: string[] }[];
  focus: string; generatedAt: string; mock: boolean;
}
```

## A7. API endpoints (implemented by Connan; typed helpers in `lib/api-client.ts`)

| Method | Path | Body → Response | Who calls |
|---|---|---|---|
| GET | `/api/me` | → `User` | all |
| POST | `/api/me` | `{userId}` → `User` (sets role cookie) | role switcher |
| GET | `/api/users?role=` | → `User[]` | forms |
| POST | `/api/incidents` | `{answers, transcript?, footageHoldRequested}` → `Incident` (runs AI analysis) | Mathew |
| GET | `/api/incidents?scope=mine\|queue\|inbox\|ea\|all&status=&type=&site=` | → `IncidentListItem[]` (scoped by the cookie role) | Neel, Mathew |
| GET | `/api/incidents/:id` | → `IncidentDetail` | Neel, Mathew |
| POST | `/api/incidents/:id/open` | → `IncidentDetail` (SUBMITTED/REOPENED → SUPERVISOR_REVIEW) | Neel |
| POST | `/api/incidents/:id/review` | `SupervisorReviewInput` → `IncidentDetail` | Neel |
| POST | `/api/incidents/:id/ack` | `{ackId, comment?}` → `IncidentDetail` | Neel |
| POST | `/api/incidents/:id/receive` | → `IncidentDetail` (WITH_EA → CLOSED) | Neel |
| POST | `/api/incidents/:id/reopen` | `{reason}` → `IncidentDetail` | Neel |
| PATCH | `/api/actions/:id` | `{status}` → `FollowUpAction` | Neel |
| POST | `/api/intake/extract` | `IntakeExtractRequest` → `IntakeExtractResponse` | Mathew (owns it) |
| POST | `/api/intake/transcribe` | audio (multipart) → `{transcript}` | Mathew (owns it) |
| GET | `/api/trends?from=&to=&site=` | → `TrendsResponse` | Ananya |
| GET | `/api/insights?from=&to=` | → `InsightsResponse` | Ananya |

Errors: an illegal transition → HTTP 409 `{error}`; wrong role → 403 `{error}`; validation → 400 `{error, fields}`.

## A8. Seed users (fictional; the same everywhere)

| id | name | role |
|---|---|---|
| u_staff_1 | Riley Chen | STAFF |
| u_staff_2 | Priya Nair | STAFF |
| u_sup_1 | Jordan Reyes | SUPERVISOR |
| u_sup_2 | Morgan Blake | SUPERVISOR |
| u_priv | Sam Lee | PRIVACY_OFFICER |
| u_johsc_1 | Alex Moreau | JOHSC_CHAIR |
| u_johsc_2 | Taylor Singh | JOHSC_CHAIR |
| u_itf | Casey Brooks | IT_FACILITIES |
| u_dops | Jamie Okafor | DIRECTOR_OPS |
| u_cid | CID Group (sample) | CID_GROUP |
| u_ea | Avery Kim | EXEC_ASSISTANT |
| u_exec | Drew Patel | EXECUTIVE |

q35 options are the SUPERVISOR users plus "Other".

## A9. How to work (instructions for Claude)

- **Read this whole file before writing code.** Then make a short plan and post it to the human before starting.
- **Stay inside the folders you own** (A5). Never rename shared types, statuses or endpoints. If you believe the contract must change, stop and tell the human exactly what and why, so they can agree it with the team.
- **Unfinished dependencies:** when something you depend on isn't merged yet, code against A6/A7 using fixtures in `lib/mock/<yourname>.ts`, behind a flag, so swapping to the real API is a one-line change.
- **Build in order:** get the thinnest working version end to end first, then add depth. Commit after each working step, with clear messages.
- **Every AI call needs a non-AI fallback**, and must work with `USE_MOCK_AI=true`.
- **Keep the UI calm and clinical:**
  - white background,
  - one blue accent,
  - red only for Critical,
  - amber for warnings and overdue,
  - large tap targets on staff screens,
  - all user-facing text in sentence case and plain language.
- **Test** with the three Langs scenarios (A1) before saying you're done. Run `npm run lint` and `npm run build`; both must pass.
- **When you finish a milestone,** update `docs/status/<yourname>.md` with:
  - what works,
  - how to run or test it,
  - what's mocked,
  - what's left,
  - anything other teammates need to know.
- **Don't add features outside your part** without asking. A small, reliable demo beats a broad, broken one.

---

# PART B — MATHEW: STAFF INTAKE (form engine, voice, AI fill)

## B1. Your mission
You build everything a **front-line staff member** touches, from opening the app to getting a reference number, plus their "My reports" list. The goal: a staff member reports an incident in about a minute, by voice or by tapping, and the result is a complete answer set for Langs' existing 35-question form (A2).

This is our answer to the brief's design tension. Staff **talk naturally**, and AI maps their words onto the full form, then asks **only** for required answers that are still missing. So the report is complete, but it doesn't feel like 35 questions.

Remember the guardrail: *do not spend the whole hackathon rebuilding the intake form.* Get a working manual submit early. Voice is the upgrade on top.

## B2. Files you own
- `config/questions.json`
- `components/form/**`
- `app/(staff)/report/**`
- `app/(staff)/my-reports/**`
- `lib/ai/intake.ts`
- `app/api/intake/extract/route.ts`
- `app/api/intake/transcribe/route.ts`
- `lib/mock/mathew.ts`
- `docs/status/mathew.md`

## B3. Step 1: question config + form engine
1. Write `config/questions.json` with all 35 questions from A2, using **exact labels and option text**:

   ```json
   {
     "id": "q15",
     "section": "Description of Incident",
     "label": "Injury/Accident details",
     "help": null,
     "type": "multi",
     "options": ["Burn","Exposure to sharps","Faint/Collapse","Slip/Trip/Fall","Impact (e.g. head injury, crushed finger etc.)","Medication Error","Other"],
     "required": false,
     "showIf": { "q14": "Yes" }
   }
   ```

   - Types: `date | time | short | long | single | multi`.
   - `showIf` maps a question id to the value that must match. For multi-select parents, match if the array includes the value.
   - q35 options = the SUPERVISOR users from A8 + "Other".
2. Export pure helpers from `components/form/logic.ts`:
   - `isVisible(q, answers)`
   - `visibleQuestions(answers)`
   - `missingRequired(answers)`: visible + required + empty
   - `clearHidden(answers)`: when a parent changes, drop answers to questions that are now hidden

   Write small unit tests for these, at minimum that every `showIf` rule in A2 works.
3. Build the `<IncidentForm>` component: grouped by the three sections, renders each type, validates required fields, and shows a completeness bar ("31 of 35 answered").

## B4. Step 2: staff screens (mobile-first, max width ~480px)

| Route | Content |
|---|---|
| `/report` | Big "Report an incident" button; subtitle "Takes about a minute"; two choices: "Tell us what happened" (voice) or "Fill in the form" |
| `/report/describe` | Large hold-to-talk mic button, live recording timer, transcript shown after, "Type instead" textarea, an example prompt ("Say what happened, where, when, who was involved and what you did right away") |
| `/report/check` | Answers grouped by section as tap-to-edit rows; filled-by-AI rows show a small "AI-filled" label; completeness bar |
| `/report/questions` | One missing required question per screen, big tap buttons for single/multi, Back/Next, progress "2 of 4" |
| `/report/extras` | Toggle "Might this be on camera?" (→ `footageHoldRequested`), q34 Critical Incident Debrief, q33 follow-up suggestions |
| `/report/review` | Plain-language summary of the answers, Edit links, Submit |
| `/report/done/[id]` | Check mark, reference number, "Sent to your supervisor, {name}", link to the record |
| `/my-reports` | List of my incidents (`GET /api/incidents?scope=mine`) with a status pill; tapping opens `/records/[id]` (Neel's shared view, which contains the `<PathwayTracker>`) |

- Keep the draft in `localStorage`, wrapped in try/catch, so a refresh doesn't lose a half-finished report.
- Submit = `POST /api/incidents` with `{answers, transcript, footageHoldRequested}`.
- **The manual form path must always work with AI and voice switched off.**

## B5. Step 3: voice + AI fill

**`POST /api/intake/transcribe`**
- Receives the audio blob (webm/ogg from MediaRecorder).
- Sends it to the ElevenLabs speech-to-text API.
- Returns `{transcript}`.
- With `USE_MOCK_AI=true`, returns a canned Scenario 3 transcript.

**`POST /api/intake/extract`** (`IntakeExtractRequest` → `IntakeExtractResponse`), implemented in `lib/ai/intake.ts`:
- Call Gemini with structured JSON output. A JSON schema built from `questions.json` constrains values to valid options.
- Prompt rules (put them in the system instruction):
  - Fill only what the speaker actually said or clearly implied; never invent. Unknown → `null`.
  - Map loose speech to exact option text ("main building" → "Main Site"; "I cut my hand" → q14 "Yes", q15 ["Impact (e.g. head injury, crushed finger etc.)"] or "Other").
  - q32 = a factual, first-person-neutral rewrite of the narrative with **no assumptions or opinions**. This mirrors Langs' own instruction on the form.
  - Don't overwrite answers the user has already set manually (pass them in; only fill nulls).
  - Respect visibility: only fill a child question if its parent makes it visible.
- After the merge, compute `missingRequired` with your `logic.ts` (don't trust the model for this).
- Pick `followUp`: the most important missing required question, phrased conversationally ("Which site were you at?"). Priority order: q1, q2, q5, q13, q14, q16, q18, q9, q11, q35, then the rest.
- Follow-up loop in the UI: show the question with tap answers, merge, repeat. **Cap it at 5 AI follow-ups**; anything still missing is shown on `/report/questions`.
- Mock mode: deterministic keyword rules, so the demo works without the API.

**Optional (only after everything above works):**
- An ElevenLabs text-to-speech "Read it back" button on `/report/review`.
- A voice reply to follow-up questions.

## B6. Demo script lines you'll provide to Ananya
A spoken Scenario 3 narrative that fills at least 15 fields. For example:

> "This is Riley at Main Site, about 2:15 today. I was moving a sealed supply box in the storage room and pinched my hand between the box and the shelf. Priya saw it. I put ice on it and Jordan gave first aid. It's minor, I'm back at work."

## B7. Done when
- [ ] All 35 questions render from JSON; every `showIf` rule works (tests pass)
- [ ] Manual submit creates an incident visible in Neel's supervisor queue
- [ ] Voice → transcript → extract fills at least 15 fields for Scenario 3; the follow-up loop asks only for missing required fields
- [ ] Everything works with `USE_MOCK_AI=true` and with no microphone (typing)
- [ ] Usable at 390px width; lint and build pass; `docs/status/mathew.md` updated

## B8. Talk to
- **Connan:** POST /api/incidents payload; Gemini client helper in `lib/ai/gemini.ts`.
- **Neel:** the `/records/[id]` view and `<PathwayTracker>` you link to.
- **Ananya:** narrative text for seed data and the demo.
