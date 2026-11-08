import type {
  AiAnalysis,
  Answers,
  IncidentType,
  InsightsResponse,
  SupervisorReviewInput,
  User,
} from '@/lib/types';
import { deriveTypes } from '@/lib/workflow/rules';

/**
 * Exact seed users from A8 (fictional; identical across all 4 teammates).
 */
export const SEED_USERS: User[] = [
  { id: 'u_staff_1', name: 'Riley Chen', role: 'STAFF', site: 'Main Site' },
  { id: 'u_staff_2', name: 'Priya Nair', role: 'STAFF', site: 'Grow Community Centre' },
  { id: 'u_sup_1', name: 'Jordan Reyes', role: 'SUPERVISOR', site: 'Main Site' },
  { id: 'u_sup_2', name: 'Morgan Blake', role: 'SUPERVISOR', site: 'North Dumfries' },
  { id: 'u_priv', name: 'Sam Lee', role: 'PRIVACY_OFFICER', site: 'Main Site' },
  { id: 'u_johsc_1', name: 'Alex Moreau', role: 'JOHSC_CHAIR', site: 'Main Site' },
  { id: 'u_johsc_2', name: 'Taylor Singh', role: 'JOHSC_CHAIR', site: 'Bishop St' },
  { id: 'u_itf', name: 'Casey Brooks', role: 'IT_FACILITIES', site: 'Main Site' },
  { id: 'u_dops', name: 'Jamie Okafor', role: 'DIRECTOR_OPS', site: 'Main Site' },
  { id: 'u_cid', name: 'CID Group (sample)', role: 'CID_GROUP', site: 'Main Site' },
  { id: 'u_ea', name: 'Avery Kim', role: 'EXEC_ASSISTANT', site: 'Main Site' },
  { id: 'u_exec', name: 'Drew Patel', role: 'EXECUTIVE', site: 'Main Site' },
];

export function resolveSupervisorId(rawSupervisor: unknown): string {
  if (typeof rawSupervisor !== 'string' || !rawSupervisor.trim()) {
    return 'u_sup_1';
  }
  const trimmed = rawSupervisor.trim();
  const byId = SEED_USERS.find(
    (u) => u.role === 'SUPERVISOR' && u.id.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byId) return byId.id;

  const byName = SEED_USERS.find(
    (u) => u.role === 'SUPERVISOR' && u.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byName) return byName.id;

  return 'u_sup_1';
}

/**
 * Deterministic rule-based discrepancy detector used by both mock AI and fallback mode.
 */
