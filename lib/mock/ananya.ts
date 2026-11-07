// Ananya's fixtures: a deterministic generator of ~200 fictional incidents with
// planted patterns, plus mock /api/trends and /api/insights built from it.
// Used by the dashboard (mock mode) and by scripts/seed.ts (real DB).
// Everything here is FICTIONAL DEMO DATA. Proportions are made up.

import type {
  Answers,
  ClockKind,
  IncidentType,
  InsightsResponse,
  Role,
  Status,
  SupervisorReviewInput,
  TrendsResponse,
} from '@/lib/types';

export const DEMO_DATA_LABEL = 'Fictional demo data';

// ---------- A2 option lists (exact strings) ----------

export const SITES = [
  '3 Doors Down',
  'Bishop St',
  'Grow Community Centre',
  'Main Site',
  'North Dumfries',
  'Regional Coordination Centre (RCC)',
  'Virtual',
  'Youth and Teen Centre (YTC)',
] as const;

const SERVICE_AREAS = [
  'Admin/Leadership',
  'Administration/Operations',
  'Clinical',
  'Community Services',
  'Diabetes Education Program (DEP)',
  'Facilities/IT',
  'HART Hub',
  'Regional Coordination Centre (RCC)',
  'Social Work',
  "Women's Health",
  'YWHO',
] as const;

// ---------- A8 seed users ----------

export const DEMO_USERS = {
  staff: [
    { id: 'u_staff_1', name: 'Riley Chen' },
    { id: 'u_staff_2', name: 'Priya Nair' },
  ],
  supervisors: [
    { id: 'u_sup_1', name: 'Jordan Reyes' },
    { id: 'u_sup_2', name: 'Morgan Blake' },
  ],
  ea: 'u_ea',
} as const;

export const ROLE_OF_USER: Record<string, Role> = {
  u_staff_1: 'STAFF',
  u_staff_2: 'STAFF',
  u_sup_1: 'SUPERVISOR',
  u_sup_2: 'SUPERVISOR',
  u_priv: 'PRIVACY_OFFICER',
  u_johsc_1: 'JOHSC_CHAIR',
  u_johsc_2: 'JOHSC_CHAIR',
  u_itf: 'IT_FACILITIES',
  u_dops: 'DIRECTOR_OPS',
  u_cid: 'CID_GROUP',
  u_ea: 'EXEC_ASSISTANT',
  u_exec: 'EXECUTIVE',
};

// q35 holds the supervisor. TO CONFIRM with Mathew whether the stored value is
// the user's name or id; change this one function if it is the id.
const q35Value = (sup: { id: string; name: string }) => sup.name;

// ---------- plan types ----------

export type Pattern = 'FRI_VERBAL' | 'GROW_FALLS' | 'PRIVACY_EMAIL' | null;

export interface PlanAck {
  role: Role;
  userId: string;
  at: string | null; // null = still pending
}

export interface PlanCycle {
  cycle: number;
  startedAt: string; // submitted (cycle 1) or reopened (cycle 2+)
  openedAt: string | null;
  reviewedAt: string | null;
  review: SupervisorReviewInput | null;
  acks: PlanAck[];
  eaReceivedAt: string | null;
  actionsDoneAt: string | null; // when the seed marks corrective actions DONE
}

export interface PlanClock {
  kind: ClockKind;
  startedAt: string;
  dueAt: string;
  metAt: string | null;
}

export interface DemoPlan {
  id: string; // mock id, e.g. INC-2026-0042 (the real server assigns its own)
  pattern: Pattern;
  types: IncidentType[];
  site: string;
  submittedBy: string;
  supervisorId: string;
  answers: Answers;
  footageHoldRequested: boolean;
  incidentAt: string; // when it happened (q1 + q2)
  createdAt: string; // when it was submitted
  status: Status;
  cycle: number;
  cycles: PlanCycle[];
  reopen: { at: string; reason: string } | null;
  clocks: PlanClock[];
}

// ---------- small helpers ----------

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    // mulberry32
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [v, w] of items) {
      r -= w;
      if (r <= 0) return v;
    }
    return items[items.length - 1][0];
  }
}

const iso = (ms: number) => new Date(ms).toISOString();

