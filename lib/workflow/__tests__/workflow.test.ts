import { beforeEach, describe, expect, it } from 'vitest';
import { resetTestDb } from '@/lib/db';
import { SEED_USERS } from '@/lib/mock/connan';
import {
  addOntarioBusinessDays,
  buildComplianceClocks,
  deriveTypes,
  formatFootageHoldTitle,
  parseIncidentDowAndHour,
  requiredAcks,
  submitNewIncident,
  toMondayDateStr,
  transition,
  WorkflowError,
} from '@/lib/workflow';

const userByRole = (role: string) => {
  const u = SEED_USERS.find((s) => s.role === role);
  if (!u) throw new Error(`Missing seed user for role ${role}`);
  return u;
};

describe('Pure workflow rules: deriveTypes (A3.3)', () => {
  it('derives PRIVACY when q19 includes Privacy/Confidentiality', () => {
    expect(
      deriveTypes({
        q18: 'Yes',
        q19: ['Privacy/Confidentiality'],
      }),
    ).toEqual(['PRIVACY']);
  });

  it('derives STAFF_INJURY only when q14 = Yes AND q9 = Staff/Volunteer', () => {
    expect(
      deriveTypes({
        q14: 'Yes',
        q9: 'Staff/Volunteer',
      }),
    ).toEqual(['STAFF_INJURY']);

    expect(
      deriveTypes({
        q14: 'Yes',
        q9: 'Visitor',
      }),
    ).toEqual([]);
  });

  it('derives FACILITIES for any facility option in q19', () => {
    expect(deriveTypes({ q19: ['Property Damage'] })).toEqual(['FACILITIES']);
    expect(deriveTypes({ q19: ['Building Security System Activated'] })).toEqual([
      'FACILITIES',
    ]);
    expect(deriveTypes({ q19: ['Theft'] })).toEqual(['FACILITIES']);
    expect(deriveTypes({ q19: ['External Disaster'] })).toEqual(['FACILITIES']);
  });

  it('derives IT_CYBER from q19 Cybersecurity or q21 Code Cyber', () => {
    expect(deriveTypes({ q19: ['Cybersecurity'] })).toEqual(['IT_CYBER']);
    expect(
      deriveTypes({
        q20: 'Yes',
        q21: 'Cybersecurity Threat (Code Cyber)',
      }),
    ).toEqual(['IT_CYBER']);
    expect(deriveTypes({ q21: 'Code Cyber' })).toEqual(['IT_CYBER']);
  });

  it('derives BEHAVIOURAL from q16 = Yes and CID from q34 = Yes', () => {
    expect(deriveTypes({ q16: 'Yes', q34: 'Yes' })).toEqual([
      'BEHAVIOURAL',
      'CID',
    ]);
  });
});

describe('Pure workflow rules: requiredAcks (A3.4)', () => {
  it('maps single types to their required acknowledgement roles', () => {
    expect(requiredAcks({ confirmedTypes: ['PRIVACY'] })).toEqual([
      { type: 'PRIVACY', role: 'PRIVACY_OFFICER', toConfirm: false },
    ]);

    expect(requiredAcks({ confirmedTypes: ['STAFF_INJURY'] })).toEqual([
      { type: 'STAFF_INJURY', role: 'JOHSC_CHAIR', toConfirm: true },
    ]);

    expect(requiredAcks({ confirmedTypes: ['CID'] })).toEqual([
      { type: 'CID', role: 'CID_GROUP', toConfirm: true },
    ]);
  });

  it('merges duplicate roles when both FACILITIES and IT_CYBER are confirmed', () => {
    const acks = requiredAcks({
      confirmedTypes: ['FACILITIES', 'IT_CYBER'],
    });
    expect(acks).toHaveLength(2);
    expect(acks.map((a) => a.role)).toEqual(['IT_FACILITIES', 'DIRECTOR_OPS']);
    expect(acks.every((a) => !a.toConfirm)).toBe(true);
  });

  it('requires no specialty ack for non-serious BEHAVIOURAL, and DIRECTOR_OPS (toConfirm) when serious', () => {
    expect(
      requiredAcks({
        confirmedTypes: ['BEHAVIOURAL'],
        seriousBehavioural: false,
      }),
    ).toEqual([]);

    expect(
      requiredAcks({
        confirmedTypes: ['BEHAVIOURAL'],
        seriousBehavioural: true,
      }),
    ).toEqual([
      { type: 'BEHAVIOURAL', role: 'DIRECTOR_OPS', toConfirm: true },
    ]);
  });

  it('formats footage hold action title per A3.8', () => {
    const title = formatFootageHoldTitle({
      q1: '2026-11-07',
      q2: '10:30AM',
      q5: 'Main Site',
    });
    expect(title).toContain('Preserve camera footage — Main Site, 2026-11-07');
    expect(title).toContain('10:00AM to 11:00AM');
  });
});

