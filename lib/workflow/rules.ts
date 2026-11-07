import type {
  Answers,
  AnswerValue,
  IncidentType,
  Role,
  SupervisorReviewInput,
} from '@/lib/types';

export interface RequiredAckSpec {
  type: IncidentType;
  role: Role;
  toConfirm: boolean;
}

function normalizeList(val: AnswerValue | undefined): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map((v) => String(v).trim()).filter(Boolean);
  }
  return [String(val).trim()].filter(Boolean);
}

function hasAnswerOption(val: AnswerValue | undefined, option: string): boolean {
  const target = option.toLowerCase();
  return normalizeList(val).some((item) => item.toLowerCase() === target);
}

function isYes(val: AnswerValue | undefined): boolean {
  return hasAnswerOption(val, 'yes');
}

/**
 * Pure deterministic rules from A3.3 to suggest incident types from form answers.
 * Safe to import in browser and server code.
 */
export function deriveTypes(answers: Answers): IncidentType[] {
  const types: IncidentType[] = [];

  // PRIVACY: q19 includes "Privacy/Confidentiality"
  if (hasAnswerOption(answers.q19, 'Privacy/Confidentiality')) {
    types.push('PRIVACY');
  }

  // STAFF_INJURY: q14 = Yes AND q9 = "Staff/Volunteer"
  if (isYes(answers.q14) && hasAnswerOption(answers.q9, 'Staff/Volunteer')) {
    types.push('STAFF_INJURY');
  }

  // FACILITIES: q19 includes any of Building Security System Activated, Property Damage, Theft, External Disaster
  const facilitiesOptions = [
    'Building Security System Activated',
    'Property Damage',
    'Theft',
    'External Disaster',
  ];
  if (facilitiesOptions.some((opt) => hasAnswerOption(answers.q19, opt))) {
    types.push('FACILITIES');
  }

  // IT_CYBER: q19 includes "Cybersecurity", or q21 = Code Cyber
  const q21List = normalizeList(answers.q21);
  const isCodeCyber = q21List.some(
    (v) =>
      v.toLowerCase() === 'code cyber' ||
      v.toLowerCase() === 'cybersecurity threat (code cyber)' ||
      v.toLowerCase().includes('code cyber'),
  );
  if (hasAnswerOption(answers.q19, 'Cybersecurity') || isCodeCyber) {
    types.push('IT_CYBER');
  }

  // BEHAVIOURAL: q16 = Yes
  if (isYes(answers.q16)) {
    types.push('BEHAVIOURAL');
  }

  // CID: q34 = Yes
  if (isYes(answers.q34)) {
    types.push('CID');
  }

  return types;
}

/**
 * Pure deterministic routing rules from A3.4.
 * Creates required acknowledgement specs per confirmed type and merges duplicates by role.
 */
export function requiredAcks(
  review: Pick<SupervisorReviewInput, 'confirmedTypes'> & {
    seriousBehavioural?: boolean;
  },
): RequiredAckSpec[] {
  const raw: RequiredAckSpec[] = [];

  for (const type of review.confirmedTypes) {
    switch (type) {
      case 'PRIVACY':
        raw.push({ type: 'PRIVACY', role: 'PRIVACY_OFFICER', toConfirm: false });
        break;
      case 'STAFF_INJURY':
        raw.push({ type: 'STAFF_INJURY', role: 'JOHSC_CHAIR', toConfirm: true });
        break;
      case 'FACILITIES':
        raw.push(
          { type: 'FACILITIES', role: 'IT_FACILITIES', toConfirm: false },
          { type: 'FACILITIES', role: 'DIRECTOR_OPS', toConfirm: false },
        );
        break;
      case 'IT_CYBER':
        raw.push(
          { type: 'IT_CYBER', role: 'IT_FACILITIES', toConfirm: false },
          { type: 'IT_CYBER', role: 'DIRECTOR_OPS', toConfirm: false },
        );
        break;
      case 'BEHAVIOURAL':
        if (review.seriousBehavioural) {
          raw.push({ type: 'BEHAVIOURAL', role: 'DIRECTOR_OPS', toConfirm: true });
        }
        break;
      case 'CID':
        raw.push({ type: 'CID', role: 'CID_GROUP', toConfirm: true });
        break;
    }
  }

  // Merge duplicates by role (preserve first appearance order)
  const byRole = new Map<Role, RequiredAckSpec>();
  for (const spec of raw) {
    const existing = byRole.get(spec.role);
    if (!existing) {
      byRole.set(spec.role, { ...spec });
    } else {
      // If any confirmed type definitely requires this role (toConfirm = false), keep false
      existing.toConfirm = existing.toConfirm && spec.toConfirm;
    }
  }

  return Array.from(byRole.values());
}

/**
 * Extracts display location from form answers (q5 + q6 when Other).
 */
export function extractLocation(answers: Answers): string {
  const q5 = typeof answers.q5 === 'string' ? answers.q5.trim() : '';
  const q6 = typeof answers.q6 === 'string' ? answers.q6.trim() : '';
  if (!q5) return 'Main Site';
  if (q5.toLowerCase().startsWith('other') && q6) {
    return q6;
  }
  return q5;
}

/**
 * Formats the footage hold follow-up action title per A3.8:
 * "Preserve camera footage — {location}, {date}, {time −30 min to +30 min}"
 */
export function formatFootageHoldTitle(answers: Answers): string {
  const location = extractLocation(answers);
  const date =
    typeof answers.q1 === 'string' && answers.q1.trim()
      ? answers.q1.trim()
      : 'incident date';
  const rawTime =
    typeof answers.q2 === 'string' && answers.q2.trim()
      ? answers.q2.trim()
      : 'incident time';

  const windowStr = computeTimeWindow(rawTime);
  return `Preserve camera footage — ${location}, ${date}, ${windowStr}`;
}

function computeTimeWindow(timeStr: string): string {
  // Match patterns like "8:00AM", "3:30 PM", "14:15"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return `${timeStr} −30 min to +30 min`;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes;
  const startMins = (totalMinutes - 30 + 1440) % 1440;
  const endMins = (totalMinutes + 30) % 1440;

  const fmt = (mins: number) => {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
  };

  return `${fmt(startMins)} to ${fmt(endMins)} (${timeStr} −30 min to +30 min)`;
}