function addBusinessDays(ms: number, n: number): number {
  const d = new Date(ms);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) added++;
  }
  return d.getTime();
}

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(d: Date): string {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(d.getMinutes())}${h < 12 ? 'AM' : 'PM'}`;
}

/** Parses q1 ("2026-10-30") + q2 ("2:15PM") into day-of-week (0=Sun) and hour. */
export function parseIncidentTime(answers: Answers): { dow: number; hour: number } | null {
  const date = typeof answers.q1 === 'string' ? answers.q1 : null;
  const time = typeof answers.q2 === 'string' ? answers.q2 : null;
  if (!date || !time) return null;
  const [y, m, d] = date.split('-').map(Number);
  const t = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(time.trim());
  if (!y || !m || !d || !t) return null;
  let hour = Number(t[1]) % 12;
  if (t[3].toUpperCase() === 'PM') hour += 12;
  return { dow: new Date(y, m - 1, d).getDay(), hour };
}

const fictionalPhone = (rng: Rng) => `519-555-01${pad(rng.int(0, 99))}`;
const participantId = (rng: Rng) => `Participant ID P-${rng.int(1000, 9999)} (fictional)`;

// ---------- answers + narratives (q32) ----------

interface Spec {
  type: IncidentType;
  pattern: Pattern;
  week: number; // 0 = oldest of the 12 weeks
  dow: number | null; // forced day of week
  hours: readonly number[] | null; // forced hour choices
  site: string | null;
}

interface Built {
  answers: Answers;
  types: IncidentType[];
  seriousBehavioural: boolean;
  healthCare: boolean;
  lostTime: boolean;
  footage: boolean;
}

const NO_EMERGENCY: Answers = {
  q20: 'No',
  q22: 'No',
  q23: 'No',
  q24: '',
  q28: 'No',
  q30: 'No',
};

function baseAnswers(rng: Rng, at: Date, site: string, reporter: { name: string }, sup: { id: string; name: string }): Answers {
  return {
    q1: formatDate(at),
    q2: formatTime(at),
    q3: reporter.name,
    q4: rng.chance(0.4) ? 'One co-worker present (fictional).' : '',
    q5: site,
    q7: rng.pick(SERVICE_AREAS),
    q10: fictionalPhone(rng),
    q12: rng.weighted([['No', 6], ['Unknown', 2], ['Yes', 2]] as const),
    q13: 'Less Serious',
    q14: 'No',
    q16: 'No',
    q18: 'No',
    q34: 'No',
    q35: q35Value(sup),
    ...NO_EMERGENCY,
  };
}

const fill = (tpl: string, vars: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');

const BEHAVIOURAL_STORIES: Record<string, readonly string[]> = {
  'Verbal Aggression': [
    'A participant waiting at reception became upset about a delayed appointment and raised their voice at front-desk staff, using insulting language. Staff stayed calm, offered a quiet space and a new time. The participant left after about {mins} minutes.',
    'During a drop-in session a participant shouted at a staff member after being told the program was full for the day. Staff used de-escalation and a second staff member joined. No physical contact.',
    'A visitor in the waiting area swore at staff and other clients after a phone call. Staff asked the visitor to lower their voice; the visitor left the building on their own.',
  ],
  Harassment: [
    'A participant made repeated unwanted comments about a staff member’s appearance over several visits. Today the comments continued after the staff member asked them to stop.',
  ],
  'Complaints/Grievances': [
    'A participant made a verbal complaint about wait times and how they were spoken to at intake. Staff listened, documented the concern and offered the complaint process.',
  ],
  'Total Non-Compliance': [
    'A participant refused to follow the building’s scent-free and food policies in the group room after several reminders. The group facilitator paused the session.',
  ],
  Mischief: [
    'Program materials in the group room were deliberately damaged during a drop-in session. No one was hurt.',
  ],
  'Behavioural Incident Trend (Youth Programming Only)': [
    'Ongoing pattern of disruptive behaviour by a youth participant during evening programming; tonight the participant threw a ball at the wall near other youth.',
  ],
  Discrimination: [
    'A participant made a discriminatory remark to another participant during a group program. The facilitator addressed it and separated the two participants.',
  ],
};

function buildBehavioural(rng: Rng, a: Answers, detail: string): Built {
  const story = fill(rng.pick(BEHAVIOURAL_STORIES[detail]), { mins: String(rng.int(5, 20)) });
  const youth = detail.startsWith('Behavioural Incident Trend');
  return {
    answers: {
      ...a,
      q7: youth ? 'YWHO' : a.q7,
      q9: youth ? 'Patient/Participant 18 years of age or younger' : 'Patient/Participant over 18 years of age',
      q11: participantId(rng),
      q13: rng.chance(0.15) ? 'Unsure' : 'Less Serious',
      q16: 'Yes',
      q17: [detail],
      q31: ['Descalation', ...(rng.chance(0.5) ? ['Supervisory Support'] : [])],
      q32: story,
      q33: 'Supervisor to check in with the staff involved. Consider a behaviour support plan if it happens again.',
    },
    types: ['BEHAVIOURAL'],
    seriousBehavioural: false,
    healthCare: false,
    lostTime: false,
    footage: false,
  };
}

const INJURY_STORIES: Record<string, readonly string[]> = {
  'Slip/Trip/Fall': [
    'Staff member slipped on a wet patch near the {spot} and fell onto their side. They got up on their own. Mild bruising to the hip; ice pack and first aid given.',
    'Staff member tripped on the edge of a floor mat at the {spot} while carrying program supplies. Twisted ankle; first aid given and the mat was moved.',
    'Staff member lost footing on the {spot} after rain was tracked in. Scraped hand and sore knee; first aid given.',
  ],
  'Impact (e.g. head injury, crushed finger etc.)': [
    'Staff member pinched their hand between a sealed supply box and a shelf while moving boxes in the storage room. Minor cut and swelling; first aid given.',
    'Staff member bumped their head on an open cupboard door in the staff kitchen. No loss of consciousness; ice applied.',
  ],
  'Exposure to sharps': [
    'Staff member was scratched by a used needle that had been left in a general waste bin. Wound washed immediately; first aid given and the sharps protocol started.',
  ],
  Burn: ['Staff member burned two fingers on the kettle in the program kitchen. Cool water applied; first aid given.'],
};

function buildInjury(rng: Rng, a: Answers, detail: string, reporterName: string): Built {
  const spot = rng.pick(['front entrance', 'main hallway', 'gym floor', 'side door', 'stairwell']);
  const healthCare = rng.chance(0.2);
  return {
    answers: {
      ...a,
      q9: 'Staff/Volunteer',
      q11: reporterName,
      q14: 'Yes',
      q15: [detail],
      q31: ['First Aid'],
      q32: fill(rng.pick(INJURY_STORIES[detail]), { spot }),
      q33: detail === 'Slip/Trip/Fall' ? 'Check floor surfaces and mats; add wet-floor signs at the entrance on rainy days.' : 'Review safe lifting and storage layout.',
    },
    types: ['STAFF_INJURY'],
    seriousBehavioural: false,
    healthCare,
    lostTime: healthCare && rng.chance(0.4),
    footage: false,
  };
}

const PRIVACY_EMAIL_STORIES = [
  'Staff member emailed a fictional {doc} to the wrong external email address because of autocomplete. They noticed within minutes, told their supervisor and attempted to recall the message.',
  'A {doc} was emailed to a similarly named external contact instead of the internal distribution list. Staff noticed when the recipient replied, informed their supervisor and asked the recipient to delete it.',
  'Staff member replied-all on a thread that included an outside agency, sharing a {doc}. They notified their supervisor right away and attempted a recall.',
] as const;

const PRIVACY_OTHER_STORIES = [
  'Printed intake paperwork was left on the shared printer for about an hour before a staff member collected it.',
  'A conversation about a participant’s appointment could be overheard in the waiting area.',
  'A fax with an appointment list was sent to the wrong number. The receiving office confirmed it was destroyed.',
  'A staff laptop was left unlocked in a shared office for a short time.',
] as const;

function buildPrivacy(rng: Rng, a: Answers, email: boolean): Built {
  const doc = rng.pick(['community-program schedule', 'group session sign-up list', 'appointment reminder list', 'referral summary']);
  return {
    answers: {
      ...a,
      q9: 'Non Applicable',
      q10: 'Not applicable',
      q11: 'Not applicable',
      q18: 'Yes',
      q19: ['Privacy/Confidentiality'],
      q31: ['Supervisory Support'],
      q32: email ? fill(rng.pick(PRIVACY_EMAIL_STORIES), { doc }) : rng.pick(PRIVACY_OTHER_STORIES),
      q33: email ? 'Turn off email autocomplete for external addresses; reminder to check recipients before sending.' : 'Reminder about clean-desk and printer pickup practices.',
    },
    types: ['PRIVACY'],
    seriousBehavioural: false,
    healthCare: false,
    lostTime: false,
    footage: false,
  };
}

const FACILITY_STORIES: readonly (readonly [string, string, boolean])[] = [
  ['Property Damage', 'A handrail on the {spot} came loose. A visitor nearly tripped but was not hurt. Staff blocked off the area and informed their supervisor.', true],
  ['Property Damage', 'A ceiling tile in the {spot} is water-stained and sagging after heavy rain. Area roped off.', false],
  ['Property Damage', 'The automatic door at the {spot} is sticking half-open. Staff posted a sign and used the side entrance.', true],
  ['Theft', 'A program tablet went missing from the {spot} between the morning and afternoon sessions.', true],
  ['Building Security System Activated', 'The building alarm went off after hours when the {spot} door did not latch. Monitoring company called the on-call staff member.', true],
  ['External Disaster', 'A power outage in the neighbourhood closed the {spot} early; programs were cancelled for the afternoon.', false],
];

function buildFacilities(rng: Rng, a: Answers): Built {
  const [detail, story, cam] = rng.weighted(FACILITY_STORIES.map((s, i) => [s, i < 3 ? 3 : 1] as const));
  const spot = rng.pick(['front entrance', 'back stairwell', 'main hallway', 'group room', 'parking lot side']);
  return {
    answers: {
      ...a,
      q7: rng.chance(0.5) ? 'Facilities/IT' : a.q7,
      q9: rng.chance(0.5) ? 'Visitor' : 'Non Applicable',
      q10: 'Not applicable',
      q11: 'Not applicable',
      q18: 'Yes',
      q19: [detail],
      q31: ['Other'],
      q32: fill(story, { spot }),
      q33: 'IT/Facilities to assess and repair. Check similar fixtures at other sites.',
    },
    types: ['FACILITIES'],
    seriousBehavioural: false,
    healthCare: false,
    lostTime: false,
    footage: cam && rng.chance(0.6),
  };
}

const CYBER_STORIES = [
  'Staff member received a convincing phishing email asking them to "re-confirm" their login and clicked the link before noticing. They did not enter a password and reported it right away.',
  'Several staff received a text message pretending to be from IT asking for a sign-in code. One staff member replied before realising.',
  'A shared workstation showed an unexpected pop-up asking to install software. Staff unplugged the network cable and called IT.',
  'Unusual login alerts were received for a shared program account. IT reset the password.',
] as const;

function buildCyber(rng: Rng, a: Answers): Built {
  const codeCyber = rng.chance(0.15);
  return {
    answers: {
      ...a,
      q9: 'Staff/Volunteer',
      q11: 'Not applicable',
      q18: 'Yes',
      q19: ['Cybersecurity'],
      ...(codeCyber ? { q20: 'Yes', q21: 'Cybersecurity Threat (Code Cyber)' } : {}),
      q31: ['Other'],
      q32: rng.pick(CYBER_STORIES),
      q33: 'IT to check the account and send a phishing reminder to all staff.',
    },
    types: ['IT_CYBER'],
    seriousBehavioural: false,
    healthCare: false,
    lostTime: false,
    footage: false,
  };
}

function buildCid(rng: Rng, a: Answers): Built {
  return {
    answers: {
      ...a,
      q9: 'Patient/Participant over 18 years of age',
      q11: participantId(rng),
      q13: 'Critical',
      q16: 'Yes',
      q17: ['Workplace Violence', 'Verbal Aggression'],
      q20: 'Yes',
      q21: 'Assistance Required (escalated situation) (Code White)',
      q22: rng.chance(0.6) ? 'Yes' : 'No',
      q23: 'Yes',
      q25: 'Police',
      q26: `Badge #F-${rng.int(1000, 9999)} (fictional)`,
      q27: `FICT-26-${rng.int(10000, 99999)}`,
      q31: ['Descalation', 'Security Guard Support', 'Ask to Leave Premises'],
      q32: 'A participant became escalated in the waiting area, threw a chair and threatened staff. Code White was called; staff moved other clients to a safe room and police attended. No injuries.',
      q33: 'Critical Incident Debrief for the staff involved. Review the safety plan for this participant.',
      q34: 'Yes',
    },
    types: ['BEHAVIOURAL', 'CID'],
    seriousBehavioural: true,
    healthCare: false,
    lostTime: false,
    footage: true,
  };
}

