import { addDays, addHours } from 'date-fns';
import { and, asc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { analyseIncident } from '@/lib/ai/gemini';
import { getDb, nextIncidentId, schema, type AppDatabase } from '@/lib/db';
import { resolveSupervisorId } from '@/lib/mock/connan';
import { canConfirmReceipt } from './receipt-roles';
import type {
  Acknowledgement,
  Answers,
  ComplianceClock,
  FollowUpAction,
  Incident,
  IncidentDetail,
  IncidentEvent,
  IncidentType,
  Role,
  Status,
  SupervisorReview,
  SupervisorReviewInput,
  User,
} from '@/lib/types';
import { buildComplianceClocks } from './clocks';
import { getRequestTimestamp } from './auth';
import {
  deriveTypes,
  extractLocation,
  formatFootageHoldTitle,
  requiredAcks,
} from './rules';

export class WorkflowError extends Error {
  status: 400 | 403 | 404 | 409;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.status = status;
    this.fields = fields;
  }
}

export type TransitionAction =
  | 'submit'
  | 'open'
  | 'review'
  | 'ack'
  | 'receive'
  | 'reopen';

export interface SubmitTransitionInput {
  answers: Answers;
  transcript?: string;
  footageHoldRequested?: boolean;
  // Reporter chose not to attach their identity (TO CONFIRM with Langs).
  anonymous?: boolean;
}

/** Stored as the reporter of an anonymous report instead of a user id. */
export const ANONYMOUS_REPORTER_ID = 'anonymous';

export interface AckTransitionInput {
  ackId?: string;
  comment?: string;
}

export interface ReopenTransitionInput {
  reason: string;
}

function toIso(val: string | Date | null | undefined): string {
  if (!val) return new Date().toISOString();
  return typeof val === 'string' ? new Date(val).toISOString() : val.toISOString();
}

function toOptionalIso(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  return typeof val === 'string' ? new Date(val).toISOString() : val.toISOString();
}

export function mapIncidentRow(
  row: typeof schema.incidents.$inferSelect,
): Incident {
  return {
    id: row.id,
    cycle: row.cycle,
    status: row.status,
    currentOwnerRoles: (row.currentOwnerRoles ?? []) as Role[],
    submittedBy: row.submittedBy,
    supervisorId: row.supervisorId,
    answers: row.answers ?? {},
    ...(row.transcript ? { transcript: row.transcript } : {}),
    ...(row.ai ? { ai: row.ai } : {}),
    footageHoldRequested: Boolean(row.footageHoldRequested),
    createdAt: toIso(row.createdAt),
    closedAt: toOptionalIso(row.closedAt),
  };
}

export function mapReviewRow(
  row: typeof schema.supervisorReviews.$inferSelect,
): SupervisorReview {
  return {
    incidentId: row.incidentId,
    cycle: row.cycle,
    reviewerId: row.reviewerId,
    confirmedTypes: (row.confirmedTypes ?? []) as IncidentType[],
    severity: row.severity,
    seriousBehavioural: Boolean(row.seriousBehavioural),
    healthCareBeyondFirstAid: Boolean(row.healthCareBeyondFirstAid),
    lostTime: Boolean(row.lostTime),
    criticalInjury: Boolean(row.criticalInjury),
    correctiveActions: row.correctiveActions ?? [],
    footageHold: Boolean(row.footageHold),
    notes: row.notes ?? '',
    submittedAt: toIso(row.submittedAt),
  };
}

export function mapAckRow(
  row: typeof schema.acknowledgements.$inferSelect,
): Acknowledgement {
  return {
    id: row.id,
    incidentId: row.incidentId,
    cycle: row.cycle,
    type: row.type,
    role: row.role,
    ackedBy: row.ackedBy ?? null,
    ackedAt: toOptionalIso(row.ackedAt),
    ...(row.comment ? { comment: row.comment } : {}),
    toConfirm: Boolean(row.toConfirm),
  };
}

export function mapActionRow(
  row: typeof schema.followUpActions.$inferSelect,
): FollowUpAction {
  return {
    id: row.id,
    incidentId: row.incidentId,
    title: row.title,
    ownerRole: row.ownerRole,
    dueAt: toIso(row.dueAt),
    status: row.status,
    completedAt: toOptionalIso(row.completedAt),
    kind: row.kind,
  };
}

