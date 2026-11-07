import { sql } from 'drizzle-orm';
import { buildMockAiAnalysis } from '@/lib/mock/connan';
import type { Answers } from '@/lib/types';
import type { AppDatabase } from './index';
import * as schema from './schema';

export async function seedDemoIncidentsIfEmpty(db: AppDatabase): Promise<void> {
  const existing = await db
    .select({ id: schema.incidents.id })
    .from(schema.incidents)
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
  const hoursFromNow = (h: number) => new Date(now + h * 3600_000).toISOString();

  // 1. INC-2026-0001: Privacy incident (CLOSED)
  const ans1: Answers = {
    q1: '2026-10-28',
    q2: '9:15AM',
    q3: 'Riley Chen',
    q4: 'None',
    q5: 'Main Site',
    q7: 'Community Services',
    q9: 'Patient/Participant over 18 years of age',
    q10: '519-555-0142',
    q11: 'Participant Group Schedule',
    q12: 'No',
    q13: 'Less Serious',
    q14: 'No',
    q16: 'No',
    q18: 'Yes',
    q19: ['Privacy/Confidentiality'],
    q20: 'No',
    q22: 'No',
    q23: 'No',
    q28: 'No',
    q30: 'No',
    q31: ['Supervisory Support'],
    q32: 'Staff member accidentally emailed a fictional community-program schedule to the wrong external email address, noticed immediately, attempted recall, and informed supervisor.',
    q33: 'Double-check external recipient autofill; send follow-up deletion confirmation request.',
    q34: 'No',
    q35: 'u_sup_1',
  };

  await db.insert(schema.incidents).values({
    id: 'INC-2026-0001',
    cycle: 1,
    status: 'CLOSED',
    currentOwnerRoles: [],
    submittedBy: 'u_staff_1',
    supervisorId: 'u_sup_1',
    answers: ans1,
    ai: buildMockAiAnalysis(ans1, undefined, true),
    footageHoldRequested: false,
    createdAt: hoursAgo(240),
    closedAt: hoursAgo(210),
    site: 'Main Site',
    types: ['PRIVACY'],
    severity: 'Less Serious',
  });

  await db.insert(schema.supervisorReviews).values({
    id: 'rev_INC-2026-0001_c1',
    incidentId: 'INC-2026-0001',
    cycle: 1,
    reviewerId: 'u_sup_1',
    confirmedTypes: ['PRIVACY'],
    severity: 'Less Serious',
    seriousBehavioural: false,
    healthCareBeyondFirstAid: false,
    lostTime: false,
    criticalInjury: false,
    correctiveActions: [
      {
        title: 'Confirm recipient deleted misdirected community schedule email',
        ownerRole: 'PRIVACY_OFFICER',
        dueAt: hoursAgo(190),
      },
    ],
    footageHold: false,
    notes: 'Confirmed accidental email of fictional program schedule. Routed to Privacy Officer.',
    submittedAt: hoursAgo(234),
  });

  await db.insert(schema.acknowledgements).values({
    id: 'ack_INC-2026-0001_c1_privacy_officer',
    incidentId: 'INC-2026-0001',
    cycle: 1,
    type: 'PRIVACY',
    role: 'PRIVACY_OFFICER',
    ackedBy: 'u_priv',
    ackedAt: hoursAgo(220),
    comment: 'Reviewed containment steps; external recipient confirmed permanent deletion.',
    toConfirm: false,
  });

  await db.insert(schema.followUpActions).values({
    id: 'act_demo_0001',
    incidentId: 'INC-2026-0001',
    title: 'Confirm recipient deleted misdirected community schedule email',
    ownerRole: 'PRIVACY_OFFICER',
    dueAt: hoursAgo(190),
    status: 'DONE',
    completedAt: hoursAgo(215),
    kind: 'CORRECTIVE',
  });

  await db.insert(schema.events).values([
    {
      time: hoursAgo(240),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_staff_1',
      kind: 'SUBMITTED',
      toStatus: 'SUBMITTED',
    },
    {
      time: hoursAgo(236),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'OPENED',
      fromStatus: 'SUBMITTED',
      toStatus: 'SUPERVISOR_REVIEW',
    },
    {
      time: hoursAgo(234),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'REVIEW_SUBMITTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(233.9),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'ROUTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(220),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_priv',
      kind: 'ACKNOWLEDGED',
      fromStatus: 'SPECIALTY_REVIEW',
      toStatus: 'WITH_EA',
    },
    {
      time: hoursAgo(210.1),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_ea',
      kind: 'EA_RECEIVED',
      fromStatus: 'WITH_EA',
      toStatus: 'CLOSED',
    },
    {
      time: hoursAgo(210),
      incidentId: 'INC-2026-0001',
      cycle: 1,
      actorId: 'u_ea',
      kind: 'CLOSED',
      fromStatus: 'WITH_EA',
      toStatus: 'CLOSED',
    },
  ]);

  // 2. INC-2026-0002: Facilities near miss (SPECIALTY_REVIEW - IT_FACILITIES acked, awaiting DIRECTOR_OPS)
  const ans2: Answers = {
    q1: '2026-11-03',
    q2: '10:30AM',
    q3: 'Riley Chen',
    q4: 'Front desk volunteer',
    q5: 'Main Site',
    q7: 'Administration/Operations',
    q9: 'Visitor',
    q10: '519-555-0188',
    q11: 'Fictional Visitor',
    q12: 'No',
    q13: 'Less Serious',
    q14: 'No',
    q16: 'No',
    q18: 'Yes',
    q19: ['Property Damage'],
    q20: 'No',
    q22: 'No',
    q23: 'No',
    q28: 'No',
    q30: 'No',
    q31: ['Supervisory Support'],
    q32: 'Loose handrail on the east stairwell; a fictional visitor nearly tripped. No injury occurred. Area was temporarily blocked with cones and supervisor informed.',
    q33: 'Re-anchor stairwell handrail brackets and inspect adjacent railings.',
    q34: 'No',
    q35: 'u_sup_1',
  };

  await db.insert(schema.incidents).values({
    id: 'INC-2026-0002',
    cycle: 1,
    status: 'SPECIALTY_REVIEW',
    currentOwnerRoles: ['DIRECTOR_OPS'],
    submittedBy: 'u_staff_1',
    supervisorId: 'u_sup_1',
    answers: ans2,
    ai: buildMockAiAnalysis(ans2, undefined, true),
    footageHoldRequested: true,
    createdAt: hoursAgo(96),
    closedAt: null,
    site: 'Main Site',
    types: ['FACILITIES'],
    severity: 'Less Serious',
  });

  await db.insert(schema.supervisorReviews).values({
    id: 'rev_INC-2026-0002_c1',
    incidentId: 'INC-2026-0002',
    cycle: 1,
    reviewerId: 'u_sup_1',
    confirmedTypes: ['FACILITIES'],
    severity: 'Less Serious',
    seriousBehavioural: false,
    healthCareBeyondFirstAid: false,
    lostTime: false,
    criticalInjury: false,
    correctiveActions: [
      {
        title: 'Repair loose handrail bracket on east stairwell',
        ownerRole: 'IT_FACILITIES',
        dueAt: hoursFromNow(48),
      },
    ],
    footageHold: true,
    notes: 'Area blocked off safely. Routing to IT/Facilities and Director of Operations.',
    submittedAt: hoursAgo(90),
  });

  await db.insert(schema.acknowledgements).values([
    {
      id: 'ack_INC-2026-0002_c1_it_facilities',
      incidentId: 'INC-2026-0002',
      cycle: 1,
      type: 'FACILITIES',
      role: 'IT_FACILITIES',
      ackedBy: 'u_itf',
      ackedAt: hoursAgo(80),
      comment: 'Hardware ordered and temporary barrier verified.',
      toConfirm: false,
    },
    {
      id: 'ack_INC-2026-0002_c1_director_ops',
      incidentId: 'INC-2026-0002',
      cycle: 1,
      type: 'FACILITIES',
      role: 'DIRECTOR_OPS',
      ackedBy: null,
      ackedAt: null,
      comment: null,
      toConfirm: false,
    },
  ]);

  await db.insert(schema.followUpActions).values([
    {
      id: 'act_demo_0002_repair',
      incidentId: 'INC-2026-0002',
      title: 'Repair loose handrail bracket on east stairwell',
      ownerRole: 'IT_FACILITIES',
      dueAt: hoursFromNow(48),
      status: 'IN_PROGRESS',
      completedAt: null,
      kind: 'CORRECTIVE',
    },
    {
      id: 'act_demo_0002_fh',
      incidentId: 'INC-2026-0002',
      title:
        'Preserve camera footage — Main Site, 2026-11-03, 10:00AM to 11:00AM (10:30AM −30 min to +30 min)',
      ownerRole: 'IT_FACILITIES',
      dueAt: hoursFromNow(24),
      status: 'NOT_STARTED',
      completedAt: null,
      kind: 'FOOTAGE_HOLD',
    },
  ]);

  await db.insert(schema.events).values([
    {
      time: hoursAgo(96),
      incidentId: 'INC-2026-0002',
      cycle: 1,
      actorId: 'u_staff_1',
      kind: 'SUBMITTED',
      toStatus: 'SUBMITTED',
    },
    {
      time: hoursAgo(92),
      incidentId: 'INC-2026-0002',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'OPENED',
      fromStatus: 'SUBMITTED',
      toStatus: 'SUPERVISOR_REVIEW',
    },
    {
      time: hoursAgo(90),
      incidentId: 'INC-2026-0002',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'REVIEW_SUBMITTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(89.9),
      incidentId: 'INC-2026-0002',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'ROUTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(80),
      incidentId: 'INC-2026-0002',
      cycle: 1,
      actorId: 'u_itf',
      kind: 'ACKNOWLEDGED',
      fromStatus: 'SPECIALTY_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
  ]);

  // 3. INC-2026-0003: Staff injury (WITH_EA, has WSIB_FORM7 + JHSC_4DAY clocks)
  const ans3: Answers = {
    q1: '2026-11-05',
    q2: '2:15PM',
    q3: 'Priya Nair',
    q4: 'Clinic nurse on duty',
    q5: 'Grow Community Centre',
    q7: 'Clinical',
    q9: 'Staff/Volunteer',
    q10: '519-555-0199',
    q11: 'Priya Nair',
    q12: 'No',
    q13: 'Less Serious',
    q14: 'Yes',
    q15: ['Impact (e.g. head injury, crushed finger etc.)'],
    q16: 'No',
    q18: 'No',
    q20: 'No',
    q22: 'No',
    q23: 'No',
    q28: 'No',
    q30: 'No',
    q31: ['First Aid', 'Supervisory Support'],
    q32: 'Minor hand injury while moving a sealed supply box in the storage room; first aid was administered on site.',
    q33: 'Store heavy supply boxes on waist-level shelving and use utility cart.',
    q34: 'No',
    q35: 'u_sup_1',
  };

  await db.insert(schema.incidents).values({
    id: 'INC-2026-0003',
    cycle: 1,
    status: 'WITH_EA',
    currentOwnerRoles: ['EXEC_ASSISTANT'],
    submittedBy: 'u_staff_2',
    supervisorId: 'u_sup_1',
    answers: ans3,
    ai: buildMockAiAnalysis(ans3, undefined, true),
    footageHoldRequested: false,
    createdAt: hoursAgo(48),
    closedAt: null,
    site: 'Grow Community Centre',
    types: ['STAFF_INJURY'],
    severity: 'Less Serious',
  });

  await db.insert(schema.supervisorReviews).values({
    id: 'rev_INC-2026-0003_c1',
    incidentId: 'INC-2026-0003',
    cycle: 1,
    reviewerId: 'u_sup_1',
    confirmedTypes: ['STAFF_INJURY'],
    severity: 'Less Serious',
    seriousBehavioural: false,
    healthCareBeyondFirstAid: true,
    lostTime: false,
    criticalInjury: false,
    correctiveActions: [
      {
        title: 'Relocate heavy supply boxes to lower storage shelves',
        ownerRole: 'IT_FACILITIES',
        dueAt: hoursFromNow(72),
      },
    ],
    footageHold: false,
    notes: 'Staff member sought follow-up clinic assessment after first aid. WSIB Form 7 clock started.',
    submittedAt: hoursAgo(42),
  });

  await db.insert(schema.acknowledgements).values({
    id: 'ack_INC-2026-0003_c1_johsc_chair',
    incidentId: 'INC-2026-0003',
    cycle: 1,
    type: 'STAFF_INJURY',
    role: 'JOHSC_CHAIR',
    ackedBy: 'u_johsc_1',
    ackedAt: hoursAgo(30),
    comment: 'JOHSC co-chair reviewed injury report and storage shelf recommendation.',
    toConfirm: true,
  });

  await db.insert(schema.complianceClocks).values([
    {
      id: 'clk_INC-2026-0003_c1_wsib_form7',
      incidentId: 'INC-2026-0003',
      kind: 'WSIB_FORM7',
      startedAt: hoursAgo(42),
      dueAt: hoursFromNow(30),
      metAt: null,
    },
    {
      id: 'clk_INC-2026-0003_c1_jhsc_4day',
      incidentId: 'INC-2026-0003',
      kind: 'JHSC_4DAY',
      startedAt: hoursAgo(42),
      dueAt: hoursFromNow(54),
      metAt: null,
    },
  ]);

  await db.insert(schema.events).values([
    {
      time: hoursAgo(48),
      incidentId: 'INC-2026-0003',
      cycle: 1,
      actorId: 'u_staff_2',
      kind: 'SUBMITTED',
      toStatus: 'SUBMITTED',
    },
    {
      time: hoursAgo(44),
      incidentId: 'INC-2026-0003',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'OPENED',
      fromStatus: 'SUBMITTED',
      toStatus: 'SUPERVISOR_REVIEW',
    },
    {
      time: hoursAgo(42),
      incidentId: 'INC-2026-0003',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'REVIEW_SUBMITTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(41.9),
      incidentId: 'INC-2026-0003',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'ROUTED',
      fromStatus: 'SUPERVISOR_REVIEW',
      toStatus: 'SPECIALTY_REVIEW',
    },
    {
      time: hoursAgo(30),
      incidentId: 'INC-2026-0003',
      cycle: 1,
      actorId: 'u_johsc_1',
      kind: 'ACKNOWLEDGED',
      fromStatus: 'SPECIALTY_REVIEW',
      toStatus: 'WITH_EA',
    },
  ]);

  // 4. INC-2026-0004: IT/Cyber incident (SUPERVISOR_REVIEW)
  const ans4: Answers = {
    q1: '2026-11-06',
    q2: '3:45PM',
    q3: 'Riley Chen',
    q5: 'North Dumfries',
    q7: 'Facilities/IT',
    q9: 'Non Applicable',
    q10: '519-555-0110',
    q11: 'N/A',
    q12: 'No',
    q13: 'Unsure',
    q14: 'No',
    q16: 'No',
    q18: 'Yes',
    q19: ['Cybersecurity'],
    q20: 'No',
    q22: 'No',
    q23: 'No',
    q28: 'No',
    q30: 'No',
    q31: ['Supervisory Support'],
    q32: 'Suspicious external phishing email mimicking shared drive login was reported by reception workstation; workstation disconnected from network pending IT check.',
    q33: 'IT to scan workstation and block sender domain.',
    q34: 'No',
    q35: 'u_sup_1',
  };

  await db.insert(schema.incidents).values({
    id: 'INC-2026-0004',
    cycle: 1,
    status: 'SUPERVISOR_REVIEW',
    currentOwnerRoles: ['SUPERVISOR'],
    submittedBy: 'u_staff_1',
    supervisorId: 'u_sup_1',
    answers: ans4,
    ai: buildMockAiAnalysis(ans4, undefined, true),
    footageHoldRequested: false,
    createdAt: hoursAgo(20),
    closedAt: null,
    site: 'North Dumfries',
    types: ['IT_CYBER'],
    severity: 'Unsure',
  });

  await db.insert(schema.events).values([
    {
      time: hoursAgo(20),
      incidentId: 'INC-2026-0004',
      cycle: 1,
      actorId: 'u_staff_1',
      kind: 'SUBMITTED',
      toStatus: 'SUBMITTED',
    },
    {
      time: hoursAgo(18),
      incidentId: 'INC-2026-0004',
      cycle: 1,
      actorId: 'u_sup_1',
      kind: 'OPENED',
      fromStatus: 'SUBMITTED',
      toStatus: 'SUPERVISOR_REVIEW',
    },
  ]);

  // 5. INC-2026-0005: Behavioural de-escalation (SUBMITTED)
  const ans5: Answers = {
    q1: '2026-11-07',
    q2: '11:00AM',
    q3: 'Priya Nair',
    q5: 'Bishop St',
    q7: 'Social Work',
    q9: 'Visitor',
    q10: '519-555-0177',
    q11: 'Fictional Visitor B',
    q12: 'Unknown',
    q13: 'Less Serious',
    q14: 'No',
    q16: 'Yes',
    q17: ['Verbal Aggression'],
    q18: 'No',
    q20: 'No',
    q22: 'No',
    q23: 'No',
    q28: 'No',
    q30: 'No',
    q31: ['Descalation', 'Supervisory Support'],
    q32: 'Visitor became verbally agitated in waiting area regarding appointment scheduling; staff used verbal de-escalation and visitor departed calmly.',
    q33: 'Review reception check-in signage.',
    q34: 'No',
    q35: 'u_sup_1',
  };

  await db.insert(schema.incidents).values({
    id: 'INC-2026-0005',
    cycle: 1,
    status: 'SUBMITTED',
    currentOwnerRoles: ['SUPERVISOR'],
    submittedBy: 'u_staff_2',
    supervisorId: 'u_sup_1',
    answers: ans5,
    ai: buildMockAiAnalysis(ans5, undefined, true),
    footageHoldRequested: false,
    createdAt: hoursAgo(4),
    closedAt: null,
    site: 'Bishop St',
    types: ['BEHAVIOURAL'],
    severity: 'Less Serious',
  });

  await db.insert(schema.events).values({
    time: hoursAgo(4),
    incidentId: 'INC-2026-0005',
    cycle: 1,
    actorId: 'u_staff_2',
    kind: 'SUBMITTED',
    toStatus: 'SUBMITTED',
  });

  // Advance sequence past 5 so next generated ID is INC-2026-0006
  await db.execute(sql`SELECT setval('incident_id_seq', 5, true)`);
}