// ---------- routing (mirrors A3.4; the real rules live in Connan's lib/workflow) ----------

export function ackRolesFor(types: IncidentType[], seriousBehavioural: boolean): Role[] {
  const roles = new Set<Role>();
  for (const t of types) {
    if (t === 'PRIVACY') roles.add('PRIVACY_OFFICER');
    if (t === 'STAFF_INJURY') roles.add('JOHSC_CHAIR');
    if (t === 'FACILITIES' || t === 'IT_CYBER') {
      roles.add('IT_FACILITIES');
      roles.add('DIRECTOR_OPS');
    }
    if (t === 'BEHAVIOURAL' && seriousBehavioural) roles.add('DIRECTOR_OPS');
    if (t === 'CID') roles.add('CID_GROUP');
  }
  return [...roles];
}

function ackUser(rng: Rng, role: Role): string {
  switch (role) {
    case 'PRIVACY_OFFICER':
      return 'u_priv';
    case 'JOHSC_CHAIR':
      return rng.pick(['u_johsc_1', 'u_johsc_2']);
    case 'IT_FACILITIES':
      return 'u_itf';
    case 'DIRECTOR_OPS':
      return 'u_dops';
    case 'CID_GROUP':
      return 'u_cid';
    default:
      return 'u_dops';
  }
}

