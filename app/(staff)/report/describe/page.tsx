"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { transcribeIntake, extractIntake } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";

const EXAMPLE =
  "Say what happened, where, when, who was involved, and what you did right away.";

const DEMO_SCENARIOS = [
  {
    label: "Privacy · Misdirected email",
    text: "This morning around 9:15 AM at Main Site, a staff member accidentally replied-all to an external community partner email thread that had a client schedule spreadsheet attached. We immediately recalled the message, notified our supervisor Bill, and asked the recipient to delete the attachment.",
  },
  {
    label: "Staff Injury · Wet stairwell fall",
    text: "At 2:30 PM today at Grow Community Centre, a youth worker slipped on melted snow near the east stairwell landing and twisted their right ankle. First aid ice pack was applied on site and they went to an walk-in clinic for an X-ray. A wet floor cone was placed immediately.",
  },
  {
    label: "Behavioural · Lobby escalation",
    text: "Around 3:45 PM on Friday at Main Site reception, a visitor became verbally agitated at the front desk, shouted at two reception staff members, and knocked over a brochure stand before leaving. Security footage in the main lobby should be held.",
  },
];

// /report/describe — hold-to-talk mic, live timer, transcript, or type instead.
export default function DescribePage() {
  const router = useRouter();
  const { transcript, setTranscript, answers, mergeAiAnswers, hydrated } =
    useReportDraft();
  const [typed, setTyped] = useState(transcript ?? "");
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
      setError("No microphone detected — you can type or pick a sample scenario below.");
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
      setTyped(t);
    } catch {
      setError("Could not transcribe audio. You can type or edit the description below.");
    } finally {
      setBusy(false);
    }
  };

  const continueToCheck = async () => {
    const narrative = (typed || transcript || "").trim();
    if (!narrative) {
      router.push("/report/check");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setTranscript(narrative);
      const res = await extractIntake({ transcript: narrative, answers });
      mergeAiAnswers(res.answers);
      router.push("/report/check");
    } catch {
      setTranscript(narrative);
      router.push("/report/check");
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated) return null;

  return (
    <main>
      <BackLink href="/report" label="Back to start" />

      {/* Step progress */}
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
        <span>Step 1 of 4</span>
        <span className="text-slate-300">·</span>
        <span>Voice or Text Intake</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Tell us what happened
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{EXAMPLE}</p>

      {/* Voice recording card */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={busy}
          className={
            "mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full text-white shadow-md transition focus:outline-none focus:ring-4 focus:ring-blue-200 " +
            (recording
              ? "animate-pulse bg-critical hover:bg-red-700"
              : "bg-accent hover:bg-blue-800")
          }
          aria-pressed={recording}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            {recording ? "Recording" : "Microphone"}
          </span>
          <span className="mt-1 text-sm font-semibold">
            {recording ? "Tap to stop" : "Tap to talk"}
          </span>
        </button>

        {recording ? (
          <p className="mt-3 font-mono text-lg font-bold text-critical" aria-live="polite">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Speak naturally — AI will pre-fill the 35-question form for you to verify.
          </p>
        )}
      </div>

      {/* Type or edit narrative directly */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor="intake-narrative"
            className="text-sm font-semibold text-slate-900"
          >
            Or type / edit what happened
          </label>
          <span className="text-xs text-slate-500">
            Plain language · Pre-fills form fields
          </span>
        </div>

        <textarea
          id="intake-narrative"
          rows={5}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setTranscript(e.target.value);
          }}
          placeholder={EXAMPLE}
          className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm leading-relaxed text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20"
        />

        {/* Quick demo presets for testing */}
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
            Try a sample scenario:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setTyped(s.text);
                  setTranscript(s.text);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          disabled={busy}
          className="tap-target rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Skip to blank form
        </button>
        <button
          type="button"
          onClick={continueToCheck}
          disabled={busy}
          className="tap-target flex-1 rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs transition hover:bg-blue-800 disabled:opacity-50"
        >
          {busy
            ? "Extracting answers with AI…"
            : typed.trim()
              ? "Auto-fill form & continue →"
              : "Continue to form →"}
        </button>
      </div>
    </main>
  );
}
