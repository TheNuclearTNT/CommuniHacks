"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { transcribeIntake, extractIntake } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";

const EXAMPLE =
  "Say what happened, where, when, who was involved and what you did right away.";

// /report/describe — hold-to-talk mic, live timer, transcript, or type instead.
export default function DescribePage() {
  const router = useRouter();
  const { transcript, setTranscript, answers, mergeAiAnswers, hydrated } =
    useReportDraft();
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleBlob(blob);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      // No mic / permission denied — typing still works.
      setError("No microphone available. You can type instead below.");
    }
  };

  const stopRecording = () => {
    setRecording(false);
    stopTimer();
    mediaRef.current?.stop();
  };

  const handleBlob = async (blob: Blob) => {
    setBusy(true);
    try {
      const { transcript: t } = await transcribeIntake(blob);
      setTranscript(t);
    } catch {
      setError("Could not transcribe that. Try typing instead.");
    } finally {
      setBusy(false);
    }
  };

  const useTyped = () => {
    setTranscript(typed.trim());
  };

  const continueToCheck = async () => {
    const narrative = (transcript ?? typed).trim();
    if (!narrative) {
      // Nothing said/typed — go straight to the manual form.
      router.push("/report/check");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await extractIntake({ transcript: narrative, answers });
      mergeAiAnswers(res.answers);
      setTranscript(narrative);
      router.push("/report/check");
    } catch {
      setError("AI fill is unavailable. You can still fill the form.");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return null;

  return (
    <main>
      <BackLink href="/report" label="Back to start" />
      <h1 className="mb-1 text-2xl font-bold">Tell us what happened</h1>
      <p className="mb-6 text-slate-500">{EXAMPLE}</p>

      <div className="mb-6 flex flex-col items-center">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={busy}
          className={
            "flex h-32 w-32 items-center justify-center rounded-full text-white " +
            (recording ? "bg-critical" : "bg-accent")
          }
          aria-pressed={recording}
        >
          <span className="text-center text-sm font-medium">
            {recording ? "Tap to stop" : "Tap to talk"}
          </span>
        </button>
        {recording && (
          <p className="mt-3 font-mono text-lg text-critical">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
        )}
        {busy && <p className="mt-3 text-slate-500">Working…</p>}
      </div>

      {transcript && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1 text-sm font-medium text-slate-600">What we heard</p>
          <p className="text-slate-900">{transcript}</p>
        </div>
      )}

      <details className="mb-6">
        <summary className="cursor-pointer text-accent underline">
          Type instead
        </summary>
        <textarea
          rows={5}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={EXAMPLE}
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={useTyped}
          className="mt-2 rounded-lg border border-accent px-4 py-2 text-accent"
        >
          Use this text
        </button>
      </details>

      {error && <p className="mb-4 text-warn">{error}</p>}

      <button
        type="button"
        onClick={continueToCheck}
        disabled={busy}
        className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        Continue
      </button>
    </main>
  );
}