const ACTION_FOR: Record<IncidentType, { title: string; ownerRole: Role }> = {
  PRIVACY: { title: 'Send a check-the-recipient reminder to the team', ownerRole: 'PRIVACY_OFFICER' },
  STAFF_INJURY: { title: 'Check the area and fix the hazard', ownerRole: 'SUPERVISOR' },
  FACILITIES: { title: 'Repair or replace the damaged fixture', ownerRole: 'IT_FACILITIES' },
  IT_CYBER: { title: 'Reset affected accounts and send a phishing reminder', ownerRole: 'IT_FACILITIES' },
  BEHAVIOURAL: { title: 'Check in with the staff involved', ownerRole: 'SUPERVISOR' },
  CID: { title: 'Book the Critical Incident Debrief', ownerRole: 'CID_GROUP' },
};

// ---------- timeline ----------

type Target = 'SUBMITTED' | 'SUPERVISOR_REVIEW' | 'SPECIALTY_REVIEW' | 'WITH_EA' | 'CLOSED';

function buildCycle(
  rng: Rng,
  cycle: number,
  start: number,
  target: Target,
  roles: Role[],
  review: SupervisorReviewInput,
  limit: number,
): PlanCycle {
  // Planted pattern 4: specialty acknowledgement is by far the slowest stage.
  const tOpen = rng.range(1, 16) * HOUR;
  const tReview = rng.range(6, 44) * HOUR;
  const ackOffsets = roles.map((r) => (rng.range(30, 150) + (r === 'DIRECTOR_OPS' ? 20 : 0)) * HOUR);
  const tEa = rng.range(4, 36) * HOUR;

  let open = tOpen;
  let rev = open + tReview;
  let acks = ackOffsets.map((o) => rev + o);
  const lastAck = acks.length ? Math.max(...acks) : rev;
  let ea = lastAck + tEa;

  // In SPECIALTY_REVIEW, all but the slowest acknowledgement are done.
  const slowestIdx = acks.length ? acks.indexOf(Math.max(...acks)) : -1;
  const doneIdx = (i: number) => target !== 'SPECIALTY_REVIEW' || (acks.length > 1 && i !== slowestIdx);

  const requiredEnd: Record<Target, number> = {
    SUBMITTED: 0,
    SUPERVISOR_REVIEW: open,
    SPECIALTY_REVIEW: Math.max(rev, ...acks.filter((_, i) => doneIdx(i))),
    WITH_EA: lastAck,
    CLOSED: ea,
  };
  const end = requiredEnd[target];
  if (end > 0 && start + end > limit) {
    const k = (limit - start) / end;
    open *= k;
    rev *= k;
    acks = acks.map((x) => x * k);
    ea *= k;
  }

  const reached = (s: Target) => {
    const order: Target[] = ['SUBMITTED', 'SUPERVISOR_REVIEW', 'SPECIALTY_REVIEW', 'WITH_EA', 'CLOSED'];
    return order.indexOf(target) >= order.indexOf(s);
  };
  const reviewed = reached('SPECIALTY_REVIEW');

  return {
    cycle,
    startedAt: iso(start),
    openedAt: reached('SUPERVISOR_REVIEW') ? iso(start + open) : null,
    reviewedAt: reviewed ? iso(start + rev) : null,
    review: reviewed ? review : null,
    acks: reviewed
      ? roles.map((role, i) => ({ role, userId: ackUser(rng, role), at: doneIdx(i) ? iso(start + acks[i]) : null }))
      : [],
    eaReceivedAt: target === 'CLOSED' ? iso(start + ea) : null,
    actionsDoneAt: target === 'CLOSED' && rng.chance(0.85) ? iso(start + Math.min(ea, rev + 10 * DAY)) : null,
  };
}

// ---------- the generator ----------

export const DEMO_SEED = 20261107;
const WEEKS = 12;

