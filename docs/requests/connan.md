# Requests to Connan (from Ananya)

## Status after your "Improvements" commit (7 Nov, 17:41) — thanks!
- ✅ #2 heatmap: now from q1/q2, Friday 2pm peak shows correctly
- ✅ #4 `npm run seed`
- ✅ `reopenedRate` as 0–1 (the dashboard reads it as a fraction again)
- ⏳ **#1 stage durations — still open.** Specialty acknowledgement shows 1.5 days on the seeded data; with `stageSql` below it's 3.3 days. It's still the slowest stage, so the headline is right, but the gap is too small to make the point in the demo.
- ⏳ **#3 briefing — partly done.** `computeDeterministicInsights` no longer contradicts the data 👍 but it only sees counts by type/site, so it reports "Main Site has the most reports" rather than the Friday-afternoon cluster, the rising Grow falls and the slow acknowledgements that the demo script reads out. It also shows raw codes ("BEHAVIOURAL") in the text. Adding the queries from `ruleBasedInsights` below (hotspot by site + weekday, rising injury detail, misdirected emails, slowest stage) would give it the planted patterns.

---

Your scaffold already covers most of what the seed needed: `transition()`, `POST /api/clocks/:id/met`, and `getDb`/`schema`. `scripts/seed.ts` runs every record through `transition()` and then moves the timestamps it wrote onto a 12-week timeline, so **you don't need to add a seed-time header or a reset endpoint.**

What's left is three fixes in your trends and insights routes, plus one `package.json` line. I tested all the SQL below on the seeded data (local PGlite, 200 records).

## 1. `/api/trends` stageDurations: one span per stage visit, not per event

At the moment `LEAD()` runs over every event that has a `to_status`. `ROUTED` lands 1 ms after `REVIEW_SUBMITTED`, and every acknowledgement is its own event, so a 4-day specialty wait gets averaged as several short pieces. On the seeded data specialty acknowledgement comes out at **1.7 days**. With the fix below it's **3.3 days**, against about a day or less for every other stage.

Replace the `stageRes` query with the `stageSql` below, adding your `siteClause` inside the `ev` CTE's `WHERE`. It drops consecutive events that stay in the same stage before measuring.

## 2. `/api/trends` heatmap: Langs' local time

`EXTRACT(DOW/HOUR FROM i.created_at)` uses the database session's timezone, usually UTC on Vercel and TigerData. That moves Friday 2pm in Ontario to Friday 6–7pm. Use `i.created_at AT TIME ZONE 'America/Toronto'` (see `heatSql` below). On the seeded data, the peak moves back to Friday 2pm.

## 3. `/api/insights`: a briefing that matches the data

In mock mode the route returns `MOCK_INSIGHTS`, which was written for your 5 sample records. After seeding, it says specialty acknowledgement takes "under 14 hours", and it links INC-2026-0001 to 0005, which are now unrelated records. In live mode Gemini only gets counts by type and by site, so it can't see time-of-day, rising trends or stage delays.

`ruleBasedInsights(from, to)` below works out the briefing from the database with no AI. Suggested use:
- `USE_MOCK_AI=true` → return `ruleBasedInsights(...)` instead of `MOCK_INSIGHTS`
- Gemini fails → return it as the fallback
- (optional) pass its bullets to Gemini as extra context, so the AI version can rephrase or extend real findings

Output on the seeded data:

```
- Behavioural reports cluster at Main Site on Friday afternoons: 35 in this period, up from 9 to 18 in the last 4 weeks.
- Slip/Trip/Fall reports at Grow Community Centre rose to 10 in the last 3 weeks, from 3 in the weeks before.
- 22 of 30 privacy incidents involved an email sent to the wrong recipient.
- Records wait longest at specialty acknowledgement: about 3.3 days on average. 22 are waiting there now.
- 3 records have an overdue reporting clock.
```

It's generic: none of it hard-codes Main Site, Grow Community Centre or Fridays.

## 4. `package.json`

```jsonc
"seed": "tsx --env-file-if-exists=.env.local scripts/seed.ts"
```

(`--env-file-if-exists` needs Node 20.19+ or 22.9+. On older Node, use `--env-file=.env.local` and make sure the file exists.)

## Code (tested; drop into the routes or a shared helper)

