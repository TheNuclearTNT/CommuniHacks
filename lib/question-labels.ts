import questionsConfig from '@/config/questions.json';
import type { Role, Status } from '@/lib/types';

export interface QuestionConfigItem {
  id: string;
  section: string;
  label: string;
  help: string | null;
  type: string;
  options: string[] | null;
  required: boolean;
  showIf: Record<string, string> | null;
}

const QUESTION_MAP = new Map<string, QuestionConfigItem>(
  (questionsConfig.questions as QuestionConfigItem[]).map((q) => [q.id, q]),
);

export function getQuestionLabel(key: string): string {
  return QUESTION_MAP.get(key)?.label ?? key.toUpperCase();
}

export function getQuestionSection(key: string): string {
  return QUESTION_MAP.get(key)?.section ?? 'other';
}

export function getQuestionMeta(key: string): QuestionConfigItem | undefined {
  return QUESTION_MAP.get(key);
}

export const SECTION_DISPLAY_NAMES: Record<string, string> = {
  'incident details': 'Section 1 · Incident Details',
  'type of incident': 'Section 2 · Type of Incident & Triggers',
  summary: 'Section 3 · Narrative Summary & Follow-up',
  other: 'Additional Information',
};

export const ROLE_LABELS: Record<Role, string> = {
  STAFF: 'Staff Reporter',
  SUPERVISOR: 'Supervisor',
  PRIVACY_OFFICER: 'Privacy Officer',
  JOHSC_CHAIR: 'JOHSC Chair',
  IT_FACILITIES: 'IT / Facilities',
  DIRECTOR_OPS: 'Director of Operations',
  CID_GROUP: 'Critical Incident Debrief Group',
  EXEC_ASSISTANT: 'Executive Assistant',
  EXECUTIVE: 'Executive Leadership',
};

export function getRoleLabel(role: Role | string): string {
  return ROLE_LABELS[role as Role] ?? role;
}

export const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  SUPERVISOR_REVIEW: 'Supervisor review',
  SPECIALTY_REVIEW: 'Specialty acknowledgement',
  WITH_EA: 'With Executive Assistant',
  CLOSED: 'Filed and closed',
  REOPENED: 'Reopened',
};

export function getStatusLabel(status: Status | string): string {
  return STATUS_LABELS[status as Status] ?? status;
}

export const CLOCK_LABELS: Record<string, string> = {
  WSIB_FORM7: '3-day WSIB Form 7 Reporting Clock',
  MOL_CRITICAL_NOTICE: '48-hour Ministry of Labour Critical Injury Notice',
  CRITICAL_WRITTEN_48H: '48-hour Critical Injury Written Report Clock',
  JHSC_4DAY: '4-day JHSC Written Notice Clock',
  INTERNAL_24H: '24-hour Supervisor Review SLA',
  CRITICAL_1H: '1-hour Critical Incident Notification',
};

export function getClockLabel(kind: string): string {
  return CLOCK_LABELS[kind] ?? kind;
}

export const USER_DISPLAY_NAMES: Record<string, string> = {
  'u-maya': 'Maya Chen (Staff — Main Site)',
  'u-jordan': 'Jordan Singh (Staff — Grow)',
  'u-sam': 'Sam Okafor (Staff — Hub)',
  'u-bill': 'Bill Teasdale (Supervisor — Main)',
  'u-nadia': 'Nadia Kowalski (Supervisor — Grow)',
  'u-priya': 'Priya Nair (Privacy Officer)',
  'u-carlos': 'Carlos Mendez (JOHSC Co-Chair)',
  'u-derek': 'Derek Wu (IT & Facilities Lead)',
  'u-helen': 'Helen Park (Director of Operations)',
  'u-cid': 'Dr. Amara Osei (CID Group Lead)',
  'u-claire': 'Claire Beaumont (Executive Assistant)',
  'u-exec': 'sharlene@langs.org (Executive Director)',
};

export function getUserDisplayName(userId?: string | null): string {
  if (!userId) return 'Unassigned';
  return USER_DISPLAY_NAMES[userId] ?? userId;
}

export function formatAnswerValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(', ') : null;
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}