function buildSpecs(rng: Rng): Spec[] {
  const specs: Spec[] = [];
  // Planted records are spread evenly over their weeks so the trend reads cleanly;
  // background records land in random weeks.
  const add = (n: number, s: Omit<Spec, 'week'>, wMin = 0, wMax = WEEKS - 1) => {
    const span = wMax - wMin + 1;
    for (let i = 0; i < n; i++) specs.push({ ...s, week: s.pattern ? wMin + (i % span) : rng.int(wMin, wMax) });
  };
  const FRI_AFTERNOON = [13, 14, 15, 16] as const;

  // Pattern 1: Verbal Aggression at Main Site, Friday 1–5pm, doubled in the last 4 weeks.
  add(16, { type: 'BEHAVIOURAL', pattern: 'FRI_VERBAL', dow: 5, hours: FRI_AFTERNOON, site: 'Main Site' }, 0, 7);
  add(16, { type: 'BEHAVIOURAL', pattern: 'FRI_VERBAL', dow: 5, hours: FRI_AFTERNOON, site: 'Main Site' }, 8, 11);
  add(38, { type: 'BEHAVIOURAL', pattern: null, dow: null, hours: null, site: null });
  // Pattern 2: Slip/Trip/Fall at Grow Community Centre rose sharply in the last 3 weeks.
  add(3, { type: 'STAFF_INJURY', pattern: 'GROW_FALLS', dow: null, hours: null, site: 'Grow Community Centre' }, 0, 8);
  add(9, { type: 'STAFF_INJURY', pattern: 'GROW_FALLS', dow: null, hours: null, site: 'Grow Community Centre' }, 9, 11);
  add(18, { type: 'STAFF_INJURY', pattern: null, dow: null, hours: null, site: null });
  // Pattern 3: most privacy incidents are emails to the wrong recipient.
  add(22, { type: 'PRIVACY', pattern: 'PRIVACY_EMAIL', dow: null, hours: null, site: null });
  add(8, { type: 'PRIVACY', pattern: null, dow: null, hours: null, site: null });
  add(40, { type: 'FACILITIES', pattern: null, dow: null, hours: null, site: null });
  add(20, { type: 'IT_CYBER', pattern: null, dow: null, hours: null, site: null });
  add(10, { type: 'CID', pattern: null, dow: null, hours: null, site: null });
  return specs; // 200
}

const SITE_WEIGHTS = [
  ['Main Site', 9],
  ['Bishop St', 4],
  ['Grow Community Centre', 4],
  ['Youth and Teen Centre (YTC)', 4],
  ['3 Doors Down', 3],
  ['North Dumfries', 3],
  ['Regional Coordination Centre (RCC)', 2],
  ['Virtual', 1],
] as const;

const DOW_WEIGHTS = [[0, 0.3], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 0.4]] as const;
const HOUR_WEIGHTS = [[8, 2], [9, 4], [10, 6], [11, 6], [12, 4], [13, 5], [14, 5], [15, 4], [16, 3], [17, 2], [18, 1], [19, 1]] as const;

function incidentDate(rng: Rng, spec: Spec, windowStart: number, limit: number): Date {
  for (let w = spec.week; w >= 0; w--) {
    const weekStart = new Date(windowStart + w * 7 * DAY);
    weekStart.setHours(0, 0, 0, 0);
    const dow = spec.dow ?? rng.weighted(DOW_WEIGHTS);
    const offset = (dow - weekStart.getDay() + 7) % 7;
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    const hour = spec.hours ? rng.pick(spec.hours) : rng.weighted(HOUR_WEIGHTS);
    d.setHours(hour, rng.int(0, 11) * 5, 0, 0);
    if (d.getTime() < limit - 6 * HOUR) return d;
  }
  return new Date(windowStart + 6 * HOUR);
}

function siteFor(rng: Rng, spec: Spec): string {
  if (spec.site) return spec.site;
  if (spec.type === 'IT_CYBER' && rng.chance(0.3)) return 'Virtual';
  let s: string = rng.weighted(SITE_WEIGHTS);
  // keep "Virtual" for cyber/privacy only
  while (s === 'Virtual' && spec.type !== 'IT_CYBER' && spec.type !== 'PRIVACY') s = rng.weighted(SITE_WEIGHTS);
  return s;
}

function buildAnswers(rng: Rng, spec: Spec, at: Date, site: string, reporter: { name: string }, sup: { id: string; name: string }): Built {
  const a = baseAnswers(rng, at, site, reporter, sup);
  switch (spec.type) {
    case 'BEHAVIOURAL': {
      const detail =
        spec.pattern === 'FRI_VERBAL'
          ? 'Verbal Aggression'
          : site === 'Youth and Teen Centre (YTC)' && rng.chance(0.5)
            ? 'Behavioural Incident Trend (Youth Programming Only)'
            : rng.weighted([
                ['Verbal Aggression', 2],
                ['Complaints/Grievances', 4],
                ['Total Non-Compliance', 3],
                ['Harassment', 2],
                ['Mischief', 2],
                ['Discrimination', 1],
              ] as const);
      return buildBehavioural(rng, a, detail);
    }
    case 'STAFF_INJURY': {
      const detail =
        spec.pattern === 'GROW_FALLS'
          ? 'Slip/Trip/Fall'
          : rng.weighted([
              ['Slip/Trip/Fall', 2],
              ['Impact (e.g. head injury, crushed finger etc.)', 4],
              ['Exposure to sharps', 2],
              ['Burn', 1],
            ] as const);
      return buildInjury(rng, a, detail, reporter.name);
    }
    case 'PRIVACY':
      return buildPrivacy(rng, a, spec.pattern === 'PRIVACY_EMAIL');
    case 'FACILITIES':
      return buildFacilities(rng, a);
    case 'IT_CYBER':
      return buildCyber(rng, a);
    case 'CID':
      return buildCid(rng, a);
  }
}

