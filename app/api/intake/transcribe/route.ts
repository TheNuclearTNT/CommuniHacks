import { NextResponse } from "next/server";
import { elevenLabsKey, voiceIsMocked } from "@/lib/ai/voice";
import { SCENARIO_3_TRANSCRIPT } from "@/lib/mock/mathew";

// POST /api/intake/transcribe  (Mathew owns this route)
// Receives audio (multipart form field "audio"); returns { transcript }.
// Real path -> ElevenLabs speech-to-text. When voice is off (no ElevenLabs key,
// or USE_MOCK_VOICE=true) it returns the canned Scenario 3 story for demos.
//
// If real transcription FAILS it returns an error. It never falls back to the
// canned story, because that would put an invented incident into a real report.
export async function POST(request: Request) {
  const apiKey = elevenLabsKey();
  if (voiceIsMocked() || !apiKey) {
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
      { status: 400 },
    );
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'audio' file", fields: ["audio"] },
      { status: 400 },
    );
  }

  try {
    const transcript = await transcribeWithElevenLabs(audio, apiKey);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("ElevenLabs transcribe failed:", err);
    return NextResponse.json(
      { error: "Could not transcribe the recording" },
      { status: 502 },
    );
  }
}

async function transcribeWithElevenLabs(audio: File, apiKey: string): Promise<string> {
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
  return (data.text ?? "").trim();
}
