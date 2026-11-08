// ElevenLabs voice settings, shared by the speak (text-to-speech) and
// transcribe (speech-to-text) routes.
//
// Voice is switched separately from the AI. USE_MOCK_AI only controls Gemini.
// With a real ELEVENLABS_API_KEY the assistant speaks and listens for real, even
// while the AI itself is in mock mode. Set USE_MOCK_VOICE=true to force voice
// off (the assistant stays silent and recordings return a canned demo story).

const PLACEHOLDER = "your_elevenlabs_api_key_here";

/** The ElevenLabs key, or null when it is missing or still the template value. */
export function elevenLabsKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key || key === PLACEHOLDER) return null;
  return key;
}

/** True when voice should NOT call ElevenLabs (forced off, or no usable key). */
export function voiceIsMocked(): boolean {
  if (String(process.env.USE_MOCK_VOICE ?? "").toLowerCase() === "true") return true;
  return elevenLabsKey() === null;
}