const REOPEN_REASONS = [
  'Same hazard reported again; re-checking the repair.',
  'New information from the staff member involved.',
  'Follow-up note: corrective action needs a second step.',
  'Participant returned; safety plan needs review.',
] as const;

/**
 * Generates the full demo dataset. Deterministic for a given (seed, now).
 * `now` should be rounded (e.g. to the hour) so mock data stays stable.
 */
export function generateDemoPlans(nowMs: number = Date.now(), seed: number = DEMO_SEED): DemoPlan[] {
  const rng = new Rng(seed);
  const limit = nowMs - 30 * 60_000;
  const windowStart = nowMs - WEEKS * 7 * DAY;

  const drafts = buildSpecs(rng).map((spec) => {
    const at = incidentDate(rng, spec, windowStart, limit);
    const site = siteFor(rng, spec);
    const reporter = rng.pick(DEMO_USERS.staff);
    const sup = DEMO_USERS.supervisors[['Main Site', 'Bishop St', 'Virtual', 'Regional Coordination Centre (RCC)'].includes(site) ? 0 : 1];
    const built = buildAnswers(rng, spec, at, site, reporter, sup);
    // Reported 5–50 minutes after it happened, so submission-time charts show the same pattern.
    const createdAt = Math.min(at.getTime() + rng.range(5, 50) * 60_000, limit - HOUR);
    return { spec, at, site, reporter, sup, built, createdAt };
  });

  drafts.sort((x, y) => y.createdAt - x.createdAt); // newest first

  // ----- status assignment -----
  const targets = new Map<(typeof drafts)[number], Target>();
  const forcedOverdue = new Set<(typeof drafts)[number]>();
  const rolesOf = (d: (typeof drafts)[number]) => ackRolesFor(d.built.types, d.built.seriousBehavioural);

  // 3 staff injuries with an overdue WSIB/JHSC clock, still waiting on JOHSC.
  for (const d of drafts) {
    if (forcedOverdue.size >= 3) break;
    const age = nowMs - d.createdAt;
    if (d.spec.type === 'STAFF_INJURY' && age > 7 * DAY && age < 24 * DAY) {
      forcedOverdue.add(d);
      // WSIB Form 7 clock only (no JHSC clock), so 3 overdue clocks in total
      d.built.lostTime = true;
      d.built.healthCare = false;
      targets.set(d, 'SPECIALTY_REVIEW');
    }
  }

  const quota: Record<Exclude<Target, 'CLOSED'>, number> = { SUBMITTED: 7, SUPERVISOR_REVIEW: 12, SPECIALTY_REVIEW: 19, WITH_EA: 8 };
  for (const [i, d] of drafts.entries()) {
    if (targets.has(d)) continue;
    let t: Target = 'CLOSED';
    if (quota.SUBMITTED > 0) t = 'SUBMITTED';
    else if (quota.SUPERVISOR_REVIEW > 0) t = 'SUPERVISOR_REVIEW';
    else if (i < 110 && quota.SPECIALTY_REVIEW > 0 && rolesOf(d).length > 0 && rng.chance(0.5)) t = 'SPECIALTY_REVIEW';
    else if (i < 80 && quota.WITH_EA > 0 && rng.chance(0.3)) t = 'WITH_EA';
    if (t !== 'CLOSED') quota[t]--;
    targets.set(d, t);
  }

  // 8 older closed records get reopened: 4 still REOPENED, 4 reopened and refiled.
  const reopenPick = drafts.filter((d) => targets.get(d) === 'CLOSED' && nowMs - d.createdAt > 35 * DAY && nowMs - d.createdAt < 75 * DAY);
  const reopenSet = new Map<(typeof drafts)[number], 'REOPENED' | 'REFILED'>();
  for (let i = 0; i < reopenPick.length && reopenSet.size < 8; i += 3) {
    reopenSet.set(reopenPick[i], reopenSet.size < 4 ? 'REOPENED' : 'REFILED');
  }

  // ----- build plans -----
  const plans: DemoPlan[] = drafts.map((d) => {
    const target = targets.get(d) ?? 'CLOSED';
    const roles = rolesOf(d);
    const primary = d.built.types[d.built.types.length - 1];
    const severity = d.built.answers.q13 as SupervisorReviewInput['severity'];
    const reviewInput = (cycle: number): SupervisorReviewInput => ({
      confirmedTypes: d.built.types,
      severity,
      seriousBehavioural: d.built.seriousBehavioural,
      healthCareBeyondFirstAid: d.built.healthCare,
      lostTime: d.built.lostTime,
      criticalInjury: false,
      correctiveActions: [{ ...ACTION_FOR[primary], dueAt: iso(d.createdAt + (cycle === 1 ? 16 : 40) * DAY) }],
      footageHold: d.built.footage,
      notes: cycle === 1 ? 'Reviewed with the staff member. Fictional demo record.' : 'Reopened for follow-up. Fictional demo record.',
    });

    const reopenKind = reopenSet.get(d);
    const cycles: PlanCycle[] = [];
    // Leave room for the reopen if this record will be reopened.
    const c1Limit = reopenKind ? Math.min(limit, nowMs - 8 * DAY) : limit;
    const c1 = buildCycle(rng, 1, d.createdAt, target, roles, reviewInput(1), c1Limit);
    cycles.push(c1);

    let reopen: DemoPlan['reopen'] = null;
    let status: Status = target;
    if (reopenKind && c1.eaReceivedAt) {
      const closed = Date.parse(c1.eaReceivedAt);
      const at = Math.min(closed + rng.range(4, 20) * DAY, limit - (reopenKind === 'REOPENED' ? rng.range(1, 5) * DAY : 4 * DAY));
      reopen = { at: iso(at), reason: rng.pick(REOPEN_REASONS) };
      if (reopenKind === 'REFILED') {
        cycles.push(buildCycle(rng, 2, at, 'CLOSED', roles, reviewInput(2), limit));
        status = 'CLOSED';
      } else {
        cycles.push({ cycle: 2, startedAt: iso(at), openedAt: null, reviewedAt: null, review: null, acks: [], eaReceivedAt: null, actionsDoneAt: null });
        status = 'REOPENED';
      }
    }

    // ----- compliance clocks (A3.7, cycle 1 only) -----
    const clocks: PlanClock[] = [];
    if (d.built.types.includes('STAFF_INJURY') && c1.reviewedAt) {
      const started = Date.parse(c1.reviewedAt);
      const kinds: [ClockKind, number][] = [];
      if (d.built.healthCare || d.built.lostTime) kinds.push(['WSIB_FORM7', addBusinessDays(started, 3)]);
      if (d.built.healthCare) kinds.push(['JHSC_4DAY', started + 4 * DAY]);
      for (const [kind, due] of kinds) {
        let metAt: string | null = null;
        if (!forcedOverdue.has(d)) {
          const met = started + rng.range(0.1, 0.9) * (due - started);
          metAt = met < nowMs ? iso(met) : null; // otherwise pending, not yet due
        }
        clocks.push({ kind, startedAt: iso(started), dueAt: iso(due), metAt });
      }
    }

    return {
      id: '',
      pattern: d.spec.pattern,
      types: d.built.types,
      site: d.site,
      submittedBy: d.reporter.id,
      supervisorId: d.sup.id,
      answers: d.built.answers,
      footageHoldRequested: d.built.footage,
      incidentAt: iso(d.at.getTime()),
      createdAt: iso(d.createdAt),
      status,
      cycle: cycles.length,
      cycles,
      reopen,
      clocks,
    };
  });

  plans.sort((x, y) => Date.parse(x.createdAt) - Date.parse(y.createdAt));
  plans.forEach((p, i) => {
    p.id = `INC-${new Date(p.createdAt).getFullYear()}-${String(i + 1).padStart(4, '0')}`;
  });
  return plans;
}

