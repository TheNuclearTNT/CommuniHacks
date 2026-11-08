import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as speak } from "./speak/route";
import { POST as transcribe } from "./transcribe/route";
import { SCENARIO_3_TRANSCRIPT } from "@/lib/mock/mathew";

// These tests run fully in-process: the network call to ElevenLabs is stubbed
// and the "audio" is a few synthetic bytes, so nothing leaves the machine.

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function voiceOn() {
  vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
  vi.stubEnv("USE_MOCK_VOICE", "");
  vi.stubEnv("ELEVENLABS_VOICE_ID", "");
  vi.stubEnv("USE_MOCK_AI", "true"); // the AI mock must not affect voice
}

const speakReq = (body: unknown) =>
  new Request("http://localhost/api/intake/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

function audioReq(bytes: number[] | null) {
  const fd = new FormData();
  if (bytes) {
    fd.append("audio", new File([new Uint8Array(bytes)], "recording.webm", { type: "audio/webm" }));
  }
  return new Request("http://localhost/api/intake/transcribe", { method: "POST", body: fd });
}

describe("POST /api/intake/speak", () => {
  it("stays silent (204) with no key, and never calls ElevenLabs", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const res = await speak(speakReq({ text: "Hello" }));
    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("speaks for real when a key is set, even with USE_MOCK_AI=true", async () => {
    voiceOn();
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
    const res = await speak(speakReq({ text: "What happened?" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    expect((await res.arrayBuffer()).byteLength).toBe(4);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL"); // premade default voice
    expect((init.headers as Record<string, string>)["xi-api-key"]).toBe("sk_test_key");
    expect(JSON.parse(init.body as string)).toMatchObject({
      text: "What happened?",
      model_id: "eleven_flash_v2_5",
    });
  });

  it("uses ELEVENLABS_VOICE_ID when set", async () => {
    voiceOn();
    vi.stubEnv("ELEVENLABS_VOICE_ID", "custom_voice_1");
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1]), { status: 200 }));
    await speak(speakReq({ text: "Hi" }));
    expect(String(fetchMock.mock.calls[0][0])).toContain("/text-to-speech/custom_voice_1");
  });

  it("falls back to silence (204) if ElevenLabs refuses, e.g. a plan limit", async () => {
    voiceOn();
    fetchMock.mockResolvedValue(new Response('{"detail":"paid_plan_required"}', { status: 402 }));
    const res = await speak(speakReq({ text: "Hi" }));
    expect(res.status).toBe(204);
  });

  it("USE_MOCK_VOICE=true forces silence even with a key", async () => {
    voiceOn();
    vi.stubEnv("USE_MOCK_VOICE", "true");
    const res = await speak(speakReq({ text: "Hi" }));
    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty text and over-long text", async () => {
    voiceOn();
    expect((await speak(speakReq({}))).status).toBe(400);
    expect((await speak(speakReq({ text: "a".repeat(501) }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/intake/transcribe", () => {
  it("returns the canned demo story only when voice is off", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const res = await transcribe(audioReq([1, 2, 3]));
    expect(await res.json()).toEqual({ transcript: SCENARIO_3_TRANSCRIPT });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the real transcript, trimmed, and asks for the scribe model", async () => {
    voiceOn();
    fetchMock.mockResolvedValue(Response.json({ text: "  I slipped near the stairs.  " }));
    const res = await transcribe(audioReq([1, 2, 3, 4]));
    expect(await res.json()).toEqual({ transcript: "I slipped near the stairs." });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/v1/speech-to-text");
    expect((init.body as FormData).get("model_id")).toBe("scribe_v1");
  });

  it("returns an error, NOT the invented demo story, when transcription fails", async () => {
    voiceOn();
    fetchMock.mockResolvedValue(new Response("bad audio", { status: 400 }));
    const res = await transcribe(audioReq([9, 9, 9]));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.transcript).toBeUndefined();
  });

  it("rejects an empty or missing recording without calling ElevenLabs", async () => {
    voiceOn();
    expect((await transcribe(audioReq([]))).status).toBe(400);
    expect((await transcribe(audioReq(null))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
