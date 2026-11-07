import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import type { Role, User } from '@/lib/types';
import { handleApiError } from '@/lib/workflow/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get('role')?.trim() as Role | undefined;

    const db = await getDb();
    const rows = roleFilter
      ? await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.role, roleFilter))
          .orderBy(asc(schema.users.id))
      : await db.select().from(schema.users).orderBy(asc(schema.users.id));

    const users: User[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      ...(r.site ? { site: r.site } : {}),
    }));

    return NextResponse.json(users);
  } catch (err) {
    return handleApiError(err);
  }
}

