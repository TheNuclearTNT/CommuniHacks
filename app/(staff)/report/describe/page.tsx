"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/types";
import { useReportDraft } from "@/components/form/useReportDraft";
import { transcribeIntake } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";

// A line in the conversation shown on screen.
interface Turn {
  who: "ai" | "you";
  text: string;
}

interface ConverseResponse {
  answers: Answers;
  branches: string[];
  next:
    | { kind: "ask"; questionId: string; question: string }
    | { kind: "need_more"; question: string }
    | { kind: "done" };
  relevantMissing: string[];
  mock: boolean;
}

const OPENING = "Hi, I'm here to help you report what happened. Tell me what happened — where, when, and who was involved.";
const MAX_AI_QUESTIONS = 6;

// Quick-fill example stories for demos (from the team's earlier version).
const DEMO_SCENARIOS = [
  {
    label: "Privacy · Misdirected email",
    text: "This morning around 9:15 AM at Main Site, a staff member accidentally replied-all to an external community partner email thread that had a client schedule spreadsheet attached. We immediately recalled the message, notified our supervisor, and asked the recipient to delete the attachment.",
  },
  {
    label: "Staff Injury · Wet stairwell fall",
    text: "At 2:30 PM today at Grow Community Centre, a youth worker slipped on melted snow near the east stairwell landing and twisted their right ankle. A first aid ice pack was applied on site and they went to a walk-in clinic for an X-ray. A wet floor cone was placed immediately.",
  },
  {
    label: "Behavioural · Lobby escalation",
    text: "Around 3:45 PM on Friday at Main Site reception, a visitor became verbally agitated at the front desk, shouted at two reception staff members, and knocked over a brochure stand before leaving.",
  },
];

// /report/describe — an AI-led conversation. The assistant asks (out loud via
// ElevenLabs when a key is set, otherwise on screen), the reporter speaks or
// types, and the AI decides which of the 35 questions actually matter for this
// incident. It never asks irrelevant branches (e.g. injury on an IT issue).
export default function DescribePage() {
  const router = useRouter();
  const { answers, mergeAiAnswers, setTranscript, hydrated } = useReportDraft();

  const [conversation, setConversation] = useState<Turn[]>([
    { who: "ai", text: OPENING },
  ]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [askCount, setAskCount] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spokenOpening = useRef(false);

  // Speak a line via ElevenLabs. Silent no-op if TTS is unavailable (204).
  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/intake/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status !== 200) return; // no voice configured → text only
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const audio = new Audio(url);
      await audio.play().catch(() => {});
    } catch {
      /* text-only fallback */
    }
  }, []);

  // Speak the opening once on mount.
  useEffect(() => {
    if (spokenOpening.current) return;
    spokenOpening.current = true;
    void speak(OPENING);
  }, [speak]);

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
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleSpoken(blob);
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("No microphone. You can type your answer instead.");
    }
  };

  const stopRecording = () => {
    setRecording(false);
    stopTimer();
    mediaRef.current?.stop();
  };

  const handleSpoken = async (blob: Blob) => {
    setBusy(true);
    try {
      const { transcript } = await transcribeIntake(blob);
      await submitReply(transcript);
    } catch {
      setError("Couldn't hear that. Try again, or type your answer.");
      setBusy(false);
    }
  };

  // Send the reporter's reply into the conversation and act on the AI's turn.
  const submitReply = async (reply: string) => {
    const clean = reply.trim();
    if (!clean) {
      setBusy(false);
      return;
    }
    setConversation((c) => [...c, { who: "you", text: clean }]);
    const nextTranscript = (fullTranscript + " " + clean).trim();
    setFullTranscript(nextTranscript);
    setTyped("");
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/intake/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: nextTranscript, answers }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: ConverseResponse = await res.json();

      mergeAiAnswers(data.answers);
      setTranscript(nextTranscript);

      // Cap the number of spoken questions; leftovers go to the form.
      if (data.next.kind === "ask" && askCount >= MAX_AI_QUESTIONS) {
        finish("Thanks. I'll take you to the form to finish the last few details.");
        return;
      }

      if (data.next.kind === "done") {
        finish("Thanks, I have what I need. Let's review your report.");
      } else if (data.next.kind === "need_more") {
        pushAi(data.next.question);
      } else {
        setAskCount((n) => n + 1);
        pushAi(data.next.question);
      }
    } catch {
      setError("The assistant is unavailable. You can fill the form instead.");
    } finally {
      setBusy(false);
    }
  };

  const pushAi = (text: string) => {
    setConversation((c) => [...c, { who: "ai", text }]);
    void speak(text);
  };

  const finish = (closing: string) => {
    setConversation((c) => [...c, { who: "ai", text: closing }]);
    void speak(closing);
    setFinished(true);
    setBusy(false);
  };

  if (!hydrated) return null;

  return (
    <main>
      <BackLink href="/report" label="Back to start" />
      <h1 className="mb-1 text-2xl font-bold">Tell us what happened</h1>
      <p className="mb-6 text-slate-500">
        Answer in your own words. I&apos;ll only ask what matters for your
        situation.
      </p>

      {/* Conversation */}
      <div className="mb-6 flex flex-col gap-3">
        {conversation.map((t, i) => (
          <div
            key={i}
            className={t.who === "ai" ? "flex" : "flex justify-end"}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-base " +
                (t.who === "ai"
                  ? "bg-slate-100 text-slate-900"
                  : "bg-accent text-white")
              }
            >
              {t.text}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-400">Thinking…</p>}
      </div>

      {error && <p className="mb-4 text-warn">{error}</p>}

      {!finished ? (
        <>
          <div className="mb-4 flex flex-col items-center">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={busy}
              className={
                "flex h-28 w-28 items-center justify-center rounded-full text-white disabled:opacity-50 " +
                (recording ? "bg-critical" : "bg-accent")
              }
              aria-pressed={recording}
            >
              <span className="text-center text-sm font-medium">
                {recording ? "Tap to stop" : "Tap to talk"}
              </span>
            </button>
            {recording && (
              <p className="mt-2 font-mono text-critical">
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) void submitReply(typed);
              }}
              placeholder="…or type your answer"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void submitReply(typed)}
              disabled={busy || !typed.trim()}
              className="rounded-lg bg-accent px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>

          {/* Demo quick-fill: only offered before the reporter has said anything */}
          {conversation.length <= 1 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-slate-400">
                Or try an example (for demos)
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={busy}
                    onClick={() => void submitReply(s.text)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
        >
          Review my report
        </button>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="text-sm text-slate-500 underline"
        >
          Skip the conversation and fill the form myself
        </button>
      </div>
    </main>
  );
}