```ts
import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import type { InsightsResponse } from '@/lib/types';

type Row = Record<string, unknown>;
const rows = <T = Row>(res: unknown): T[] =>
  Array.isArray(res) ? (res as T[]) : (((res as { rows?: T[] })?.rows ?? []) as T[]);

// ---- 1. stage durations: one span per stage visit, not per event ----
export const stageSql = (fromIso: string, toIso: string) => sql`
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
  GROUP BY stage`;

// ---- 2. heatmap in Langs' local time ----
export const heatSql = (fromIso: string, toIso: string) => sql`
  SELECT EXTRACT(DOW FROM i.created_at AT TIME ZONE 'America/Toronto')::int AS dow,
         EXTRACT(HOUR FROM i.created_at AT TIME ZONE 'America/Toronto')::int AS hour,
         COUNT(*)::int AS count
  FROM incidents i
  WHERE i.created_at >= ${fromIso}::timestamptz AND i.created_at <= ${toIso}::timestamptz
  GROUP BY 1, 2`;

// ---- 3. rule-based briefing (mock mode + Gemini fallback) ----
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STAGE_LABEL: Record<string, string> = {
  SUBMITTED: 'submitted',
  SUPERVISOR_REVIEW: 'supervisor review',
  SPECIALTY_REVIEW: 'specialty acknowledgement',
  WITH_EA: 'the Executive Assistant',
};

export async function ruleBasedInsights(from: Date, to: Date): Promise<InsightsResponse> {
  const db = await getDb();
  const f = from.toISOString();
  const t = to.toISOString();
  const bullets: InsightsResponse['bullets'] = [];

  // (a) Behavioural hotspot: the site + weekday + afternoon/morning block with the most reports.
  const hot = rows<{ site: string; dow: number; pm: boolean; ids: string[]; recent: number; before: number }>(
    await db.execute(sql`
      SELECT i.site,
             EXTRACT(DOW FROM i.created_at AT TIME ZONE 'America/Toronto')::int AS dow,
             EXTRACT(HOUR FROM i.created_at AT TIME ZONE 'America/Toronto') >= 12 AS pm,
             array_agg(i.id ORDER BY i.created_at) AS ids,
             COUNT(*) FILTER (WHERE i.created_at >= now() - interval '28 days')::int AS recent,
             COUNT(*) FILTER (WHERE i.created_at < now() - interval '28 days' AND i.created_at >= now() - interval '56 days')::int AS before
      FROM incidents i
      WHERE 'BEHAVIOURAL' = ANY(i.types) AND i.created_at BETWEEN ${f}::timestamptz AND ${t}::timestamptz
      GROUP BY 1, 2, 3
      ORDER BY COUNT(*) DESC
      LIMIT 1`),
  )[0];
  if (hot && hot.ids.length >= 5) {
    const trend = hot.before > 0 && hot.recent >= hot.before * 1.5 ? `, up from ${hot.before} to ${hot.recent} in the last 4 weeks` : '';
    bullets.push({
      text: `Behavioural reports cluster at ${hot.site} on ${DOW[hot.dow]} ${hot.pm ? 'afternoons' : 'mornings'}: ${hot.ids.length} in this period${trend}.`,
      incidentIds: hot.ids,
    });
  }

  // (b) Fastest-rising injury detail at one site: last 3 weeks vs the 9 before.
  const rising = rows<{ site: string; detail: string; ids: string[]; recent: number; before: number }>(
    await db.execute(sql`
      SELECT i.site, d.detail,
             array_agg(i.id ORDER BY i.created_at) AS ids,
             COUNT(*) FILTER (WHERE i.created_at >= now() - interval '21 days')::int AS recent,
             COUNT(*) FILTER (WHERE i.created_at < now() - interval '21 days')::int AS before
      FROM incidents i
      CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(i.answers->'q15') = 'array' THEN i.answers->'q15' ELSE '[]'::jsonb END) AS d(detail)
      WHERE i.created_at BETWEEN ${f}::timestamptz AND ${t}::timestamptz
      GROUP BY 1, 2
      HAVING COUNT(*) FILTER (WHERE i.created_at >= now() - interval '21 days') >= 4
      ORDER BY (COUNT(*) FILTER (WHERE i.created_at >= now() - interval '21 days'))::float
             / GREATEST(COUNT(*) FILTER (WHERE i.created_at < now() - interval '21 days'), 1) DESC
      LIMIT 1`),
  )[0];
  if (rising && rising.recent > rising.before) {
    bullets.push({
      text: `${rising.detail} reports at ${rising.site} rose to ${rising.recent} in the last 3 weeks, from ${rising.before} in the weeks before.`,
      incidentIds: rising.ids,
    });
  }

  // (c) What most privacy incidents have in common (misdirected email).
  const priv = rows<{ total: number; email_ids: string[] | null }>(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total,
             array_agg(i.id) FILTER (WHERE i.answers->>'q32' ~* '(e-?mail|replied-all)') AS email_ids
      FROM incidents i
      WHERE 'PRIVACY' = ANY(i.types) AND i.created_at BETWEEN ${f}::timestamptz AND ${t}::timestamptz`),
  )[0];
  const emailIds = priv?.email_ids ?? [];
  if (priv && priv.total >= 3 && emailIds.length * 2 > priv.total) {
    bullets.push({ text: `${emailIds.length} of ${priv.total} privacy incidents involved an email sent to the wrong recipient.`, incidentIds: emailIds });
  }

  // (d) Slowest pathway stage, and what is waiting there now.
  const stages = rows<{ stage: string; avg_hours: number }>(await db.execute(stageSql(f, t)))
    .filter((s) => s.stage in STAGE_LABEL)
    .sort((a, b) => b.avg_hours - a.avg_hours);
  if (stages[0]) {
    const waiting = rows<{ id: string }>(
      await db.execute(sql`SELECT id FROM incidents WHERE status = ${stages[0].stage} AND created_at BETWEEN ${f}::timestamptz AND ${t}::timestamptz`),
    ).map((r) => r.id);
    bullets.push({
      text: `Records wait longest at ${STAGE_LABEL[stages[0].stage]}: about ${(stages[0].avg_hours / 24).toFixed(1)} days on average. ${waiting.length} are waiting there now.`,
      incidentIds: waiting,
    });
  }

  // (e) Overdue compliance clocks.
  const overdue = rows<{ id: string }>(
    await db.execute(sql`
      SELECT DISTINCT c.incident_id AS id FROM compliance_clocks c JOIN incidents i ON i.id = c.incident_id
      WHERE c.met_at IS NULL AND c.due_at < now() AND i.created_at BETWEEN ${f}::timestamptz AND ${t}::timestamptz`),
  ).map((r) => r.id);
  if (overdue.length) {
    bullets.push({ text: `${overdue.length} records have an overdue reporting clock.`, incidentIds: overdue });
  }

  return {
    bullets: bullets.slice(0, 5),
    focus: hot
      ? `Look at staffing or check-ins at ${hot.site} on ${DOW[hot.dow]} ${hot.pm ? 'afternoons' : 'mornings'}, and follow up acknowledgements that have waited more than 3 days.`
      : 'Follow up acknowledgements that have waited more than 3 days.',
    generatedAt: new Date().toISOString(),
    mock: true,
  };
}
```
