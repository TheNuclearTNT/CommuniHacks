import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema, seedBaseUsers } from '@/lib/db';
import { handleApiError, isSeedTimeAllowed } from '@/lib/workflow/auth';
import { WorkflowError } from '@/lib/workflow/transition';

export async function POST() {
  try {
    if (!isSeedTimeAllowed()) {
      throw new WorkflowError(
        'POST /api/dev/reset-demo requires ALLOW_SEED_TIME=true',
        403,
      );
    }

    const db = await getDb();

    await db.transaction(async (tx) => {
      await tx.delete(schema.events);
      await tx.delete(schema.complianceClocks);
      await tx.delete(schema.followUpActions);
      await tx.delete(schema.acknowledgements);
      await tx.delete(schema.supervisorReviews);
      await tx.delete(schema.incidents);
      await tx.execute(sql`ALTER SEQUENCE incident_id_seq RESTART WITH 1`);
    });

    await seedBaseUsers(db);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

