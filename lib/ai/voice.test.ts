import { afterEach, describe, expect, it, vi } from "vitest";
import { elevenLabsKey, voiceIsMocked } from "./voice";

afterEach(() => vi.unstubAllEnvs());

describe("voice settings", () => {
  it("is mocked when there is no key", () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect(elevenLabsKey()).toBeNull();
    expect(voiceIsMocked()).toBe(true);
  });

  it("treats the template placeholder as no key", () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "your_elevenlabs_api_key_here");
    expect(elevenLabsKey()).toBeNull();
    expect(voiceIsMocked()).toBe(true);
  });

  it("is real when a key is set, even if the AI itself is mocked", () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
    vi.stubEnv("USE_MOCK_AI", "true");
    vi.stubEnv("USE_MOCK_VOICE", "");
    expect(voiceIsMocked()).toBe(false);
  });

  it("USE_MOCK_VOICE=true forces voice off even with a key", () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "sk_test_key");
    vi.stubEnv("USE_MOCK_VOICE", "true");
    expect(voiceIsMocked()).toBe(true);
  });
});