// ---------- mock /api/trends and /api/insights ----------

export interface DashboardParams {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  site?: string;
}

let cached: { key: number; plans: DemoPlan[] } | null = null;
function demoPlans(): DemoPlan[] {
  const hour = Math.floor(Date.now() / HOUR) * HOUR;
  if (!cached || cached.key !== hour) cached = { key: hour, plans: generateDemoPlans(hour) };
  return cached.plans;
}

const dayStart = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

function inRange(p: DemoPlan, params: DashboardParams): boolean {
  const t = Date.parse(p.createdAt);
  return t >= dayStart(params.from) && t < dayStart(params.to) + DAY && (!params.site || p.site === params.site);
}

/** Monday of the week, as YYYY-MM-DD. */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return formatDate(d);
}

const isOverdue = (c: PlanClock, now: number) => c.metAt === null && Date.parse(c.dueAt) < now;

function stageSpans(p: DemoPlan): { stage: Status; hours: number }[] {
  const out: { stage: Status; hours: number }[] = [];
  const h = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / HOUR;
  for (const c of p.cycles) {
    if (c.openedAt) out.push({ stage: 'SUBMITTED', hours: h(c.startedAt, c.openedAt) });
    if (c.openedAt && c.reviewedAt) out.push({ stage: 'SUPERVISOR_REVIEW', hours: h(c.openedAt, c.reviewedAt) });
    const acked = c.acks.length > 0 && c.acks.every((a) => a.at);
    const lastAck = acked ? c.acks.map((a) => a.at as string).sort().at(-1) ?? null : null;
    if (c.reviewedAt && lastAck) out.push({ stage: 'SPECIALTY_REVIEW', hours: h(c.reviewedAt, lastAck) });
    const eaStart = c.acks.length ? lastAck : c.reviewedAt;
    if (eaStart && c.eaReceivedAt) out.push({ stage: 'WITH_EA', hours: h(eaStart, c.eaReceivedAt) });
  }
  return out;
}

