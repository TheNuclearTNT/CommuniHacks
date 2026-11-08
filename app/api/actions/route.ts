import { asc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb, schema } from '@/lib/db';
import { handleApiError } from '@/lib/workflow/auth';
import { mapActionRow } from '@/lib/workflow/transition';
import type { Answers, FollowUpAction, IncidentType, Status } from '@/lib/types';

export interface FollowUpListItem extends FollowUpAction {
  site: string;
  types: IncidentType[];
  incidentStatus: Status;
  oneLiner: string;
}

// GET /api/actions — every follow-up action across all records, soonest due
// first, with the record's site, types, status and a one-line summary.
// Feeds the Follow-up board.
export async function GET() {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        action: schema.followUpActions,
        site: schema.incidents.site,
        types: schema.incidents.types,
        incidentStatus: schema.incidents.status,
        answers: schema.incidents.answers,
      })
      .from(schema.followUpActions)
      .innerJoin(schema.incidents, eq(schema.followUpActions.incidentId, schema.incidents.id))
      .orderBy(asc(schema.followUpActions.dueAt));

    const items: FollowUpListItem[] = rows.map((r) => ({
      ...mapActionRow(r.action),
      site: r.site,
      types: (r.types ?? []) as IncidentType[],
      incidentStatus: r.incidentStatus,
      oneLiner: String((r.answers as Answers | null)?.q32 ?? '').slice(0, 140),
    }));
    return NextResponse.json(items);
  } catch (err) {
    return handleApiError(err);
  }
}