export function detectRuleDiscrepancies(
  answers: Answers,
  transcript?: string,
): { field: string; note: string; impliedType?: IncidentType }[] {
  const narrative = `${typeof answers.q32 === 'string' ? answers.q32 : ''} ${
    typeof answers.q33 === 'string' ? answers.q33 : ''
  } ${transcript ?? ''}`.toLowerCase();

  const discrepancies: { field: string; note: string; impliedType?: IncidentType }[] = [];

  // 1. Injury words in narrative but q14 = No
  const hasInjuryWords =
    /\b(injur\w*|hurt|bleed\w*|cut|sprain\w*|bruis\w*|fractur\w*|burn\w*|needle\s*stick|first\s*aid)\b/i.test(
      narrative,
    );
  const noInjuryWords = /\b(no\s+injur\w*|uninjured|without\s+injur\w*|nearly\s+trips?)\b/i.test(
    narrative,
  );
  if (
    hasInjuryWords &&
    !noInjuryWords &&
    String(answers.q14 ?? '').toLowerCase() === 'no'
  ) {
    discrepancies.push({
      field: 'q14',
      note: 'Narrative mentions a physical injury or first aid, but q14 (Injury/Accident involved?) is marked No.',
      impliedType:
        String(answers.q9 ?? '') === 'Staff/Volunteer' ? 'STAFF_INJURY' : undefined,
    });
  }

  // 2. Police / ambulance / fire mentioned in narrative but q23 = No
  const hasEmergencyServiceWords = /\b(police|officer|911|ambulance|paramedic\w*|fire\s+dept)\b/i.test(
    narrative,
  );
  if (
    hasEmergencyServiceWords &&
    String(answers.q23 ?? '').toLowerCase() === 'no'
  ) {
    discrepancies.push({
      field: 'q23',
      note: 'Narrative references emergency services (police/ambulance/911), but q23 (Were emergency services contacted?) is marked No.',
    });
  }

  // 3. q13 "Less Serious" when an emergency code was called (q20 = Yes)
  if (
    String(answers.q13 ?? '') === 'Less Serious' &&
    String(answers.q20 ?? '').toLowerCase() === 'yes'
  ) {
    discrepancies.push({
      field: 'q13',
      note: 'Severity is marked Less Serious (q13), but an emergency code was activated (q20 = Yes).',
    });
  }

  // 4. Privacy breach described in narrative but q18 = No
  const hasPrivacyWords =
    /\b(email\w*\s+.*wrong|wrong\s+recipient|wrong\s+external\s+email|privacy|confidential\w*|breach|unauthorized\s+disclosure)\b/i.test(
      narrative,
    );
  if (hasPrivacyWords && String(answers.q18 ?? '').toLowerCase() === 'no') {
    discrepancies.push({
      field: 'q18',
      note: 'Narrative describes a privacy or confidentiality disclosure, but q18 (Building/Facility/Confidentiality involved?) is marked No.',
      impliedType: 'PRIVACY',
    });
  }

  // 5. Facility hazard / loose handrail described in narrative when q19 doesn't include a facility option
  const hasFacilityWords =
    /\b(handrail|loose\s+rail\w*|wet\s+floor|hazard|broken\s+door|leak|blocked\s+area|property\s+damage)\b/i.test(
      narrative,
    );
  const derivedNow = deriveTypes(answers);
  if (hasFacilityWords && !derivedNow.includes('FACILITIES')) {
    discrepancies.push({
      field: 'q19',
      note: 'Narrative describes a physical facility hazard (e.g., loose handrail / blocked area); consider confirming FACILITIES routing.',
      impliedType: 'FACILITIES',
    });
  }

  return discrepancies;
}

/**
 * Deterministic mock AI analysis keyed by keywords in the 3 Langs testing scenarios (B6).
 */
