import { NextResponse } from "next/server";
import type { IntakeExtractRequest } from "@/lib/types";
import { extractIntake } from "@/lib/ai/intake";

// POST /api/intake/extract  (Mathew owns this route)
// Body: IntakeExtractRequest { transcript, answers }
// Returns: IntakeExtractResponse { answers, missingRequired, followUp }
export async function POST(request: Request) {
  let body: IntakeExtractRequest;
  try {
    body = (await request.json()) as IntakeExtractRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body.transcript !== "string") {
    return NextResponse.json(
      { error: "transcript must be a string", fields: ["transcript"] },
      { status: 400 }
    );
  }

  const answers = body.answers ?? {};
  const result = await extractIntake({ transcript: body.transcript, answers });
  // Strip the internal `mock` flag from the typed response shape.
  const { answers: merged, missingRequired, followUp } = result;
  return NextResponse.json({ answers: merged, missingRequired, followUp });
}
