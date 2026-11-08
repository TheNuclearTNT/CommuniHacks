import { and, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { handleApiError } from '@/lib/workflow/auth';
import { WorkflowError } from '@/lib/workflow/transition';
import type { Answers, IncidentType, Status } from '@/lib/types';

const WINDOW_DAYS = 28;

export interface SimilarIncidentsResponse {
  site: string;
  windowDays: number;
  items: { id: string; createdAt: string; types: IncidentType[]; status: Status; oneLiner: string }[];
}

// GET /api/incidents/:id/similar — other reports from the same site sharing
// an incident type in the 4 weeks before this one. Plain rules, no AI.
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await getDb();
    const [incident] = await db
      .select({ site: schema.incidents.site, types: schema.incidents.types, createdAt: schema.incidents.createdAt })
      .from(schema.incidents)
      .where(eq(schema.incidents.id, id));
    if (!incident) throw new WorkflowError(`Incident ${id} not found`, 404);

    const until = new Date(incident.createdAt);
    const from = new Date(until.getTime() - WINDOW_DAYS * 86_400_000);
    const rows = await db
      .select({
        id: schema.incidents.id,
        createdAt: schema.incidents.createdAt,
        types: schema.incidents.types,
        status: schema.incidents.status,
        answers: schema.incidents.answers,
      })
      .from(schema.incidents)
      .where(
        and(
          eq(schema.incidents.site, incident.site),
          ne(schema.incidents.id, id),
          gte(schema.incidents.createdAt, from.toISOString()),
          lte(schema.incidents.createdAt, until.toISOString()),
        ),
      )
      .orderBy(desc(schema.incidents.createdAt));

    const mine = new Set(incident.types ?? []);
    const body: SimilarIncidentsResponse = {
      site: incident.site,
      windowDays: WINDOW_DAYS,
      items: rows
        .filter((r) => (r.types ?? []).some((t) => mine.has(t)))
        .map((r) => ({
          id: r.id,
          createdAt: new Date(r.createdAt).toISOString(),
          types: (r.types ?? []) as IncidentType[],
          status: r.status,
          oneLiner: String((r.answers as Answers | null)?.q32 ?? '').slice(0, 120),
        })),
    };
    return NextResponse.json(body);
  } catch (err) {
    return handleApiError(err);
  }
}
