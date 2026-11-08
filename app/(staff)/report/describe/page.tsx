"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/types";
import { useReportDraft } from "@/components/form/useReportDraft";
import { getMe, transcribeIntake } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";
import { QUESTION_BY_ID } from "@/components/form/questions";
import { DEMO_STORIES } from "@/lib/ai/demo-fixtures";

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

const OPENING = "Hi, I'm here to help you report what happened. First, what kind of incident was it?";
const MAX_AI_QUESTIONS = 6;

// Step 1 of the conversation: a broad category. It only steers the AI (it is
// sent as context with the story); the supervisor still confirms the real type.
const CATEGORIES = [
  {
    id: "hurt",
    label: "Someone was hurt",
    hint: "Injury, fall, sharps, feeling unwell",
    context: "Type of incident (chosen by reporter): someone was hurt or injured.",
    ask: "I'm sorry to hear that. Tell me what happened: where and when, who was hurt, and what care was given.",
  },
  {
    id: "building",
    label: "Building, equipment or safety",
    hint: "Damage, hazard, theft, near miss",
    context: "Type of incident (chosen by reporter): building, equipment or safety hazard (damage, theft, near miss).",
    ask: "Got it. Tell me what happened: where and when, what was damaged or unsafe, and whether anyone was nearly hurt.",
  },
  {
    id: "office",
    label: "Privacy, office or IT",
    hint: "Wrong email, records, computers, phishing",
    context: "Type of incident (chosen by reporter): privacy, confidentiality, office or IT/cybersecurity.",
    ask: "Thanks. Tell me what happened: what information or system was involved, where and when, and what you did right away.",
  },
  {
    id: "behaviour",
    label: "Behaviour or conflict",
    hint: "Aggression, harassment, complaint",
    context: "Type of incident (chosen by reporter): behaviour or conflict involving a client, visitor or staff member.",
    ask: "Thank you for reporting it. Tell me what happened: where and when, who was involved, and how it was handled.",
  },
  {
    id: "unsure",
    label: "Something else / not sure",
    hint: "Just describe it",
    context: "",
    ask: "No problem. Tell me what happened: where, when, and who was involved.",
  },
] as const;

// Quick-fill example stories for demos. Their answers are pre-written
// (lib/ai/demo-fixtures.ts), so trying them costs no Gemini quota.
const DEMO_SCENARIOS = DEMO_STORIES.map((s) => ({ label: s.label, text: s.text }));

// /report/describe — an AI-led conversation. The assistant asks (out loud via
// ElevenLabs when a key is set, otherwise on screen), the reporter speaks or
// types, and the AI decides which of the 35 questions actually matter for this
// incident. It never asks irrelevant branches (e.g. injury on an IT issue).
export default function DescribePage() {
  const router = useRouter();
  const { answers, setAnswer, mergeAiAnswers, setTranscript, hydrated } = useReportDraft();

  // The reporter is whoever is signed in, so the assistant never has to ask.
  useEffect(() => {
    if (!hydrated || answers.q3) return;
    getMe()
      .then((me) => me.name && setAnswer("q3", me.name))
      .catch(() => {});
  }, [hydrated, answers.q3, setAnswer]);

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
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  // Tap-to-answer choices for the assistant's current multiple-choice question.
  const [optionsFor, setOptionsFor] = useState<{ id: string; options: string[] } | null>(null);
  // The free-text question the assistant just asked: a typed reply answers it
  // directly (short replies like "Not applicable" are too thin for the AI).
  const [askingText, setAskingText] = useState<string | null>(null);

  const chooseCategory = (c: (typeof CATEGORIES)[number]) => {
    setCategory(c);
    setFullTranscript(c.context);
    setConversation((conv) => [...conv, { who: "you", text: c.label }, { who: "ai", text: c.ask }]);
    void speak(c.ask);
  };

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
  // `picked` is set when the reporter taps one of the answer chips: that answer
  // goes straight into the form instead of relying on the AI to map the words.
  const submitReply = async (reply: string, pickedChip?: { id: string; value: string }) => {
    const clean = reply.trim();
    if (!clean) {
      setBusy(false);
      return;
    }
    const picked = pickedChip ?? (askingText ? { id: askingText, value: clean } : undefined);
    setAskingText(null);
    setConversation((c) => [...c, { who: "you", text: clean }]);
    const nextTranscript = (fullTranscript + " " + clean).trim();
    setFullTranscript(nextTranscript);
    setTyped("");
    setOptionsFor(null);
    setBusy(true);
    setError(null);
    if (picked) setAnswer(picked.id, picked.value);
    const sentAnswers = picked ? { ...answers, [picked.id]: picked.value } : answers;

    try {
      const res = await fetch("/api/intake/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: nextTranscript, answers: sentAnswers, skipExtraction: Boolean(picked) }),
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
        const q = QUESTION_BY_ID[data.next.questionId];
        if (q?.type === "single" && q.options) setOptionsFor({ id: q.id, options: q.options });
        else if (q && (q.type === "short" || q.type === "long")) setAskingText(q.id);
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

      {optionsFor && !busy && !finished && (
        <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Choose an answer">
          {optionsFor.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => void submitReply(option, { id: optionsFor.id, value: option })}
              className="tap-target rounded-full border border-accent bg-white px-4 py-2 text-sm font-medium text-accent hover:bg-blue-50"
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 text-warn">{error}</p>}

      {!finished && !category && conversation.length <= 1 ? (
        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="What kind of incident was it?">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => chooseCategory(c)}
              className="tap-target flex flex-col items-start rounded-2xl border border-slate-300 bg-white px-5 py-4 text-left transition hover:border-accent hover:bg-blue-50"
            >
              <span className="text-lg font-semibold text-slate-900">{c.label}</span>
              <span className="mt-0.5 text-sm text-slate-500">{c.hint}</span>
            </button>
          ))}
        </div>
      ) : !finished ? (
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

          {/* Demo quick-fill: only offered before the reporter has told the story */}
          {conversation.length <= 3 && (
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
