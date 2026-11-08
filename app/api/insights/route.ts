import { subWeeks } from 'date-fns';
import { and, desc, gte, isNull, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateExecutiveInsights } from '@/lib/ai/gemini';
import { getDb, schema } from '@/lib/db';
import { denyIfSignedOut } from '@/lib/portal/guard';
import { handleApiError } from '@/lib/workflow/auth';
import { parseIncidentDowAndHour } from '@/lib/workflow/rules';
import type { Answers } from '@/lib/types';

type Row = Record<string, unknown>;
const extractRows = <T = Row>(res: unknown): T[] =>
  Array.isArray(res) ? (res as T[]) : (((res as { rows?: T[] })?.rows ?? []) as T[]);

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STAGE_LABEL: Record<string, string> = {
  SUBMITTED: 'submitted',
  SUPERVISOR_REVIEW: 'supervisor review',
  SPECIALTY_REVIEW: 'specialty acknowledgement',
  WITH_EA: 'the Executive Assistant',
};

export async function GET(req: Request) {
  try {
    // Trends are for logged-in supervisors / executives only.
    const denied = await denyIfSignedOut();
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const now = new Date();

    const fromParam = searchParams.get('from')?.trim();
    const toParam = searchParams.get('to')?.trim();

    const fromDate =
      fromParam && !Number.isNaN(Date.parse(fromParam))
        ? new Date(fromParam)
        : subWeeks(now, 12);
    const toDate =
      toParam && !Number.isNaN(Date.parse(toParam))
        ? new Date(toParam)
        : now;

    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    const db = await getDb();

    // Fetch aggregate metadata (id, site, types, status, cycle) — never send raw answers to Gemini (B9)
    const [rows, unmetClocks] = await Promise.all([
      db
        .select({
          id: schema.incidents.id,
          site: schema.incidents.site,
          types: schema.incidents.types,
          status: schema.incidents.status,
          cycle: schema.incidents.cycle,
        })
        .from(schema.incidents)
        .where(
          and(
            gte(schema.incidents.createdAt, fromIso),
            lte(schema.incidents.createdAt, toIso),
          ),
        )
        .orderBy(desc(schema.incidents.createdAt)),
      db
        .select({
          incidentId: schema.complianceClocks.incidentId,
          dueAt: schema.complianceClocks.dueAt,
        })
        .from(schema.complianceClocks)
        .where(isNull(schema.complianceClocks.metAt)),
    ]);

    const byTypeMap = new Map<string, string[]>();
    const bySiteMap = new Map<string, string[]>();
    const allowedIncidentIds: string[] = [];
    const awaitingAckIds: string[] = [];
    const reopenedIds: string[] = [];

    for (const row of rows) {
      allowedIncidentIds.push(row.id);
      if (row.status === 'SPECIALTY_REVIEW') awaitingAckIds.push(row.id);
      if (row.cycle > 1) reopenedIds.push(row.id);

      const siteKey = row.site || 'Main Site';
      if (!bySiteMap.has(siteKey)) bySiteMap.set(siteKey, []);
      bySiteMap.get(siteKey)!.push(row.id);

      for (const t of row.types ?? []) {
        if (!byTypeMap.has(t)) byTypeMap.set(t, []);
        byTypeMap.get(t)!.push(row.id);
      }
    }

    const allowedSet = new Set(allowedIncidentIds);
    const overdueClockIds = Array.from(
      new Set(
        unmetClocks
          .filter(
            (c) =>
              allowedSet.has(c.incidentId) &&
              new Date(c.dueAt).getTime() <= toDate.getTime(),
          )
          .map((c) => c.incidentId),
      ),
    );

    // Compute rule-based findings locally from the database (never sent as raw answers to Gemini)
    const ruleBullets: { text: string; incidentIds: string[] }[] = [];
    let ruleFocus: string | undefined;

    try {
      // (a) Behavioural hotspot by site + weekday + afternoon/morning block (using q1/q2 or America/Toronto createdAt)
      const behavRows = extractRows<{
        id: string;
        site: string;
        created_at: string;
        answers: Answers | null;
      }>(
        await db.execute(sql`
          SELECT i.id, i.site, i.created_at, i.answers
          FROM incidents i
          WHERE 'BEHAVIOURAL' = ANY(i.types)
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
          ORDER BY i.created_at ASC
        `),
      );

      const clusterMap = new Map<
        string,
        { site: string; dow: number; pm: boolean; ids: string[]; recent: number; before: number }
      >();
      const cutoff28 = toDate.getTime() - 28 * 86400000;
      const cutoff56 = toDate.getTime() - 56 * 86400000;

      for (const b of behavRows) {
        const { dow, hour } = parseIncidentDowAndHour(b.answers, b.created_at);
        const pm = hour >= 12;
        const key = `${b.site}:::${dow}:::${pm}`;
        const entry = clusterMap.get(key) ?? {
          site: b.site,
          dow,
          pm,
          ids: [],
          recent: 0,
          before: 0,
        };
        entry.ids.push(b.id);
        const ts = new Date(b.created_at).getTime();
        if (ts >= cutoff28) entry.recent += 1;
        else if (ts >= cutoff56) entry.before += 1;
        clusterMap.set(key, entry);
      }

      const hot = Array.from(clusterMap.values()).sort((a, b) => b.ids.length - a.ids.length)[0];
      if (hot && hot.ids.length >= 5) {
        const trend =
          hot.before > 0 && hot.recent >= hot.before * 1.5
            ? `, up from ${hot.before} to ${hot.recent} in the last 4 weeks`
            : '';
        ruleBullets.push({
          text: `Behavioural reports cluster at ${hot.site} on ${DOW[hot.dow]} ${hot.pm ? 'afternoons' : 'mornings'}: ${hot.ids.length} in this period${trend}.`,
          incidentIds: hot.ids,
        });
        ruleFocus = `Look at staffing or check-ins at ${hot.site} on ${DOW[hot.dow]} ${hot.pm ? 'afternoons' : 'mornings'}, and follow up acknowledgements that have waited more than 3 days.`;
      }

      // (b) Fastest-rising injury detail at one site: last 3 weeks vs weeks before
      const rising = extractRows<{
        site: string;
        detail: string;
        ids: string[];
        recent: number;
        before: number;
      }>(
        await db.execute(sql`
          SELECT i.site, d.detail,
                 array_agg(i.id ORDER BY i.created_at) AS ids,
                 COUNT(*) FILTER (WHERE i.created_at >= ${toIso}::timestamptz - interval '21 days')::int AS recent,
                 COUNT(*) FILTER (WHERE i.created_at < ${toIso}::timestamptz - interval '21 days')::int AS before
          FROM incidents i
          CROSS JOIN LATERAL jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(i.answers->'q15') = 'array' THEN i.answers->'q15' ELSE '[]'::jsonb END
          ) AS d(detail)
          WHERE i.created_at >= ${fromIso}::timestamptz AND i.created_at <= ${toIso}::timestamptz
          GROUP BY 1, 2
          HAVING COUNT(*) FILTER (WHERE i.created_at >= ${toIso}::timestamptz - interval '21 days') >= 4
          ORDER BY (COUNT(*) FILTER (WHERE i.created_at >= ${toIso}::timestamptz - interval '21 days'))::float
                 / GREATEST(COUNT(*) FILTER (WHERE i.created_at < ${toIso}::timestamptz - interval '21 days'), 1) DESC
          LIMIT 1
        `),
      )[0];
      if (rising && rising.recent > rising.before) {
        ruleBullets.push({
          text: `${rising.detail} reports at ${rising.site} rose to ${rising.recent} in the last 3 weeks, from ${rising.before} in the weeks before.`,
          incidentIds: rising.ids,
        });
      }

      // (c) Privacy incidents involving misdirected email
      const priv = extractRows<{ total: number; email_ids: string[] | null }>(
        await db.execute(sql`
          SELECT COUNT(*)::int AS total,
                 array_agg(i.id) FILTER (WHERE i.answers->>'q32' ~* '(e-?mail|replied-all|recipient)') AS email_ids
          FROM incidents i
          WHERE 'PRIVACY' = ANY(i.types)
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        `),
      )[0];
      const emailIds = priv?.email_ids ?? [];
      if (priv && priv.total >= 3 && emailIds.length * 2 > priv.total) {
        ruleBullets.push({
          text: `${emailIds.length} of ${priv.total} privacy incidents involved an email sent to the wrong recipient.`,
          incidentIds: emailIds,
        });
      }

      // (d) Slowest pathway stage
      const stages = extractRows<{ stage: string; avg_hours: number }>(
        await db.execute(sql`
          WITH ev AS (
            SELECT e.incident_id, e.cycle, e.to_status AS stage, e.time,
                   LAG(e.to_status) OVER (PARTITION BY e.incident_id, e.cycle ORDER BY e.time) AS prev_stage
            FROM events e
            INNER JOIN incidents i ON e.incident_id = i.id
            WHERE e.to_status IS NOT NULL
              AND i.created_at >= ${fromIso}::timestamptz
              AND i.created_at <= ${toIso}::timestamptz
          ),
          visits AS (
            SELECT stage, time AS entered_at,
                   LEAD(time) OVER (PARTITION BY incident_id, cycle ORDER BY time) AS exited_at
            FROM ev
            WHERE prev_stage IS DISTINCT FROM stage
          )
          SELECT stage, AVG(EXTRACT(EPOCH FROM (exited_at - entered_at)) / 3600.0)::float AS avg_hours
          FROM visits
          WHERE exited_at IS NOT NULL AND stage != 'CLOSED'
          GROUP BY stage
        `),
      )
        .filter((s) => s.stage in STAGE_LABEL)
        .sort((a, b) => Number(b.avg_hours) - Number(a.avg_hours));

      if (stages[0]) {
        const waiting = extractRows<{ id: string }>(
          await db.execute(sql`
            SELECT id FROM incidents
            WHERE status = ${stages[0].stage}
              AND created_at >= ${fromIso}::timestamptz
              AND created_at <= ${toIso}::timestamptz
          `),
        ).map((r) => r.id);
        ruleBullets.push({
          text: `Records wait longest at ${STAGE_LABEL[stages[0].stage]}: about ${(Number(stages[0].avg_hours) / 24).toFixed(1)} days on average. ${waiting.length} are waiting there now.`,
          incidentIds: waiting.length > 0 ? waiting : allowedIncidentIds.slice(0, 3),
        });
      }

      // (e) Overdue compliance clocks
      if (overdueClockIds.length > 0) {
        ruleBullets.push({
          text: `${overdueClockIds.length} records have an overdue reporting clock.`,
          incidentIds: overdueClockIds,
        });
      }
    } catch {
      // Fallback to standard aggregate bullets if any SQL extension fails
    }

    const aggregatesPayload = {
      byType: Array.from(byTypeMap.entries()).map(([type, ids]) => ({
        type,
        count: ids.length,
        sampleIncidentIds: ids.slice(0, 5),
      })),
      bySite: Array.from(bySiteMap.entries()).map(([site, ids]) => ({
        site,
        count: ids.length,
        sampleIncidentIds: ids.slice(0, 5),
      })),
      awaitingAckIds,
      overdueClockIds,
      reopenedIds,
      allowedIncidentIds,
      ruleBullets,
      ruleFocus,
    };

    const insights = await generateExecutiveInsights(aggregatesPayload);
    return NextResponse.json(insights);
  } catch (err) {
    return handleApiError(err);
  }
}