export function mapClockRow(
  row: typeof schema.complianceClocks.$inferSelect,
): ComplianceClock {
  return {
    id: row.id,
    incidentId: row.incidentId,
    kind: row.kind,
    startedAt: toIso(row.startedAt),
    dueAt: toIso(row.dueAt),
    metAt: toOptionalIso(row.metAt),
  };
}

export function mapEventRow(
  row: typeof schema.events.$inferSelect,
): IncidentEvent {
  return {
    time: toIso(row.time),
    incidentId: row.incidentId,
    cycle: row.cycle,
    actorId: row.actorId,
    kind: row.kind,
    ...(row.fromStatus ? { fromStatus: row.fromStatus } : {}),
    ...(row.toStatus ? { toStatus: row.toStatus } : {}),
    ...(row.payload ? { payload: row.payload } : {}),
  };
}

export async function getIncidentDetail(
  incidentId: string,
  dbOrTx?: AppDatabase,
): Promise<IncidentDetail> {
  const db = dbOrTx ?? (await getDb());

  const [incidentRow] = await db
    .select()
    .from(schema.incidents)
    .where(eq(schema.incidents.id, incidentId));

  if (!incidentRow) {
    throw new WorkflowError(`Incident ${incidentId} not found`, 404);
  }

  const [reviewRows, ackRows, actionRows, clockRows, eventRows] = await Promise.all([
    db
      .select()
      .from(schema.supervisorReviews)
      .where(eq(schema.supervisorReviews.incidentId, incidentId))
      .orderBy(asc(schema.supervisorReviews.cycle)),
    db
      .select()
      .from(schema.acknowledgements)
      .where(eq(schema.acknowledgements.incidentId, incidentId))
      .orderBy(asc(schema.acknowledgements.cycle), asc(schema.acknowledgements.id)),
    db
      .select()
      .from(schema.followUpActions)
      .where(eq(schema.followUpActions.incidentId, incidentId))
      .orderBy(asc(schema.followUpActions.dueAt)),
    db
      .select()
      .from(schema.complianceClocks)
      .where(eq(schema.complianceClocks.incidentId, incidentId))
      .orderBy(asc(schema.complianceClocks.dueAt)),
    db
      .select()
      .from(schema.events)
      .where(eq(schema.events.incidentId, incidentId))
      .orderBy(asc(schema.events.time)),
  ]);

  return {
    incident: mapIncidentRow(incidentRow),
    reviews: reviewRows.map(mapReviewRow),
    acknowledgements: ackRows.map(mapAckRow),
    actions: actionRows.map(mapActionRow),
    clocks: clockRows.map(mapClockRow),
    events: eventRows.map(mapEventRow),
  };
}

/**
 * Submits a new incident report, runs Gemini analysis (with fallback), and records the SUBMITTED event.
 */
export async function submitNewIncident(
  actor: User,
  input: SubmitTransitionInput,
  nowOverride?: Date | string,
): Promise<Incident> {
  if (!input || typeof input.answers !== 'object' || input.answers === null) {
    throw new WorkflowError('answers object is required', 400, {
      answers: 'Required',
    });
  }

  const baseNow = nowOverride
    ? new Date(nowOverride)
    : await getRequestTimestamp();
  const now = baseNow.toISOString();

  // Anonymous: no user id anywhere on the record, and q3 says so.
  const reporterId = input.anonymous ? ANONYMOUS_REPORTER_ID : actor.id;
  if (input.anonymous) {
    input = { ...input, answers: { ...input.answers, q3: 'Anonymous' } };
  }

  const rawAi = await analyseIncident(input.answers, input.transcript);
  const ai = {
    ...rawAi,
    generatedAt: now,
  };
  const db = await getDb();

  return db.transaction(async (tx) => {
    const id = await nextIncidentId(tx as unknown as AppDatabase);
    const supervisorId = resolveSupervisorId(input.answers.q35);
    const site = extractLocation(input.answers);
    const derived = deriveTypes(input.answers);
    const types = ai.suggestedTypes.length > 0 ? ai.suggestedTypes : derived;
    const rawSeverity = input.answers.q13;
    const severity =
      rawSeverity === 'Critical' ||
      rawSeverity === 'Less Serious' ||
      rawSeverity === 'Unsure'
        ? rawSeverity
        : 'Unsure';

    const [inserted] = await tx
      .insert(schema.incidents)
      .values({
        id,
        cycle: 1,
        status: 'SUBMITTED',
        currentOwnerRoles: ['SUPERVISOR'],
        submittedBy: reporterId,
        supervisorId,
        answers: input.answers,
        transcript: input.transcript ?? null,
        ai,
        footageHoldRequested: Boolean(input.footageHoldRequested),
        createdAt: now,
        closedAt: null,
        site,
        types,
        severity,
      })
      .returning();

    await tx.insert(schema.events).values({
      time: now,
      incidentId: id,
      cycle: 1,
      actorId: reporterId,
      kind: 'SUBMITTED',
      toStatus: 'SUBMITTED',
      payload: {
        suggestedTypes: types,
        footageHoldRequested: Boolean(input.footageHoldRequested),
        anonymous: Boolean(input.anonymous),
      },
    });

    return mapIncidentRow(inserted);
  });
}

