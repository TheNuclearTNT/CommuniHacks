# Claude prompt for Neel: Review consoles + shared UI
### Langs SafeReport · CommuniHacks · Langs Community Health Centre incident reporting challenge

**Neel, how to use this file:** put it in the root of our shared repo (or anywhere on your machine), open Claude Code in the repo folder, and say:

> Read `Neel.md` fully. You are working for Neel. Follow it exactly: plan first, then build Part B step by step, staying inside Neel's files.

Keep the session going and paste back any questions it raises for the team. When teammates merge to `main`, tell Claude to pull and continue.

---

## Who you are working for, and what you're building

You are Claude, helping **Neel**, one of four teammates building **Langs SafeReport** at a hackathon. Neel owns the shared UI kit and role switcher, the pathway tracker every role sees, the shared record view, the supervisor queue and pre-filled Supervisor Review, the specialty-area acknowledgement inbox, and the Executive Assistant receipt/filing/reopen screens.

Three other Claude sessions are building the other parts in parallel: Mathew (staff intake), Connan (backend), Neel (review consoles), Ananya (dashboard, data, deploy, pitch). **Part A** gives you the full background, plus the exact shared contract that keeps the four parts compatible. **Part B** is Neel's detailed task list and finish criteria.

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

# PART B — NEEL: REVIEW CONSOLES (Supervisor, Specialty, Executive Assistant) + SHARED UI

## B1. Your mission
You build every screen **after** the staff member presses Submit, plus the shared UI kit and the pathway tracker. This is the part Langs cares about most: their sheet says the opportunity is to make "the review, routing, acknowledgement, closure and future follow-up process easier to see and manage."

The goal:
- every role sees only its own work;
- anyone opening a record instantly sees who has it, which acknowledgements are done, whether the EA has received it, and whether it's open, closed or reopened. That is the judges' success check (A1).

## B2. Files you own
- `app/page.tsx` (landing + role switcher)
- `app/(review)/**`
- `components/ui/**`
- `components/tracker/**`
- `lib/mock/neel.ts`
- `docs/status/neel.md`

## B3. Step 1: UI kit + role switcher (first, so everyone can use it)
- `components/ui`:
  - `Button`, `Card`, `Badge`, `StatusPill` (status → label from A3.2 + colour), `TypeChip`, `SeverityDot`
  - `ToConfirmTag` (small grey "TO CONFIRM")
  - `AiLabel` (small "AI-generated — check")
  - `ClockChip` (countdown: grey, then amber under 24h, red when overdue)
  - `EmptyState`
- **Style:**
  - white background, one blue accent, red only for Critical, amber for warnings;
  - generous spacing, readable 15–16px body;
  - must work on tablet width (≥768px) as well as desktop.
- **Landing `/`:**
  - App name, one-line purpose, and a role switcher listing the A8 users grouped by role.
  - Choosing one calls `POST /api/me`, then routes to that role's home:
    - STAFF → `/report`
    - SUPERVISOR → `/supervisor`
    - specialty roles → `/inbox`
    - EXEC_ASSISTANT → `/ea`
    - EXECUTIVE → `/dashboard`
  - A small persistent header on all pages shows the current user and role, with a "Switch role" link.

## B4. Step 2: `<PathwayTracker detail={IncidentDetail} />` (everyone reuses it)
A horizontal stepper (it becomes vertical on narrow screens):

```
Submitted ── Supervisor review ── Specialty acknowledgement ── Executive Assistant ── Filed
```

- Each step shows done / current / waiting / "not required for this incident" (greyed).
- Under the specialty step, list each acknowledgement for the **current cycle**: role display name, then a ✓ with the person and time, or "Waiting". Add a `ToConfirmTag` where `toConfirm`.
- Under the EA step, show the receipt person and time.
- At the top, show the **"Now with:"** current owner roles in bold, plus the status pill. If cycle > 1: "Reopened — cycle 2" and a link to view earlier cycles.
- Below the stepper, a collapsible **timeline** of `events` (time, actor name, readable sentence), grouped by cycle.

This one component covers the success check. Make it clear and good-looking.

