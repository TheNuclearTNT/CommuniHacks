import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { denyIfSignedOut } from "@/lib/portal/guard";
import { rowsOf } from "@/lib/portal/rows";
import questionsJson from "@/config/questions.json";

// Stores an editable copy of the 35-question config so supervisors/executives
// can reword questions on screen (form editor). The baseline is config/
// questions.json; edits are saved to a tiny key/value table created on demand.
//
// GET  -> returns the current (edited or baseline) config
// PUT  -> saves a new config (portal cookie required)
//
// Note: this edits question WORDING/options/required for the demo. It does not
// change the form ENGINE logic, which keys off question ids (q1..q35).

const KEY = "questions_config";

async function ensureTable() {
  const db = await getDb();
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS app_settings (key text PRIMARY KEY, value jsonb NOT NULL)`,
  );
  return db;
}

export async function GET() {
  try {
    const db = await ensureTable();
    const rows = rowsOf<{ value: unknown }>(
      await db.execute(
        sql`SELECT value FROM app_settings WHERE key = ${KEY} LIMIT 1`,
      ),
    );
    const stored = rows[0]?.value;
    if (stored) {
      return NextResponse.json(stored);
    }
  } catch (err) {
    // If the DB is unreachable, fall back to the baseline file so the editor
    // still renders.
    console.error("form-config GET fell back to baseline:", err);
  }
  return NextResponse.json(questionsJson);
}

export async function PUT(req: Request) {
  const denied = await denyIfSignedOut();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.questions)) {
    return NextResponse.json(
      { error: "Expected { sections, questions }" },
      { status: 400 },
    );
  }

  try {
    const db = await ensureTable();
    await db.execute(
      sql`INSERT INTO app_settings (key, value) VALUES (${KEY}, ${JSON.stringify(
        body,
      )}::jsonb)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("form-config PUT failed:", err);
    return NextResponse.json(
      { error: "Could not save. Is the database connected?" },
      { status: 500 },
    );
  }
}
