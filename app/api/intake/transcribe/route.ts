import { NextResponse } from "next/server";
import { SCENARIO_3_TRANSCRIPT } from "@/lib/mock/mathew";

// POST /api/intake/transcribe  (Mathew owns this route)
// Receives audio (multipart form field "audio"); returns { transcript }.
// Real path -> ElevenLabs speech-to-text. Mock path -> canned Scenario 3.
export async function POST(request: Request) {
  const useMock = (process.env.USE_MOCK_AI ?? "true").toLowerCase() === "true";

  if (useMock || !process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ transcript: SCENARIO_3_TRANSCRIPT });
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("audio");
    if (f instanceof File) audio = f;
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form with an 'audio' file" },
      { status: 400 }
    );
  }
  if (!audio) {
    return NextResponse.json(
      { error: "Missing 'audio' file", fields: ["audio"] },
      { status: 400 }
    );
  }

  try {
    const transcript = await transcribeWithElevenLabs(audio);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("ElevenLabs transcribe failed, using mock:", err);
    // Never break the demo — fall back to the canned transcript.
    return NextResponse.json({ transcript: SCENARIO_3_TRANSCRIPT });
  }
}

async function transcribeWithElevenLabs(audio: File): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY as string;
  const fd = new FormData();
  fd.append("file", audio, audio.name || "recording.webm");
  // ElevenLabs STT requires a model id; scribe_v1 is the current STT model.
  fd.append("model_id", "scribe_v1");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs STT ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