## B5. Step 3: shared record view `/records/[id]`
- Used by every role (Mathew links staff here).
- Shows: the tracker; then the report answers grouped by the three sections (hide empty and hidden questions); the transcript (collapsible); the AI summary with `AiLabel`; the Supervisor Review (read-only once submitted); follow-up actions; clocks.
- Role-specific action buttons appear in a sticky action bar:
  - Open/Review for the supervisor
  - Acknowledge for a matching specialty role
  - Confirm receipt and file for the EA
  - Reopen for the supervisor/EA on CLOSED

## B6. Step 4: supervisor console
- **`/supervisor` queue:** `GET /api/incidents?scope=queue`.
  - Table/cards: SeverityDot, ref #, TypeChips, location, date/time, one-liner, StatusPill, ClockChip.
  - Critical rows and any row with a clock due under 24h are pinned in a top "Needs attention" group.
  - Filters: status, type, site. Read initial values from URL params (`/supervisor?site=Main%20Site&type=BEHAVIOURAL`) so Ananya's dashboard can link in.
- **`/supervisor/review/[id]`**, the main screen. Calling it calls `POST /open` if the status is SUBMITTED/REOPENED.
  - **Left column:** the report, by section; transcript; photos (if any).
  - **Right column:**
    - **AI summary** bullets + `AiLabel`.
    - **Discrepancies** as amber callouts, each linking (scrolling) to its field, with a "Dismiss" control (client-side only).
    - **Supervisor Review form** (heading "Supervisor Review — Proposed, Langs to confirm"), pre-filled from `incident.ai.draftReview`. Fields per `SupervisorReviewInput`:
      - Confirmed incident types: checkboxes, pre-ticked from `suggestedTypes`.
      - Severity.
      - "Serious behavioural?" toggle: only when BEHAVIOURAL is ticked; `ToConfirmTag`.
      - Health care beyond first aid / lost time / critical injury toggles, with helper text: "These start legal reporting clocks — Prototype guidance, Langs to confirm."
      - Corrective actions repeater (title, owner role, due date).
      - "Request camera footage hold" toggle (pre-set from `footageHoldRequested`).
      - Notes.
    - **"Will be sent to" live preview:** compute it client-side with `requiredAcks` from `lib/workflow/rules.ts` (Connan's pure helper). If nothing applies: "No specialty review needed — goes to the Executive Assistant." This shows Langs' "changing the type changes the route" demonstration live.
    - **Submit review** → `POST /review` → toast → back to the queue.

## B7. Step 5: specialty inbox `/inbox`
- `GET /api/incidents?scope=inbox`, filtered to the current role.
- Opening a record shows `/records/[id]` with an **Acknowledge** button. Never say "Approve". Add the subtext "Review and acknowledgement — not a formal approval."
- The Acknowledge dialog has an optional comment → `POST /ack` with `ackId`.
- After acknowledging, show the tracker updating (e.g. "1 of 2 acknowledgements done").

## B8. Step 6: Executive Assistant `/ea`
- **Tab "Waiting for receipt":** `scope=ea` (WITH_EA). Each row has **Confirm receipt and file** → `POST /receive`.
- **Tab "Filed records":** `scope=ea&status=CLOSED`, with search by ref #, date range, type and site. This is Langs' "can be located again if needed."
- Each filed record has **Reopen** (supervisor or EA) with a required reason → `POST /reopen`; the tracker then shows cycle 2.

## B9. Step 7 (if time): follow-up actions board
`/supervisor/actions` with columns Not started / In progress / Done (`PATCH /api/actions/:id`). Overdue cards are amber; footage-hold actions are shown with a camera icon.

## B10. Done when
- [ ] Role switcher works for all A8 users; the header shows the current role
- [ ] Tracker shows owner, each acknowledgement, EA receipt and open/closed/reopened for any record (judges' success check)
- [ ] Scenario 1 can be clicked through entirely in the UI by switching roles
- [ ] Scenario 2 waits for **two** acknowledgements before appearing for the EA
- [ ] Changing confirmed types live-updates the "Will be sent to" preview
- [ ] Reopen shows cycle 2 in tracker and timeline; same ref #
- [ ] AI summary, discrepancies, clocks and TO CONFIRM tags display; works with mock AI
- [ ] Usable at tablet width; lint and build pass; `docs/status/neel.md` updated

## B11. Talk to
- **Connan:** endpoints, the routing helper export, error messages.
- **Mathew:** the staff header, the `/records/[id]` link.
- **Ananya:** dashboard click-through to `/supervisor?site=…&type=…`; screenshots for the pitch.
