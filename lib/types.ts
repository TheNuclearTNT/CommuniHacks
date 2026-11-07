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

