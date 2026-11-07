import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { SEED_USERS } from '@/lib/mock/connan';
import type { Role, User } from '@/lib/types';
import { WorkflowError } from './transition';

export function isSeedTimeAllowed(): boolean {
  return String(process.env.ALLOW_SEED_TIME ?? '').toLowerCase() === 'true';
}

/**
 * Returns the timestamp to use for mutations and audit events.
 * When ALLOW_SEED_TIME=true and a valid x-seed-time ISO header is present,
 * uses that timestamp so seed scripts can back-date records across 12 weeks.
 */
export async function getRequestTimestamp(): Promise<Date> {
  if (isSeedTimeAllowed()) {
    try {
      const headerStore = await headers();
      const rawSeedTime = headerStore.get('x-seed-time')?.trim();
      if (rawSeedTime) {
        const parsed = new Date(rawSeedTime);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch {
      // Called outside Next.js request context (e.g. direct unit test)
    }
  }
  return new Date();
}

export async function getCurrentUser(): Promise<User> {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const rawUserId =
    headerStore.get('x-user-id')?.trim() ||
    cookieStore.get('userId')?.value?.trim();
  const rawRole = (headerStore.get('x-role')?.trim() ||
    cookieStore.get('role')?.value?.trim()) as Role | undefined;

  const db = await getDb();

  if (rawUserId) {
    const [dbUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, rawUserId));
    if (dbUser) {
      return {
        id: dbUser.id,
        name: dbUser.name,
        role: dbUser.role,
        ...(dbUser.site ? { site: dbUser.site } : {}),
      };
    }

    const seedUser = SEED_USERS.find((u) => u.id === rawUserId);
    if (seedUser) {
      return seedUser;
    }
  }

  if (rawRole) {
    const [dbByRole] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, rawRole));
    if (dbByRole) {
      return {
        id: dbByRole.id,
        name: dbByRole.name,
        role: dbByRole.role,
        ...(dbByRole.site ? { site: dbByRole.site } : {}),
      };
    }

    const seedByRole = SEED_USERS.find((u) => u.role === rawRole);
    if (seedByRole) return seedByRole;
  }

  // Default to Riley Chen (u_staff_1, STAFF)
  return SEED_USERS[0];
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof WorkflowError) {
    return NextResponse.json(
      {
        error: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
      { status: err.status },
    );
  }

  console.error('[api] Unhandled error:', err);
  return NextResponse.json(
    {
      error: err instanceof Error ? err.message : 'Internal server error',
    },
    { status: 500 },
  );
}
