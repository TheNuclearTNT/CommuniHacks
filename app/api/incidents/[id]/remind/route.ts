import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { getCurrentUser, getRequestTimestamp, handleApiError } from '@/lib/workflow/auth';
import { WorkflowError } from '@/lib/workflow/transition';
import type { Role } from '@/lib/types';

// POST /api/incidents/:id/remind  { toRole, about }
// Records a reminder on the record's history (a NOTE event). Prototype: no
// email or message is actually sent — the UI says so.
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser();
    const body = (await req.json().catch(() => ({}))) as { toRole?: Role; about?: string };
    if (!body.toRole) {
      throw new WorkflowError('toRole is required', 400, { toRole: 'Required' });
    }

    const db = await getDb();
    const [incident] = await db
      .select({ cycle: schema.incidents.cycle })
      .from(schema.incidents)
      .where(eq(schema.incidents.id, id));
    if (!incident) throw new WorkflowError(`Incident ${id} not found`, 404);

    const time = (await getRequestTimestamp()).toISOString();
    await db.insert(schema.events).values({
      time,
      incidentId: id,
      cycle: incident.cycle,
      actorId: me.id,
      kind: 'NOTE',
      payload: { reminder: true, toRole: body.toRole, about: body.about ?? '' },
    });
    return NextResponse.json({ ok: true, time });
  } catch (err) {
    return handleApiError(err);
  }
}
