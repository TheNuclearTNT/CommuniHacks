import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { denyIfSignedOut } from "@/lib/portal/guard";
import { extractLocation } from "@/lib/workflow/rules";

const REVIEW_WINDOW_MS = 24 * 3600_000;

// GET /api/portal-responses — reviewer view of every incident with the key
// fields the brief asks for: location, time, reporter, victim name, summary,
// status, type, and the 24h supervisor-review clock.
// Requires a logged-in supervisor / executive (signed session cookie).
//
// Supervisor-review clock: always 24 hours from when the report was SUBMITTED
// (or, for a reopened record, from when it was reopened). Not from the
// incident time typed into the form.
export async function GET() {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  const db = await getDb();
  const [rows, reviews, reopenEvents] = await Promise.all([
    db.select().from(schema.incidents).orderBy(desc(schema.incidents.createdAt)),
    db.select().from(schema.supervisorReviews),
    db.select().from(schema.events).where(eq(schema.events.kind, "REOPENED")),
  ]);

  // When each supervisor review was handed in, per incident + cycle.
  const reviewedAt = new Map<string, number>();
  for (const r of reviews) {
    reviewedAt.set(`${r.incidentId}:${r.cycle}`, new Date(r.submittedAt).getTime());
  }

  // Latest reopen time per incident + cycle (starts the clock again).
  const reopenedAt = new Map<string, number>();
  for (const e of reopenEvents) {
    const key = `${e.incidentId}:${e.cycle}`;
    const t = new Date(e.time).getTime();
    if (t > (reopenedAt.get(key) ?? 0)) reopenedAt.set(key, t);
  }

  const items = rows.map((inc) => {
    const a = inc.answers ?? {};
    const summary =
      inc.ai?.summaryBullets?.[0]?.trim() ||
      (typeof a.q32 === "string" ? a.q32.trim() : "") ||
      `Incident ${inc.id}`;

    const cycleKey = `${inc.id}:${inc.cycle}`;
    const startMs =
      inc.cycle > 1
        ? (reopenedAt.get(cycleKey) ?? new Date(inc.createdAt).getTime())
        : new Date(inc.createdAt).getTime();
    const dueMs = startMs + REVIEW_WINDOW_MS;
    const submittedMs = reviewedAt.get(cycleKey) ?? null;

    return {
      id: inc.id,
      status: inc.status,
      types: inc.types ?? [],
      severity: inc.severity || "Unsure",
      location: inc.site || extractLocation(a),
      // q2 is the reported time string (e.g. "2:15PM"); q1 the date.
      incidentDate: typeof a.q1 === "string" ? a.q1 : null,
      incidentTime: typeof a.q2 === "string" ? a.q2 : null,
      reporter: typeof a.q3 === "string" ? a.q3 : "Unknown",
      victim: typeof a.q11 === "string" ? a.q11 : "N/A",
      summary,
      createdAt: new Date(inc.createdAt).toISOString(),
      reviewStartedAt: new Date(startMs).toISOString(),
      reviewDueAt: new Date(dueMs).toISOString(),
      reviewSubmittedAt:
        submittedMs === null ? null : new Date(submittedMs).toISOString(),
      // Done once a review exists for this cycle, or the record has moved on.
      reviewDone:
        submittedMs !== null ||
        !["SUBMITTED", "SUPERVISOR_REVIEW", "REOPENED"].includes(inc.status),
    };
  });

  return NextResponse.json(items);
}
