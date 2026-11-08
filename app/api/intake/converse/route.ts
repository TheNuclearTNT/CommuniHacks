import { NextResponse } from "next/server";
import type { Answers } from "@/lib/types";
import { converseIntake } from "@/lib/ai/intake";

// POST /api/intake/converse  (Mathew owns this route)
// Body: { transcript: string, answers: Answers }
// Returns: ConverseResponse — merged answers, relevant branches, and the next
// step (ask one relevant question / need more detail / done).
export async function POST(request: Request) {
  let body: { transcript?: unknown; answers?: unknown; skipExtraction?: unknown; skipIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.transcript !== "string") {
    return NextResponse.json(
      { error: "transcript must be a string", fields: ["transcript"] },
      { status: 400 },
    );
  }

  const answers = (body.answers ?? {}) as Answers;
  const result = await converseIntake({
    transcript: body.transcript,
    answers,
    skipExtraction: body.skipExtraction === true,
    skipIds: Array.isArray(body.skipIds) ? body.skipIds.filter((x): x is string => typeof x === "string") : [],
  });
  return NextResponse.json(result);
}
