import { NextResponse } from "next/server";

// POST /api/intake/speak  (Mathew owns this route)
// Body: { text: string }
// Returns: audio/mpeg of the text spoken by ElevenLabs text-to-speech, so the
// AI can ASK its questions out loud. If no ElevenLabs key is set (or mock mode),
// returns 204 No Content so the UI silently falls back to on-screen text.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // "Rachel" — a default ElevenLabs voice

export async function POST(request: Request) {
  const useMock = (process.env.USE_MOCK_AI ?? "true").toLowerCase() === "true";
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // No voice available → tell the client to use text only.
  if (useMock || !apiKey || apiKey === "your_elevenlabs_api_key_here") {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.4, similarity_boost: 0.7 },
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
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("ElevenLabs TTS error:", err);
    return new NextResponse(null, { status: 204 });
  }
}