export function buildMockAiAnalysis(
  answers: Answers,
  transcript?: string,
  isMock = true,
): AiAnalysis {
  const baseTypes = deriveTypes(answers);
  const discrepanciesWithTypes = detectRuleDiscrepancies(answers, transcript);
  const suggestedTypes = Array.from(
    new Set<IncidentType>([
      ...baseTypes,
      ...discrepanciesWithTypes
        .map((d) => d.impliedType)
        .filter((t): t is IncidentType => Boolean(t)),
    ]),
  );

  const text = `${typeof answers.q32 === 'string' ? answers.q32 : ''} ${
    typeof answers.q33 === 'string' ? answers.q33 : ''
  } ${transcript ?? ''}`.toLowerCase();

  const severityRaw = answers.q13;
  const severity: SupervisorReviewInput['severity'] =
    severityRaw === 'Critical' || severityRaw === 'Less Serious' || severityRaw === 'Unsure'
      ? severityRaw
      : 'Less Serious';

  let summaryBullets: string[];
  let notes = 'Reviewed initial staff report and confirmed routing pathway.';

  if (
    text.includes('email') ||
    text.includes('schedule') ||
    suggestedTypes.includes('PRIVACY')
  ) {
    if (!suggestedTypes.includes('PRIVACY')) suggestedTypes.push('PRIVACY');
    summaryBullets = [
      'A fictional community-program schedule was inadvertently emailed to an unintended external address.',
      'The reporting staff member identified the error immediately, attempted an email recall, and notified their supervisor.',
      'No clinical chart records were attached; Privacy Officer acknowledgement is recommended to verify containment.',
    ];
    notes =
      'Confirmed accidental external email of fictional community program schedule. Recall attempted; routing to Privacy Officer for review and acknowledgement.';
  } else if (
    text.includes('handrail') ||
    text.includes('trip') ||
    suggestedTypes.includes('FACILITIES')
  ) {
    if (!suggestedTypes.includes('FACILITIES')) suggestedTypes.push('FACILITIES');
    summaryBullets = [
      'A visitor nearly tripped on a loose stairwell handrail; no physical injury occurred.',
      'Staff immediately restricted access to the affected area and notified their supervisor.',
      'Requires IT/Facilities and Director of Operations review and acknowledgement for permanent repair.',
    ];
    notes =
      'Near-miss facility hazard (loose handrail). Area cordoned off; routing to IT/Facilities and Director of Operations for repair and acknowledgement.';
  } else if (
    text.includes('supply box') ||
    text.includes('hand') ||
    suggestedTypes.includes('STAFF_INJURY')
  ) {
    if (!suggestedTypes.includes('STAFF_INJURY')) suggestedTypes.push('STAFF_INJURY');
    summaryBullets = [
      'A staff member sustained a minor hand injury while moving a sealed supply box.',
      'First aid was administered on site and the direct supervisor was notified.',
      'Routes to JOHSC Chairs for workplace health and safety review and acknowledgement.',
    ];
    notes =
      'Staff hand injury while moving supply box; first aid provided on site. Routing to JOHSC Chairs for review and acknowledgement.';
  } else {
    const desc =
      typeof answers.q32 === 'string' && answers.q32.trim()
        ? answers.q32.trim()
        : 'Workplace incident reported via Langs Line intake.';
    const location =
      typeof answers.q5 === 'string' && answers.q5.trim()
        ? answers.q5.trim()
        : 'Main Site';
    summaryBullets = [
      `Incident reported at ${location}: ${desc.slice(0, 120)}${desc.length > 120 ? '…' : ''}`,
      `Initial severity assessed by reporting staff as ${severity}.`,
      suggestedTypes.length > 0
        ? `Suggested specialty routing: ${suggestedTypes.join(', ')}.`
        : 'No additional specialty routing detected from initial form responses; remains with Supervisor then Executive Assistant.',
    ];
  }

  return {
    summaryBullets,
    suggestedTypes,
    discrepancies: discrepanciesWithTypes.map(({ field, note }) => ({ field, note })),
    draftReview: {
      confirmedTypes: suggestedTypes,
      severity,
      seriousBehavioural: false,
      healthCareBeyondFirstAid: false,
      lostTime: false,
      criticalInjury: severity === 'Critical',
      correctiveActions: [],
      footageHold: false,
      notes,
    },
    generatedAt: new Date().toISOString(),
    mock: isMock,
  };
}

export const MOCK_INSIGHTS: InsightsResponse = {
  bullets: [
    {
      text: 'Facilities near-misses (loose handrails and entryway slip hazards) cluster on weekday mornings at Main Site and Grow Community Centre.',
      incidentIds: ['INC-2026-0002', 'INC-2026-0005'],
    },
    {
      text: 'Privacy reports most commonly involve misdirected external emails during peak administrative handoff hours; all were escalated within 1 hour.',
      incidentIds: ['INC-2026-0001'],
    },
    {
      text: 'Material-handling staff injuries (lifting/moving supply boxes) account for the majority of JOHSC acknowledgements and WSIB Form 7 compliance clocks.',
      incidentIds: ['INC-2026-0003'],
    },
    {
      text: 'Specialty acknowledgement turnaround averages under 14 hours, with dual-acknowledgement Facilities routes taking longest before reaching the Executive Assistant.',
      incidentIds: ['INC-2026-0002', 'INC-2026-0004'],
    },
  ],
  focus:
    'Prioritize preventive stairwell/entryway checks at Main Site and standardize external email recipient verification before sending program schedules.',
  generatedAt: new Date().toISOString(),
  mock: true,
};

