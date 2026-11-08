"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The assistant's voice: speaks its questions out loud with ElevenLabs
// text-to-speech (through /api/intake/speak) and tracks what the controls need.
//
// - Audio for each line is fetched once and kept, so replaying never costs twice.
// - Starting a new line, or calling stopSpeaking(), cancels the old one, even if
//   its audio is still downloading.
// - If the server has no voice (204), voiceStatus becomes "unavailable" and the
//   page carries on as text only.
// - If the browser blocks sound until the person taps (autoplay rules),
//   needsTap becomes true so the page can offer a Play button.

export type VoiceStatus = "unknown" | "ready" | "unavailable";

export function useAssistantVoice() {
  const [voiceOn, setVoiceOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("unknown");

  const voiceOnRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Bumped whenever playback is stopped or replaced, so a slow download for an
  // old line can never start playing over a newer one.
  const speakToken = useRef(0);
  const audioCache = useRef(new Map<string, Promise<string | null>>());

  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  const stopSpeaking = useCallback(() => {
    speakToken.current += 1;
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  }, []);

  const fetchAudio = useCallback((text: string): Promise<string | null> => {
    const cache = audioCache.current;
    const hit = cache.get(text);
    if (hit) return hit;
    const request = (async () => {
      try {
        const res = await fetch("/api/intake/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.status !== 200) return null; // 204 = voice not available
        const buf = await res.arrayBuffer();
        return URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      } catch {
        return null;
      }
    })();
    cache.set(text, request);
    void request.then((url) => {
      if (!url) cache.delete(text); // let a later try ask again
    });
    return request;
  }, []);

  // Say a line out loud. `force` plays it even when the voice is switched off
  // (used by the Play buttons).
  const speak = useCallback(
    async (text: string, force = false) => {
      if (!force && !voiceOnRef.current) return;
      stopSpeaking();
      const token = speakToken.current;
      setSpeaking(true); // also covers the short wait while the audio arrives
      const url = await fetchAudio(text);
      if (token !== speakToken.current) return; // something newer took over
      if (!url) {
        setVoiceStatus("unavailable");
        setSpeaking(false);
        return;
      }
      setVoiceStatus("ready");
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (token === speakToken.current) setSpeaking(false);
      };
      try {
        await audio.play();
        setNeedsTap(false);
      } catch (err) {
        if (token !== speakToken.current) return;
        setSpeaking(false);
        // Browsers block sound until the person has tapped the page.
        if (err instanceof DOMException && err.name === "NotAllowedError") setNeedsTap(true);
      }
    },
    [stopSpeaking, fetchAudio],
  );

  // Stop talking when the page is left.
  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  const toggleVoice = useCallback(() => {
    if (voiceOnRef.current) stopSpeaking();
    setVoiceOn((on) => !on);
  }, [stopSpeaking]);

  return { voiceOn, speaking, needsTap, voiceStatus, speak, stopSpeaking, toggleVoice };
}