describe('Compliance clocks and business-day calculations (A3.7 & B7)', () => {
  it('skips Saturday and Sunday when adding 3 business days for WSIB_FORM7', () => {
    // Friday 2026-11-06 14:00 UTC -> +3 business days = Wednesday 2026-11-11 14:00 UTC
    const friday = new Date('2026-11-06T14:00:00.000Z');
    const due = addOntarioBusinessDays(friday, 3);
    expect(due.toISOString()).toBe('2026-11-11T14:00:00.000Z');
  });

  it('creates WSIB_FORM7 and JHSC_4DAY for non-critical staff injury with health care beyond first aid', () => {
    const start = new Date('2026-11-06T14:00:00.000Z');
    const clocks = buildComplianceClocks(
      {
        confirmedTypes: ['STAFF_INJURY'],
        healthCareBeyondFirstAid: true,
        lostTime: false,
        criticalInjury: false,
      },
      start,
    );

    expect(clocks.map((c) => c.kind)).toEqual(['WSIB_FORM7', 'JHSC_4DAY']);
    expect(clocks[0].dueAt).toBe('2026-11-11T14:00:00.000Z'); // 3 business days
    expect(clocks[1].dueAt).toBe('2026-11-10T14:00:00.000Z'); // 4 calendar days
  });

  it('creates MOL_CRITICAL_NOTICE (immediate) and CRITICAL_WRITTEN_48H (48h) for critical injury', () => {
    const start = new Date('2026-11-06T14:00:00.000Z');
    const clocks = buildComplianceClocks(
      {
        confirmedTypes: ['STAFF_INJURY'],
        healthCareBeyondFirstAid: true,
        lostTime: true,
        criticalInjury: true,
      },
      start,
    );

    expect(clocks.map((c) => c.kind)).toEqual([
      'WSIB_FORM7',
      'MOL_CRITICAL_NOTICE',
      'CRITICAL_WRITTEN_48H',
    ]);
    expect(clocks[1].dueAt).toBe(start.toISOString());
    expect(clocks[2].dueAt).toBe('2026-11-08T14:00:00.000Z');
  });
});

