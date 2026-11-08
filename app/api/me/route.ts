import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { SEED_USERS } from '@/lib/mock/connan';
import { getCurrentUser, handleApiError } from '@/lib/workflow/auth';
import { WorkflowError } from '@/lib/workflow/transition';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json(user);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

    if (!userId) {
      throw new WorkflowError('userId is required', 400, { userId: 'Required' });
    }

    const db = await getDb();
    const [dbUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    const user =
      dbUser
        ? {
            id: dbUser.id,
            name: dbUser.name,
            role: dbUser.role,
            ...(dbUser.site ? { site: dbUser.site } : {}),
          }
        : SEED_USERS.find((u) => u.id === userId);

    if (!user) {
      throw new WorkflowError(`Unknown userId: ${userId}`, 400, {
        userId: 'User not found',
      });
    }

    const cookieStore = await cookies();
    cookieStore.set('userId', user.id, { path: '/', httpOnly: false });
    cookieStore.set('role', user.role, { path: '/', httpOnly: false });
    // NOTE: this no longer sets the old `portal` flag. Picking a persona must not
    // open the supervisor / executive side; only /api/portal-login does that.

    return NextResponse.json(user);
  } catch (err) {
    return handleApiError(err);
  }
}