function validateReviewInput(input: unknown): SupervisorReviewInput {
  if (!input || typeof input !== 'object') {
    throw new WorkflowError('Invalid supervisor review payload', 400, {
      body: 'Expected object',
    });
  }
  const raw = input as Partial<SupervisorReviewInput>;
  const fields: Record<string, string> = {};

  if (!Array.isArray(raw.confirmedTypes)) {
    fields.confirmedTypes = 'confirmedTypes must be an array of IncidentType';
  }
  if (
    raw.severity !== 'Critical' &&
    raw.severity !== 'Less Serious' &&
    raw.severity !== 'Unsure'
  ) {
    fields.severity = 'severity must be Critical, Less Serious, or Unsure';
  }
  if (Object.keys(fields).length > 0) {
    throw new WorkflowError('Invalid supervisor review fields', 400, fields);
  }

  return {
    confirmedTypes: raw.confirmedTypes!,
    severity: raw.severity!,
    seriousBehavioural: Boolean(raw.seriousBehavioural),
    healthCareBeyondFirstAid: Boolean(raw.healthCareBeyondFirstAid),
    lostTime: Boolean(raw.lostTime),
    criticalInjury: Boolean(raw.criticalInjury),
    correctiveActions: Array.isArray(raw.correctiveActions)
      ? raw.correctiveActions
      : [],
    footageHold: Boolean(raw.footageHold),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  };
}

/**
 * The single state-machine entry point for all incident transitions (B5).
 * Runs inside a DB transaction, enforces allowed moves (409) and roles (403),
 * writes audit events, and updates current_owner_roles.
 */
