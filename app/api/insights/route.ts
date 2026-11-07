import { subWeeks } from 'date-fns';
import { and, desc, gte, lte } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { generateExecutiveInsights } from '@/lib/ai/gemini';
import { getDb, schema } from '@/lib/db';
import { handleApiError } from '@/lib/workflow/auth';

export async function GET(req: Request) {
  try {
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

    const db = await getDb();

    // Fetch only aggregate metadata (id, site, types, status, severity) — never raw answers (B9)
    const rows = await db
      .select({
        id: schema.incidents.id,
        site: schema.incidents.site,
        types: schema.incidents.types,
        status: schema.incidents.status,
        severity: schema.incidents.severity,
      })
      .from(schema.incidents)
      .where(
        and(
          gte(schema.incidents.createdAt, fromDate.toISOString()),
          lte(schema.incidents.createdAt, toDate.toISOString()),
        ),
      )
      .orderBy(desc(schema.incidents.createdAt));

    const byTypeMap = new Map<string, string[]>();
    const bySiteMap = new Map<string, string[]>();
    const allowedIncidentIds: string[] = [];

    for (const row of rows) {
      allowedIncidentIds.push(row.id);

      const siteKey = row.site || 'Main Site';
      if (!bySiteMap.has(siteKey)) bySiteMap.set(siteKey, []);
      bySiteMap.get(siteKey)!.push(row.id);

      for (const t of row.types ?? []) {
        if (!byTypeMap.has(t)) byTypeMap.set(t, []);
        byTypeMap.get(t)!.push(row.id);
      }
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
      allowedIncidentIds,
    };

    const insights = await generateExecutiveInsights(aggregatesPayload);
    return NextResponse.json(insights);
  } catch (err) {
    return handleApiError(err);
  }
}

