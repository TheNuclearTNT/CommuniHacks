import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import type { FollowUpAction } from '@/lib/types';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import {
  mapActionRow,
  WorkflowError,
} from '@/lib/workflow/transition';

const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const;

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const body = (await req.json().catch(() => ({}))) as {
      status?: FollowUpAction['status'];
    };

    const status = body.status;
    if (!status || !VALID_STATUSES.includes(status)) {
      throw new WorkflowError(
        'status must be NOT_STARTED, IN_PROGRESS, or DONE',
        400,
        { status: 'Must be NOT_STARTED, IN_PROGRESS, or DONE' },
      );
    }

    const db = await getDb();
    const nowIso = new Date().toISOString();

    return await db.transaction(async (tx) => {
      const [existingAction] = await tx
        .select()
        .from(schema.followUpActions)
        .where(eq(schema.followUpActions.id, id));

      if (existingAction) {
        const completedAt = status === 'DONE' ? nowIso : null;
        const [updated] = await tx
          .update(schema.followUpActions)
          .set({
            status,
            completedAt,
          })
          .where(eq(schema.followUpActions.id, id))
          .returning();

        const [inc] = await tx
          .select({ cycle: schema.incidents.cycle })
          .from(schema.incidents)
          .where(eq(schema.incidents.id, existingAction.incidentId));

        await tx.insert(schema.events).values({
          time: nowIso,
          incidentId: existingAction.incidentId,
          cycle: inc?.cycle ?? 1,
          actorId: me.id,
          kind: 'ACTION_UPDATED',
          payload: {
            actionId: id,
            status,
            title: existingAction.title,
          },
        });

        return NextResponse.json(mapActionRow(updated));
      }

      // B7: Also support marking a compliance clock met via PATCH /api/actions/:clockId
      const [existingClock] = await tx
        .select()
        .from(schema.complianceClocks)
        .where(eq(schema.complianceClocks.id, id));

      if (existingClock) {
        const metAt = status === 'DONE' ? nowIso : null;
        await tx
          .update(schema.complianceClocks)
          .set({ metAt })
          .where(eq(schema.complianceClocks.id, id));

        const [inc] = await tx
          .select({ cycle: schema.incidents.cycle })
          .from(schema.incidents)
          .where(eq(schema.incidents.id, existingClock.incidentId));

        if (status === 'DONE') {
          await tx.insert(schema.events).values({
            time: nowIso,
            incidentId: existingClock.incidentId,
            cycle: inc?.cycle ?? 1,
            actorId: me.id,
            kind: 'CLOCK_MET',
            payload: {
              clockId: id,
              kind: existingClock.kind,
            },
          });
        }

        const mirrored: FollowUpAction = {
          id: existingClock.id,
          incidentId: existingClock.incidentId,
          title: `Compliance clock: ${existingClock.kind}`,
          ownerRole: 'SUPERVISOR',
          dueAt: new Date(existingClock.dueAt).toISOString(),
          status,
          completedAt: metAt,
          kind: 'CORRECTIVE',
        };
        return NextResponse.json(mirrored);
      }

      throw new WorkflowError(`Follow-up action ${id} not found`, 404);
    });
  } catch (err) {
    return handleApiError(err);
  }
}

