import { NextResponse } from "next/server";
import { elevenLabsKey, voiceIsMocked } from "@/lib/ai/voice";

// POST /api/intake/speak  (Mathew owns this route)
// Body: { text: string }
// Returns: audio/mpeg of the text spoken by ElevenLabs text-to-speech, so the
// assistant can ASK its questions out loud. When voice is off (no ElevenLabs key,
// or USE_MOCK_VOICE=true) it returns 204 No Content and the page stays text-only.

// "Sarah" (mature, reassuring, confident): a calm voice for reporting an
// incident. It is a *premade* ElevenLabs voice, which free plans can use through
// the API. Library voices (e.g. the old default "Rachel") return 402 on free
// plans. Override with ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const TTS_MODEL = "eleven_flash_v2_5"; // lowest-latency model, suited to conversation
// The assistant's lines are short. The cap keeps this open endpoint from being
// used to burn through ElevenLabs credits with long texts.
const MAX_CHARS = 500;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `text must be ${MAX_CHARS} characters or fewer` },
      { status: 400 },
    );
  }

  const apiKey = elevenLabsKey();
  if (voiceIsMocked() || !apiKey) {
    return new NextResponse(null, { status: 204 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
    if (!res.ok) {
      console.error("ElevenLabs TTS failed:", res.status, await res.text());
      return new NextResponse(null, { status: 204 });
    }
    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("ElevenLabs TTS error:", err);
    return new NextResponse(null, { status: 204 });
  }
}