describe('State machine transitions & Langs Scenarios 1–3 + Reopen (B5 & B11)', () => {
  beforeEach(async () => {
    process.env.USE_MOCK_AI = 'true';
    await resetTestDb();
  });

  it('Scenario 1 (Privacy): runs from submit -> supervisor review -> privacy officer ack -> EA receive -> CLOSED', async () => {
    const staff = userByRole('STAFF');
    const supervisor = userByRole('SUPERVISOR');
    const privacyOfficer = userByRole('PRIVACY_OFFICER');
    const ea = userByRole('EXEC_ASSISTANT');

    const created = await submitNewIncident(staff, {
      answers: {
        q1: '2026-11-07',
        q2: '9:00AM',
        q3: 'Riley Chen',
        q5: 'Main Site',
        q13: 'Less Serious',
        q14: 'No',
        q16: 'No',
        q18: 'Yes',
        q19: ['Privacy/Confidentiality'],
        q32: 'Accidentally emailed fictional community-program schedule to the wrong external email address.',
        q35: 'u_sup_1',
      },
      footageHoldRequested: false,
    });

    expect(created.id).toBe('INC-2026-0001');
    expect(created.status).toBe('SUBMITTED');
    expect(created.currentOwnerRoles).toEqual(['SUPERVISOR']);

    // Supervisor submits review directly on SUBMITTED record (implicit open)
    const afterReview = await transition(created.id, 'review', supervisor, {
      confirmedTypes: ['PRIVACY'],
      severity: 'Less Serious',
      seriousBehavioural: false,
      healthCareBeyondFirstAid: false,
      lostTime: false,
      criticalInjury: false,
      correctiveActions: [],
      footageHold: false,
      notes: 'Routing to Privacy Officer.',
    });

    expect(afterReview.incident.status).toBe('SPECIALTY_REVIEW');
    expect(afterReview.incident.currentOwnerRoles).toEqual(['PRIVACY_OFFICER']);
    expect(afterReview.acknowledgements).toHaveLength(1);

    // Privacy Officer acknowledges
    const ackId = afterReview.acknowledgements[0].id;
    const afterAck = await transition(created.id, 'ack', privacyOfficer, {
      ackId,
      comment: 'Reviewed and confirmed recall.',
    });

    expect(afterAck.incident.status).toBe('WITH_EA');
    expect(afterAck.incident.currentOwnerRoles).toEqual(['EXEC_ASSISTANT']);

    // EA receives and closes
    const afterReceive = await transition(created.id, 'receive', ea);
    expect(afterReceive.incident.status).toBe('CLOSED');
    expect(afterReceive.incident.closedAt).toBeTruthy();
    expect(afterReceive.events.map((e) => e.kind)).toEqual([
      'SUBMITTED',
      'OPENED',
      'REVIEW_SUBMITTED',
      'ROUTED',
      'ACKNOWLEDGED',
      'EA_RECEIVED',
      'CLOSED',
    ]);
  });

  it('Scenario 2 (Facilities near miss): requires BOTH IT_FACILITIES and DIRECTOR_OPS before moving to WITH_EA', async () => {
    const staff = userByRole('STAFF');
    const supervisor = userByRole('SUPERVISOR');
    const itf = userByRole('IT_FACILITIES');
    const dops = userByRole('DIRECTOR_OPS');
    const ea = userByRole('EXEC_ASSISTANT');

    const created = await submitNewIncident(staff, {
      answers: {
        q1: '2026-11-07',
        q2: '10:30AM',
        q5: 'Main Site',
        q9: 'Visitor',
        q13: 'Less Serious',
        q14: 'No',
        q18: 'Yes',
        q19: ['Property Damage'],
        q32: 'Loose handrail; visitor nearly trips; no injury; area blocked.',
        q35: 'u_sup_1',
      },
      footageHoldRequested: true,
    });

    const afterReview = await transition(created.id, 'review', supervisor, {
      confirmedTypes: ['FACILITIES'],
      severity: 'Less Serious',
      seriousBehavioural: false,
      healthCareBeyondFirstAid: false,
      lostTime: false,
      criticalInjury: false,
      correctiveActions: [
        {
          title: 'Tighten stairwell handrail anchor bolts',
          ownerRole: 'IT_FACILITIES',
          dueAt: '2026-11-10T12:00:00.000Z',
        },
      ],
      footageHold: true,
      notes: 'Dual acknowledgement required.',
    });

    expect(afterReview.incident.status).toBe('SPECIALTY_REVIEW');
    expect(afterReview.incident.currentOwnerRoles).toEqual([
      'IT_FACILITIES',
      'DIRECTOR_OPS',
    ]);
    // Check both corrective and footage hold actions exist
    expect(afterReview.actions.map((a) => a.kind).sort()).toEqual([
      'CORRECTIVE',
      'FOOTAGE_HOLD',
    ]);

    // First ack by IT_FACILITIES -> must remain in SPECIALTY_REVIEW waiting for DIRECTOR_OPS
    const itfAck = afterReview.acknowledgements.find(
      (a) => a.role === 'IT_FACILITIES',
    )!;
    const afterFirstAck = await transition(created.id, 'ack', itf, {
      ackId: itfAck.id,
      comment: 'Handrail repaired.',
    });

    expect(afterFirstAck.incident.status).toBe('SPECIALTY_REVIEW');
    expect(afterFirstAck.incident.currentOwnerRoles).toEqual(['DIRECTOR_OPS']);

    // EA attempting to receive early must fail with 409
    await expect(transition(created.id, 'receive', ea)).rejects.toMatchObject({
      status: 409,
    });

    // Second ack by DIRECTOR_OPS -> moves to WITH_EA
    const dopsAck = afterReview.acknowledgements.find(
      (a) => a.role === 'DIRECTOR_OPS',
    )!;
    const afterSecondAck = await transition(created.id, 'ack', dops, {
      ackId: dopsAck.id,
      comment: 'Operations review complete.',
    });

    expect(afterSecondAck.incident.status).toBe('WITH_EA');
    expect(afterSecondAck.incident.currentOwnerRoles).toEqual(['EXEC_ASSISTANT']);
  });

  it('Scenario 3 (Staff injury + Reopen): creates WSIB clock and reopens with cycle 2 on the same incident ID', async () => {
    const staff = userByRole('STAFF');
    const supervisor = userByRole('SUPERVISOR');
    const johsc = userByRole('JOHSC_CHAIR');
    const ea = userByRole('EXEC_ASSISTANT');

    const created = await submitNewIncident(staff, {
      answers: {
        q1: '2026-11-07',
        q2: '1:00PM',
        q5: 'Main Site',
        q9: 'Staff/Volunteer',
        q13: 'Less Serious',
        q14: 'Yes',
        q15: ['Impact (e.g. head injury, crushed finger etc.)'],
        q32: 'Minor hand injury moving a sealed supply box; first aid given.',
        q35: 'u_sup_1',
      },
      footageHoldRequested: false,
    });

    const afterReview = await transition(created.id, 'review', supervisor, {
      confirmedTypes: ['STAFF_INJURY'],
      severity: 'Less Serious',
      seriousBehavioural: false,
      healthCareBeyondFirstAid: true,
      lostTime: false,
      criticalInjury: false,
      correctiveActions: [],
      footageHold: false,
      notes: 'Staff sought clinic check after first aid.',
    });

    expect(afterReview.clocks.map((c) => c.kind)).toContain('WSIB_FORM7');
    expect(afterReview.acknowledgements[0].role).toBe('JOHSC_CHAIR');
    expect(afterReview.acknowledgements[0].toConfirm).toBe(true);

    // JOHSC Chair acknowledges -> WITH_EA -> EA receives -> CLOSED
    await transition(created.id, 'ack', johsc, {
      ackId: afterReview.acknowledgements[0].id,
    });
    const closed = await transition(created.id, 'receive', ea);
    expect(closed.incident.status).toBe('CLOSED');

    // Reopen closed record -> same ID, cycle 2, REOPEN_NOTE action created
    const reopened = await transition(created.id, 'reopen', supervisor, {
      reason: 'Follow-up ergonomic assessment added after clinic visit.',
    });

    expect(reopened.incident.id).toBe(created.id);
    expect(reopened.incident.cycle).toBe(2);
    expect(reopened.incident.status).toBe('REOPENED');
    expect(reopened.incident.closedAt).toBeNull();
    expect(reopened.incident.currentOwnerRoles).toEqual(['SUPERVISOR']);
    expect(
      reopened.actions.some(
        (a) =>
          a.kind === 'REOPEN_NOTE' &&
          a.title.includes('Follow-up ergonomic assessment'),
      ),
    ).toBe(true);
  });

  it('enforces 403 on wrong role and 409 on illegal status moves', async () => {
    const staff = userByRole('STAFF');
    const privacyOfficer = userByRole('PRIVACY_OFFICER');

    const created = await submitNewIncident(staff, {
      answers: { q32: 'Test incident' },
    });

    // Staff cannot open supervisor review -> 403
    await expect(transition(created.id, 'open', staff)).rejects.toThrow(
      WorkflowError,
    );
    await expect(transition(created.id, 'open', staff)).rejects.toMatchObject({
      status: 403,
    });

    // Privacy officer cannot ack while status is SUBMITTED -> 409
    await expect(
      transition(created.id, 'ack', privacyOfficer, { ackId: 'nonexistent' }),
    ).rejects.toMatchObject({
      status: 409,
    });
  });

  it('never blocks submission when Gemini AI fails (falls back to deriveTypes)', async () => {
    process.env.USE_MOCK_AI = 'false';
    delete process.env.GEMINI_API_KEY;

    const staff = userByRole('STAFF');
    const created = await submitNewIncident(staff, {
      answers: {
        q18: 'Yes',
        q19: ['Privacy/Confidentiality'],
        q32: 'Sent wrong email but AI is offline.',
      },
    });

    expect(created.status).toBe('SUBMITTED');
    expect(created.ai).toBeDefined();
    expect(created.ai?.mock).toBe(false);
    expect(created.ai?.suggestedTypes).toEqual(['PRIVACY']);
    expect(created.ai?.summaryBullets).toEqual([]);
  });

  // Walks one record to WITH_EA (everything done except the final receipt).
  async function recordWaitingForReceipt() {
    const created = await submitNewIncident(userByRole('STAFF'), {
      answers: {
        q1: '2026-11-07',
        q2: '9:00AM',
        q3: 'Riley Chen',
        q5: 'Main Site',
        q13: 'Less Serious',
        q14: 'No',
        q16: 'No',
        q18: 'Yes',
        q19: ['Privacy/Confidentiality'],
        q32: 'Accidentally emailed a fictional schedule to the wrong external address.',
        q35: 'u_sup_1',
      },
      footageHoldRequested: false,
    });
    const reviewed = await transition(created.id, 'review', userByRole('SUPERVISOR'), {
      confirmedTypes: ['PRIVACY'],
      severity: 'Less Serious',
      seriousBehavioural: false,
      healthCareBeyondFirstAid: false,
      lostTime: false,
      criticalInjury: false,
      correctiveActions: [],
      footageHold: false,
      notes: 'Routing to Privacy Officer.',
    });
    const acked = await transition(created.id, 'ack', userByRole('PRIVACY_OFFICER'), {
      ackId: reviewed.acknowledgements[0].id,
    });
    expect(acked.incident.status).toBe('WITH_EA');
    return created.id;
  }

  it('only executives can confirm receipt and file: every other role gets 403 and the record stays open', async () => {
    const id = await recordWaitingForReceipt();

    for (const role of [
      'STAFF',
      'SUPERVISOR',
      'PRIVACY_OFFICER',
      'JOHSC_CHAIR',
      'IT_FACILITIES',
      'DIRECTOR_OPS',
      'CID_GROUP',
    ]) {
      await expect(transition(id, 'receive', userByRole(role))).rejects.toMatchObject({
        status: 403,
      });
    }

    // Still waiting: nobody got through.
    const stillOpen = await transition(id, 'receive', userByRole('EXEC_ASSISTANT'));
    expect(stillOpen.incident.status).toBe('CLOSED'); // the EA can, which proves it was open
  });

  it('an Executive (and so the ADMIN login, which acts as one) can confirm receipt and file', async () => {
    const id = await recordWaitingForReceipt();
    const closed = await transition(id, 'receive', userByRole('EXECUTIVE'));
    expect(closed.incident.status).toBe('CLOSED');
    expect(closed.incident.closedAt).toBeTruthy();
    expect(closed.events.at(-1)?.actorId).toBe(userByRole('EXECUTIVE').id);
  });

  it('supports back-dated seed timestamps across submit, review, ack, and receive', async () => {
    const staff = userByRole('STAFF');
    const supervisor = userByRole('SUPERVISOR');
    const privacyOfficer = userByRole('PRIVACY_OFFICER');
    const ea = userByRole('EXEC_ASSISTANT');

    const t1 = '2026-09-01T09:00:00.000Z';
    const t2 = '2026-09-01T11:00:00.000Z';
    const t3 = '2026-09-01T14:00:00.000Z';
    const t4 = '2026-09-01T16:00:00.000Z';

    const created = await submitNewIncident(
      staff,
      {
        answers: {
          q1: '2026-09-01',
          q2: '8:30AM',
          q18: 'Yes',
          q19: ['Privacy/Confidentiality'],
          q32: 'Back-dated seed test',
        },
      },
      t1,
    );
    expect(created.createdAt).toBe(t1);

    const reviewed = await transition(
      created.id,
      'review',
      supervisor,
      {
        confirmedTypes: ['PRIVACY'],
        severity: 'Less Serious',
        seriousBehavioural: false,
        healthCareBeyondFirstAid: false,
        lostTime: false,
        criticalInjury: false,
        correctiveActions: [],
        footageHold: false,
        notes: 'Seeded review',
      },
      t2,
    );
    expect(reviewed.reviews[0].submittedAt).toBe(t2);

    const acked = await transition(
      created.id,
      'ack',
      privacyOfficer,
      { ackId: reviewed.acknowledgements[0].id },
      t3,
    );
    expect(acked.acknowledgements[0].ackedAt).toBe(t3);

    const closed = await transition(created.id, 'receive', ea, undefined, t4);
    expect(closed.incident.closedAt).toBe('2026-09-01T16:00:00.001Z');
  });
});

describe('Trends helpers: Monday week formatting & q1/q2 heatmap parsing', () => {
  it('computes Monday YYYY-MM-DD for any day of the week', () => {
    // 2026-11-07 is Saturday -> Monday is 2026-11-02
    expect(toMondayDateStr('2026-11-07T15:00:00.000Z')).toBe('2026-11-02');
    // 2026-11-08 is Sunday -> Monday is 2026-11-02
    expect(toMondayDateStr('2026-11-08T15:00:00.000Z')).toBe('2026-11-02');
  });

  it('parses dow and hour from q1 and q2 instead of createdAt', () => {
    // 2026-10-28 is Wednesday (dow=3), 3:30PM is hour=15
    const res = parseIncidentDowAndHour(
      { q1: '2026-10-28', q2: '3:30PM' },
      '2026-11-07T02:00:00.000Z',
    );
    expect(res).toEqual({ dow: 3, hour: 15 });
  });
});