export function computeTrends(plans: DemoPlan[], params: DashboardParams, now: number = Date.now()): TrendsResponse {
  const scoped = plans.filter((p) => inRange(p, params));
  const siteOnly = plans.filter((p) => !params.site || p.site === params.site);

  const ref = new Date(dayStart(params.to));
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime();
  const lastMonthStart = new Date(ref.getFullYear(), ref.getMonth() - 1, 1).getTime();
  const thisMonth = siteOnly.filter((p) => Date.parse(p.createdAt) >= monthStart && Date.parse(p.createdAt) < dayStart(params.to) + DAY).length;
  const lastMonth = siteOnly.filter((p) => Date.parse(p.createdAt) >= lastMonthStart && Date.parse(p.createdAt) < monthStart).length;

  const closeDays = scoped
    .map((p) => p.cycles[0].eaReceivedAt)
    .map((ea, i) => (ea ? (Date.parse(ea) - Date.parse(scoped[i].createdAt)) / DAY : null))
    .filter((x): x is number => x !== null);

  const byWeekType = new Map<string, number>();
  for (const p of scoped) for (const t of p.types) {
    const k = `${weekKey(Date.parse(p.createdAt))}|${t}`;
    byWeekType.set(k, (byWeekType.get(k) ?? 0) + 1);
  }

  const bySite = new Map<string, number>();
  for (const p of scoped) bySite.set(p.site, (bySite.get(p.site) ?? 0) + 1);

  const heat = new Map<string, number>();
  for (const p of scoped) {
    const t = parseIncidentTime(p.answers);
    if (t) heat.set(`${t.dow}|${t.hour}`, (heat.get(`${t.dow}|${t.hour}`) ?? 0) + 1);
  }

  const spans = new Map<Status, number[]>();
  for (const p of scoped) for (const s of stageSpans(p)) spans.set(s.stage, [...(spans.get(s.stage) ?? []), s.hours]);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  return {
    totals: {
      thisMonth,
      lastMonth,
      open: scoped.filter((p) => p.status !== 'CLOSED').length,
      awaitingAck: scoped.filter((p) => p.status === 'SPECIALTY_REVIEW').length,
      avgDaysToClose: Math.round(avg(closeDays) * 10) / 10,
      overdueClocks: scoped.reduce((n, p) => n + p.clocks.filter((c) => isOverdue(c, now)).length, 0),
      // percentage of records in range, matching /api/trends
      reopenedRate: scoped.length ? Math.round((scoped.filter((p) => p.cycle > 1).length / scoped.length) * 1000) / 10 : 0,
    },
    byWeekType: [...byWeekType].map(([k, count]) => {
      const [week, type] = k.split('|');
      return { week, type: type as IncidentType, count };
    }),
    bySite: [...bySite].map(([site, count]) => ({ site, count })).sort((a, b) => b.count - a.count),
    heatmap: [...heat].map(([k, count]) => {
      const [dow, hour] = k.split('|').map(Number);
      return { dow, hour, count };
    }),
    stageDurations: (['SUBMITTED', 'SUPERVISOR_REVIEW', 'SPECIALTY_REVIEW', 'WITH_EA'] as const).map((stage) => ({
      stage,
      avgHours: Math.round(avg(spans.get(stage) ?? []) * 10) / 10,
    })),
  };
}

/**
 * Rule-based briefing: the mock response AND a reasonable non-AI fallback for
 * the real /api/insights (Connan is welcome to reuse it server-side).
 */
export function computeInsights(plans: DemoPlan[], params: DashboardParams, now: number = Date.now()): InsightsResponse {
  const scoped = plans.filter((p) => inRange(p, params));
  const bullets: InsightsResponse['bullets'] = [];
  const ago = (p: DemoPlan) => now - Date.parse(p.createdAt);
  const has = (p: DemoPlan, q: 'q15' | 'q17', v: string) => Array.isArray(p.answers[q]) && (p.answers[q] as string[]).includes(v);

  const friVerbal = scoped.filter((p) => {
    const t = parseIncidentTime(p.answers);
    return p.site === 'Main Site' && has(p, 'q17', 'Verbal Aggression') && t?.dow === 5 && t.hour >= 13 && t.hour < 17;
  });
  if (friVerbal.length >= 3) {
    const recent = friVerbal.filter((p) => ago(p) < 28 * DAY).length;
    const before = friVerbal.filter((p) => ago(p) >= 28 * DAY && ago(p) < 56 * DAY).length;
    bullets.push({
      text: `Verbal aggression at Main Site clusters on Friday afternoons (1–5pm): ${recent} reports in the last 4 weeks, compared with ${before} in the 4 weeks before.`,
      incidentIds: friVerbal.map((p) => p.id),
    });
  }

  const growFalls = scoped.filter((p) => p.site === 'Grow Community Centre' && has(p, 'q15', 'Slip/Trip/Fall'));
  if (growFalls.length >= 3) {
    const recent = growFalls.filter((p) => ago(p) < 21 * DAY).length;
    bullets.push({
      text: `Slips, trips and falls at Grow Community Centre jumped to ${recent} in the last 3 weeks, up from ${growFalls.length - recent} in the 9 weeks before.`,
      incidentIds: growFalls.map((p) => p.id),
    });
  }

  const privacy = scoped.filter((p) => p.types.includes('PRIVACY'));
  const wrongEmail = privacy.filter((p) => p.pattern === 'PRIVACY_EMAIL');
  if (privacy.length >= 3) {
    bullets.push({
      text: `${wrongEmail.length} of ${privacy.length} privacy incidents were emails sent to the wrong recipient.`,
      incidentIds: wrongEmail.map((p) => p.id),
    });
  }

  const t = computeTrends(plans, params, now);
  const slowest = [...t.stageDurations].sort((a, b) => b.avgHours - a.avgHours)[0];
  if (slowest && slowest.avgHours > 0) {
    const waiting = scoped.filter((p) => p.status === slowest.stage);
    bullets.push({
      text: `Records wait longest at specialty acknowledgement — about ${(slowest.avgHours / 24).toFixed(1)} days on average. ${waiting.length} are waiting there now.`,
      incidentIds: waiting.map((p) => p.id),
    });
  }

  const overdue = scoped.filter((p) => p.clocks.some((c) => isOverdue(c, now)));
  if (overdue.length) {
    bullets.push({
      text: `${overdue.length} staff injury records have an overdue reporting clock (WSIB Form 7 or JHSC notice).`,
      incidentIds: overdue.map((p) => p.id),
    });
  }

  return {
    bullets: bullets.slice(0, 5),
    focus:
      'Plan extra staffing or a check-in at Main Site reception on Friday afternoons, have Facilities walk the Grow Community Centre entrance and floors, and set a reminder for acknowledgements older than 3 days.',
    generatedAt: new Date(now).toISOString(),
    mock: true,
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function mockTrends(params: DashboardParams): Promise<TrendsResponse> {
  await delay(250);
  return computeTrends(demoPlans(), params);
}

export async function mockInsights(params: DashboardParams): Promise<InsightsResponse> {
  await delay(600);
  return computeInsights(demoPlans(), params);
}
