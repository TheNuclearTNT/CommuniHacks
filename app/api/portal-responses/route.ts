import { desc } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, schema } from "@/lib/db";
import { extractLocation } from "@/lib/workflow/rules";

// GET /api/portal-responses — reviewer view of every incident with the key
// fields the brief asks for: location, time, reporter, victim name, summary,
// status, type, and the 24h supervisor-review clock.
// Gated by the demo `portal` cookie.
export async function GET() {
  const signedIn = (await cookies()).get("portal")?.value === "1";
  if (!signedIn) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.incidents)
    .orderBy(desc(schema.incidents.createdAt));

  const items = rows.map((inc) => {
    const a = inc.answers ?? {};
    const summary =
      inc.ai?.summaryBullets?.[0]?.trim() ||
      (typeof a.q32 === "string" ? a.q32.trim() : "") ||
      `Incident ${inc.id}`;

    // Supervisor review is due 24h from the incident time (q1 date + q2 time),
    // falling back to the submission time when those are missing.
    const incidentAt = parseIncidentDateTime(
      typeof a.q1 === "string" ? a.q1 : undefined,
      typeof a.q2 === "string" ? a.q2 : undefined,
    ) ?? new Date(inc.createdAt);
    const reviewDueAt = new Date(incidentAt.getTime() + 24 * 3600_000);

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
      reviewDueAt: reviewDueAt.toISOString(),
      // The review is "done" once the incident has moved past supervisor review.
      reviewDone: !["SUBMITTED", "SUPERVISOR_REVIEW"].includes(inc.status),
    };
  });

  return NextResponse.json(items);
}

// Parse "2026-11-05" + "2:15PM" into a Date. Returns null if it can't.
function parseIncidentDateTime(
  date: string | undefined,
  time: string | undefined,
): Date | null {
  if (!date) return null;
  let hours = 9;
  let minutes = 0;
  if (time) {
    const m = time.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
    if (m) {
      hours = parseInt(m[1], 10);
      minutes = m[2] ? parseInt(m[2], 10) : 0;
      const ampm = m[3]?.toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    }
  }
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(hours, minutes, 0, 0);
  return d;
}
