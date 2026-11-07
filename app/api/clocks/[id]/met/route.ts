import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import {
  getCurrentUser,
  getRequestTimestamp,
  handleApiError,
} from '@/lib/workflow/auth';
import { mapClockRow, WorkflowError } from '@/lib/workflow/transition';

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const db = await getDb();
    const nowIso = (await getRequestTimestamp()).toISOString();

    return await db.transaction(async (tx) => {
      const [clock] = await tx
        .select()
        .from(schema.complianceClocks)
        .where(eq(schema.complianceClocks.id, id));

      if (!clock) {
        throw new WorkflowError(`Compliance clock ${id} not found`, 404);
      }

      const [updated] = await tx
        .update(schema.complianceClocks)
        .set({ metAt: nowIso })
        .where(eq(schema.complianceClocks.id, id))
        .returning();

      const [inc] = await tx
        .select({ cycle: schema.incidents.cycle })
        .from(schema.incidents)
        .where(eq(schema.incidents.id, clock.incidentId));

      await tx.insert(schema.events).values({
        time: nowIso,
        incidentId: clock.incidentId,
        cycle: inc?.cycle ?? 1,
        actorId: me.id,
        kind: 'CLOCK_MET',
        payload: {
          clockId: id,
          kind: clock.kind,
        },
      });

      return NextResponse.json(mapClockRow(updated));
    });
  } catch (err) {
    return handleApiError(err);
  }
}