export async function transition(
  incidentId: string,
  action: TransitionAction,
  actor: User,
  input?:
    | SubmitTransitionInput
    | SupervisorReviewInput
    | AckTransitionInput
    | ReopenTransitionInput,
  nowOverride?: Date | string,
): Promise<IncidentDetail> {
  const resolvedNow = nowOverride
    ? new Date(nowOverride)
    : await getRequestTimestamp();

  if (action === 'submit') {
    const created = await submitNewIncident(
      actor,
      input as SubmitTransitionInput,
      resolvedNow,
    );
    return getIncidentDetail(created.id);
  }

  const db = await getDb();

  await db.transaction(async (tx) => {
    const [incident] = await tx
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.id, incidentId));

    if (!incident) {
      throw new WorkflowError(`Incident ${incidentId} not found`, 404);
    }

    const baseNow = resolvedNow;

    if (action === 'open') {
      if (actor.role !== 'SUPERVISOR') {
        throw new WorkflowError(
          `Role ${actor.role} is not permitted to open Supervisor Review (requires SUPERVISOR)`,
          403,
        );
      }
      if (incident.status !== 'SUBMITTED' && incident.status !== 'REOPENED') {
        throw new WorkflowError(
          `Cannot open incident from status ${incident.status} (must be SUBMITTED or REOPENED)`,
          409,
        );
      }

      const nowIso = baseNow.toISOString();
      await tx
        .update(schema.incidents)
        .set({
          status: 'SUPERVISOR_REVIEW',
          currentOwnerRoles: ['SUPERVISOR'],
        })
        .where(eq(schema.incidents.id, incidentId));

      await tx.insert(schema.events).values({
        time: nowIso,
        incidentId,
        cycle: incident.cycle,
        actorId: actor.id,
        kind: 'OPENED',
        fromStatus: incident.status,
        toStatus: 'SUPERVISOR_REVIEW',
      });
      return;
    }

    if (action === 'review') {
      if (actor.role !== 'SUPERVISOR') {
        throw new WorkflowError(
          `Role ${actor.role} is not permitted to submit a Supervisor Review (requires SUPERVISOR)`,
          403,
        );
      }

      // B5: If a supervisor submits a review on a SUBMITTED (or REOPENED) record, run `open` first implicitly
      if (incident.status === 'SUBMITTED' || incident.status === 'REOPENED') {
        const openTimeIso = new Date(baseNow.getTime() - 2).toISOString();
        await tx
          .update(schema.incidents)
          .set({
            status: 'SUPERVISOR_REVIEW',
            currentOwnerRoles: ['SUPERVISOR'],
          })
          .where(eq(schema.incidents.id, incidentId));

        await tx.insert(schema.events).values({
          time: openTimeIso,
          incidentId,
          cycle: incident.cycle,
          actorId: actor.id,
          kind: 'OPENED',
          fromStatus: incident.status,
          toStatus: 'SUPERVISOR_REVIEW',
          payload: { implicitOpen: true },
        });
      } else if (incident.status !== 'SUPERVISOR_REVIEW') {
        throw new WorkflowError(
          `Cannot submit Supervisor Review when incident is in status ${incident.status}`,
          409,
        );
      }

      const reviewInput = validateReviewInput(input);
      const reviewSubmittedAt = baseNow.toISOString();
      const routedEventAt = new Date(baseNow.getTime() + 1).toISOString();

      // Save supervisor review (upsert on incident_id + cycle in case of retry)
      await tx
        .insert(schema.supervisorReviews)
        .values({
          id: `rev_${incidentId}_c${incident.cycle}`,
          incidentId,
          cycle: incident.cycle,
          reviewerId: actor.id,
          confirmedTypes: reviewInput.confirmedTypes,
          severity: reviewInput.severity,
          seriousBehavioural: reviewInput.seriousBehavioural,
          healthCareBeyondFirstAid: reviewInput.healthCareBeyondFirstAid,
          lostTime: reviewInput.lostTime,
          criticalInjury: reviewInput.criticalInjury,
          correctiveActions: reviewInput.correctiveActions,
          footageHold: reviewInput.footageHold,
          notes: reviewInput.notes,
          submittedAt: reviewSubmittedAt,
        })
        .onConflictDoUpdate({
          target: [schema.supervisorReviews.incidentId, schema.supervisorReviews.cycle],
          set: {
            reviewerId: actor.id,
            confirmedTypes: reviewInput.confirmedTypes,
            severity: reviewInput.severity,
            seriousBehavioural: reviewInput.seriousBehavioural,
            healthCareBeyondFirstAid: reviewInput.healthCareBeyondFirstAid,
            lostTime: reviewInput.lostTime,
            criticalInjury: reviewInput.criticalInjury,
            correctiveActions: reviewInput.correctiveActions,
            footageHold: reviewInput.footageHold,
            notes: reviewInput.notes,
            submittedAt: reviewSubmittedAt,
          },
        });

      // Compute required acknowledgements for this cycle
      const ackSpecs = requiredAcks(reviewInput);
      for (const spec of ackSpecs) {
        await tx.insert(schema.acknowledgements).values({
          id: `ack_${incidentId}_c${incident.cycle}_${spec.role.toLowerCase()}`,
          incidentId,
          cycle: incident.cycle,
          type: spec.type,
          role: spec.role,
          ackedBy: null,
          ackedAt: null,
          comment: null,
          toConfirm: spec.toConfirm,
        });
      }

      // Create corrective follow-up actions
      for (const ca of reviewInput.correctiveActions) {
        await tx.insert(schema.followUpActions).values({
          id: `act_${randomUUID().slice(0, 8)}`,
          incidentId,
          title: ca.title,
          ownerRole: ca.ownerRole,
          dueAt: ca.dueAt || addDays(baseNow, 7).toISOString(),
          status: 'NOT_STARTED',
          completedAt: null,
          kind: 'CORRECTIVE',
        });
      }

      // Create footage-hold follow-up action if requested (A3.8 & B5)
      const wantsFootageHold =
        reviewInput.footageHold || Boolean(incident.footageHoldRequested);
      if (wantsFootageHold) {
        const existingActions = await tx
          .select()
          .from(schema.followUpActions)
          .where(eq(schema.followUpActions.incidentId, incidentId));
        const alreadyHasFootageHold = existingActions.some(
          (a) => a.kind === 'FOOTAGE_HOLD',
        );
        if (!alreadyHasFootageHold) {
          await tx.insert(schema.followUpActions).values({
            id: `act_fh_${incidentId.toLowerCase().replace(/[^a-z0-9]/g, '')}_c${incident.cycle}`,
            incidentId,
            title: formatFootageHoldTitle(incident.answers ?? {}),
            ownerRole: 'IT_FACILITIES',
            dueAt: addHours(baseNow, 24).toISOString(),
            status: 'NOT_STARTED',
            completedAt: null,
            kind: 'FOOTAGE_HOLD',
          });
        }
      }

      // Create compliance clocks (A3.7 & B7)
      const clockSpecs = buildComplianceClocks(reviewInput, baseNow);
      for (const clk of clockSpecs) {
        await tx.insert(schema.complianceClocks).values({
          id: `clk_${incidentId}_c${incident.cycle}_${clk.kind.toLowerCase()}`,
          incidentId,
          kind: clk.kind,
          startedAt: clk.startedAt,
          dueAt: clk.dueAt,
          metAt: null,
        });
      }

      const nextStatus: Status =
        ackSpecs.length > 0 ? 'SPECIALTY_REVIEW' : 'WITH_EA';
      const nextOwnerRoles: Role[] =
        ackSpecs.length > 0
          ? Array.from(new Set(ackSpecs.map((a) => a.role)))
          : ['EXEC_ASSISTANT'];

      await tx
        .update(schema.incidents)
        .set({
          status: nextStatus,
          currentOwnerRoles: nextOwnerRoles,
          types: reviewInput.confirmedTypes,
          severity: reviewInput.severity,
          footageHoldRequested: wantsFootageHold,
        })
        .where(eq(schema.incidents.id, incidentId));

      await tx.insert(schema.events).values([
        {
          time: reviewSubmittedAt,
          incidentId,
          cycle: incident.cycle,
          actorId: actor.id,
          kind: 'REVIEW_SUBMITTED',
          fromStatus: 'SUPERVISOR_REVIEW',
          toStatus: nextStatus,
          payload: {
            confirmedTypes: reviewInput.confirmedTypes,
            severity: reviewInput.severity,
            clocksCreated: clockSpecs.map((c) => c.kind),
          },
        },
        {
          time: routedEventAt,
          incidentId,
          cycle: incident.cycle,
          actorId: actor.id,
          kind: 'ROUTED',
          fromStatus: 'SUPERVISOR_REVIEW',
          toStatus: nextStatus,
          payload: {
            requiredRoles: nextOwnerRoles,
          },
        },
      ]);
      return;
    }

    if (action === 'ack') {
      if (incident.status !== 'SPECIALTY_REVIEW') {
        throw new WorkflowError(
          `Cannot acknowledge incident in status ${incident.status} (must be SPECIALTY_REVIEW)`,
          409,
        );
      }

      const ackInput = (input ?? {}) as AckTransitionInput;
      const cycleAcks = await tx
        .select()
        .from(schema.acknowledgements)
        .where(
          and(
            eq(schema.acknowledgements.incidentId, incidentId),
            eq(schema.acknowledgements.cycle, incident.cycle),
          ),
        )
        .orderBy(asc(schema.acknowledgements.id));

      let targetAck = ackInput.ackId
        ? cycleAcks.find((a) => a.id === ackInput.ackId)
        : undefined;

      // If ackId wasn't found by exact ID, try matching by actor's role in current cycle
      if (!targetAck) {
        if (ackInput.ackId) {
          // Check if ackId was specified as a role name (e.g. "PRIVACY_OFFICER")
          targetAck = cycleAcks.find(
            (a) => a.role.toLowerCase() === ackInput.ackId?.toLowerCase(),
          );
        }
        if (!targetAck) {
          targetAck = cycleAcks.find((a) => a.role === actor.role);
        }
      }

      if (!targetAck) {
        throw new WorkflowError(
          `Role ${actor.role} does not have a required acknowledgement for incident ${incidentId}`,
          403,
        );
      }

      if (targetAck.role !== actor.role) {
        throw new WorkflowError(
          `Acknowledgement ${targetAck.id} requires role ${targetAck.role}, but current user has role ${actor.role}`,
          403,
        );
      }

      if (targetAck.ackedAt) {
        throw new WorkflowError(
          `Acknowledgement for role ${targetAck.role} has already been completed in cycle ${incident.cycle}`,
          409,
        );
      }

      const ackedAtIso = baseNow.toISOString();
      await tx
        .update(schema.acknowledgements)
        .set({
          ackedBy: actor.id,
          ackedAt: ackedAtIso,
          comment: ackInput.comment ?? null,
        })
        .where(eq(schema.acknowledgements.id, targetAck.id));

      const remainingUnacked = cycleAcks.filter(
        (a) => a.id !== targetAck!.id && !a.ackedAt,
      );

      const nextStatus: Status =
        remainingUnacked.length === 0 ? 'WITH_EA' : 'SPECIALTY_REVIEW';
      const nextOwnerRoles: Role[] =
        remainingUnacked.length === 0
          ? ['EXEC_ASSISTANT']
          : Array.from(new Set(remainingUnacked.map((a) => a.role)));

      await tx
        .update(schema.incidents)
        .set({
          status: nextStatus,
          currentOwnerRoles: nextOwnerRoles,
        })
        .where(eq(schema.incidents.id, incidentId));

      await tx.insert(schema.events).values({
        time: ackedAtIso,
        incidentId,
        cycle: incident.cycle,
        actorId: actor.id,
        kind: 'ACKNOWLEDGED',
        fromStatus: 'SPECIALTY_REVIEW',
        toStatus: nextStatus,
        payload: {
          ackId: targetAck.id,
          role: targetAck.role,
          type: targetAck.type,
          ...(ackInput.comment ? { comment: ackInput.comment } : {}),
        },
      });
      return;
    }

    if (action === 'receive') {
      if (!canConfirmReceipt(actor.role)) {
        throw new WorkflowError(
          `Role ${actor.role} is not permitted to confirm final receipt (executives only: requires EXEC_ASSISTANT or EXECUTIVE)`,
          403,
        );
      }
      if (incident.status !== 'WITH_EA') {
        throw new WorkflowError(
          `Cannot confirm receipt when incident is in status ${incident.status} (must be WITH_EA)`,
          409,
        );
      }

      const receivedAtIso = baseNow.toISOString();
      const closedAtIso = new Date(baseNow.getTime() + 1).toISOString();

      await tx
        .update(schema.incidents)
        .set({
          status: 'CLOSED',
          closedAt: closedAtIso,
          currentOwnerRoles: [],
        })
        .where(eq(schema.incidents.id, incidentId));

      await tx.insert(schema.events).values([
        {
          time: receivedAtIso,
          incidentId,
          cycle: incident.cycle,
          actorId: actor.id,
          kind: 'EA_RECEIVED',
          fromStatus: 'WITH_EA',
          toStatus: 'CLOSED',
        },
        {
          time: closedAtIso,
          incidentId,
          cycle: incident.cycle,
          actorId: actor.id,
          kind: 'CLOSED',
          fromStatus: 'WITH_EA',
          toStatus: 'CLOSED',
        },
      ]);
      return;
    }

    if (action === 'reopen') {
      if (actor.role !== 'SUPERVISOR' && actor.role !== 'EXEC_ASSISTANT') {
        throw new WorkflowError(
          `Role ${actor.role} is not permitted to reopen a closed record (requires SUPERVISOR or EXEC_ASSISTANT)`,
          403,
        );
      }
      if (incident.status !== 'CLOSED') {
        throw new WorkflowError(
          `Cannot reopen incident from status ${incident.status} (must be CLOSED)`,
          409,
        );
      }

      const reopenInput = (input ?? {}) as Partial<ReopenTransitionInput>;
      const reason =
        typeof reopenInput.reason === 'string' ? reopenInput.reason.trim() : '';
      if (!reason) {
        throw new WorkflowError('A reason is required to reopen an incident', 400, {
          reason: 'Required',
        });
      }

      const newCycle = incident.cycle + 1;
      const reopenedAtIso = baseNow.toISOString();

      await tx
        .update(schema.incidents)
        .set({
          cycle: newCycle,
          status: 'REOPENED',
          closedAt: null,
          currentOwnerRoles: ['SUPERVISOR'],
        })
        .where(eq(schema.incidents.id, incidentId));

      await tx.insert(schema.followUpActions).values({
        id: `act_reopen_${incidentId.toLowerCase().replace(/[^a-z0-9]/g, '')}_c${newCycle}`,
        incidentId,
        title: reason,
        ownerRole: 'SUPERVISOR',
        dueAt: addDays(baseNow, 7).toISOString(),
        status: 'NOT_STARTED',
        completedAt: null,
        kind: 'REOPEN_NOTE',
      });

      await tx.insert(schema.events).values({
        time: reopenedAtIso,
        incidentId,
        cycle: newCycle,
        actorId: actor.id,
        kind: 'REOPENED',
        fromStatus: 'CLOSED',
        toStatus: 'REOPENED',
        payload: { reason },
      });
      return;
    }

    throw new WorkflowError(`Unsupported transition action: ${String(action)}`, 400);
  });

  return getIncidentDetail(incidentId, db);
}

