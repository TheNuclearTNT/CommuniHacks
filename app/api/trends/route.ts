import { endOfMonth, startOfMonth, subMonths, subWeeks } from 'date-fns';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Answers, IncidentType, Status, TrendsResponse } from '@/lib/types';
import { handleApiError } from '@/lib/workflow/auth';
import {
  deriveTypes,
  extractLocation,
  parseIncidentDowAndHour,
  toMondayDateStr,
} from '@/lib/workflow/rules';

const VALID_TYPES: Set<IncidentType> = new Set([
  'PRIVACY',
  'STAFF_INJURY',
  'FACILITIES',
  'IT_CYBER',
  'BEHAVIOURAL',
  'CID',
]);

const STAGE_ORDER: Status[] = [
  'SUBMITTED',
  'SUPERVISOR_REVIEW',
  'SPECIALTY_REVIEW',
  'WITH_EA',
  'REOPENED',
];

function extractRows<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === 'object' && 'rows' in res) {
    return ((res as { rows?: T[] }).rows ?? []) as T[];
  }
  return [];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();

    const fromParam = searchParams.get('from')?.trim();
    const toParam = searchParams.get('to')?.trim();
    const rawSite = searchParams.get('site')?.trim();
    const siteFilter =
      rawSite && rawSite.toLowerCase() !== 'all' ? rawSite : undefined;

    // B9: Omitted = all sites, last 12 weeks
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

    const thisMonthStartIso = startOfMonth(toDate).toISOString();
    const lastMonthDate = subMonths(toDate, 1);
    const lastMonthStartIso = startOfMonth(lastMonthDate).toISOString();
    const lastMonthEndIso = endOfMonth(lastMonthDate).toISOString();

    const db = await getDb();

    const siteClause = siteFilter
      ? sql`AND LOWER(i.site) = LOWER(${siteFilter})`
      : sql``;

    // 1. Totals query (filtered by from, to, and site)
    const totalsRes = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (
          WHERE i.created_at >= ${thisMonthStartIso}::timestamptz
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS this_month,
        COUNT(*) FILTER (
          WHERE i.created_at >= ${lastMonthStartIso}::timestamptz
            AND i.created_at <= ${lastMonthEndIso}::timestamptz
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS last_month,
        COUNT(*) FILTER (
          WHERE i.status != 'CLOSED'
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS open_count,
        COUNT(*) FILTER (
          WHERE i.status = 'SPECIALTY_REVIEW'
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS awaiting_ack,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (i.closed_at - i.created_at)) / 86400.0) FILTER (
            WHERE i.closed_at IS NOT NULL
              AND i.created_at >= ${fromIso}::timestamptz
              AND i.created_at <= ${toIso}::timestamptz
          ),
          0
        )::float AS avg_days_to_close,
        COUNT(*) FILTER (
          WHERE i.cycle > 1
            AND i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS reopened_count,
        COUNT(*) FILTER (
          WHERE i.created_at >= ${fromIso}::timestamptz
            AND i.created_at <= ${toIso}::timestamptz
        )::int AS total_in_window
      FROM incidents i
      WHERE 1 = 1 ${siteClause}
    `);

    const totalsRow = extractRows<{
      this_month: number;
      last_month: number;
      open_count: number;
      awaiting_ack: number;
      avg_days_to_close: number;
      reopened_count: number;
      total_in_window: number;
    }>(totalsRes)[0];

    const overdueRes = await db.execute(sql`
      SELECT COUNT(*)::int AS overdue_clocks
      FROM compliance_clocks c
      INNER JOIN incidents i ON c.incident_id = i.id
      WHERE c.met_at IS NULL
        AND c.due_at < NOW()
        AND i.created_at >= ${fromIso}::timestamptz
        AND i.created_at <= ${toIso}::timestamptz
        ${siteClause}
    `);
    const overdueClocks =
      Number(
        extractRows<{ overdue_clocks: number }>(overdueRes)[0]?.overdue_clocks,
      ) || 0;

    // 2. Fetch incidents in window for exact Monday YYYY-MM-DD weeks & q1/q2 heatmap
    // (Also attempts Timescale time_bucket in SQL per B9)
    try {
      await db.execute(sql`
        SELECT time_bucket('1 week', i.created_at) AS bucket, COUNT(*)::int
        FROM incidents i
        WHERE i.created_at >= ${fromIso}::timestamptz
          AND i.created_at <= ${toIso}::timestamptz
          ${siteClause}
        GROUP BY 1
      `);
    } catch {
      // Standard Postgres without TimescaleDB extension
    }

    const incidentWindowRes = await db.execute(sql`
      SELECT
        i.id,
        i.created_at,
        i.site,
        i.types,
        i.answers
      FROM incidents i
      WHERE i.created_at >= ${fromIso}::timestamptz
        AND i.created_at <= ${toIso}::timestamptz
        ${siteClause}
      ORDER BY i.created_at ASC
    `);
    const windowIncidents = extractRows<{
      id: string;
      created_at: string;
      site: string;
      types: string[] | null;
      answers: Answers | null;
    }>(incidentWindowRes);

    // Compute byWeekType with guaranteed Monday YYYY-MM-DD week start
    const weekTypeCounts = new Map<string, number>();
    const siteCounts = new Map<string, number>();
    const heatmapCounts = new Map<string, number>();

    for (const inc of windowIncidents) {
      const weekMonday = toMondayDateStr(inc.created_at);
      const rawTypes =
        Array.isArray(inc.types) && inc.types.length > 0
          ? inc.types
          : deriveTypes(inc.answers ?? {});

      for (const t of rawTypes) {
        if (VALID_TYPES.has(t as IncidentType)) {
          const key = `${weekMonday}:::${t}`;
          weekTypeCounts.set(key, (weekTypeCounts.get(key) ?? 0) + 1);
        }
      }

      const siteName = inc.site || extractLocation(inc.answers ?? {});
      siteCounts.set(siteName, (siteCounts.get(siteName) ?? 0) + 1);

      const { dow, hour } = parseIncidentDowAndHour(inc.answers, inc.created_at);
      const hmKey = `${dow}:::${hour}`;
      heatmapCounts.set(hmKey, (heatmapCounts.get(hmKey) ?? 0) + 1);
    }

    const byWeekType = Array.from(weekTypeCounts.entries())
      .map(([key, count]) => {
        const [week, type] = key.split(':::');
        return {
          week,
          type: type as IncidentType,
          count,
        };
      })
      .sort((a, b) =>
        a.week !== b.week
          ? a.week.localeCompare(b.week)
          : a.type.localeCompare(b.type),
      );

    const bySite = Array.from(siteCounts.entries())
      .map(([site, count]) => ({ site, count }))
      .sort((a, b) => (b.count !== a.count ? b.count - a.count : a.site.localeCompare(b.site)));

    const heatmap = Array.from(heatmapCounts.entries())
      .map(([key, count]) => {
        const [dowStr, hourStr] = key.split(':::');
        return {
          dow: Number(dowStr),
          hour: Number(hourStr),
          count,
        };
      })
      .sort((a, b) => (a.dow !== b.dow ? a.dow - b.dow : a.hour - b.hour));

    // 5. stageDurations: join events to incidents to filter by site and from/to window
    const stageRes = await db.execute(sql`
      WITH status_transitions AS (
        SELECT
          e.incident_id,
          e.cycle,
          e.to_status AS stage,
          e.time AS entered_at,
          LEAD(e.time) OVER (
            PARTITION BY e.incident_id, e.cycle
            ORDER BY e.time ASC
          ) AS exited_at
        FROM events e
        INNER JOIN incidents i ON e.incident_id = i.id
        WHERE e.to_status IS NOT NULL
          AND i.created_at >= ${fromIso}::timestamptz
          AND i.created_at <= ${toIso}::timestamptz
          ${siteClause}
      )
      SELECT
        stage,
        AVG(EXTRACT(EPOCH FROM (exited_at - entered_at)) / 3600.0)::float AS avg_hours
      FROM status_transitions
      WHERE exited_at IS NOT NULL
        AND exited_at >= entered_at
        AND stage != 'CLOSED'
      GROUP BY stage
    `);
    const stageRows = extractRows<{ stage: string; avg_hours: number }>(stageRes);
    const stageMap = new Map<string, number>();
    for (const r of stageRows) {
      stageMap.set(r.stage, Math.round((Number(r.avg_hours) || 0) * 10) / 10);
    }

    const totalInWindow = Number(totalsRow?.total_in_window) || 0;
    const reopenedCount = Number(totalsRow?.reopened_count) || 0;
    // reopenedRate as 0–1 (e.g. 0.15 for 15%)
    const reopenedRate =
      totalInWindow > 0
        ? Math.round((reopenedCount / totalInWindow) * 1000) / 1000
        : 0;

    const response: TrendsResponse = {
      totals: {
        thisMonth: Number(totalsRow?.this_month) || 0,
        lastMonth: Number(totalsRow?.last_month) || 0,
        open: Number(totalsRow?.open_count) || 0,
        awaitingAck: Number(totalsRow?.awaiting_ack) || 0,
        avgDaysToClose:
          Math.round((Number(totalsRow?.avg_days_to_close) || 0) * 10) / 10,
        overdueClocks,
        reopenedRate,
      },
      byWeekType,
      bySite,
      heatmap,
      stageDurations: STAGE_ORDER.map((stage) => ({
        stage,
        avgHours: stageMap.get(stage) ?? 0,
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err);
  }
}
