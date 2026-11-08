"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Answers } from "@/lib/types";
import { useReportDraft } from "@/components/form/useReportDraft";
import { useAssistantVoice } from "@/components/form/useAssistantVoice";
import { getMe, transcribeIntake } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";
import { AnonymousToggle } from "@/components/form/AnonymousToggle";
import { QUESTION_BY_ID } from "@/components/form/questions";
import { DEMO_STORIES } from "@/lib/ai/demo-fixtures";
import { ontarioToday, parseDatePhrase, parseTimePhrase } from "@/lib/ai/parse-when";

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

// Everything one turn of the conversation can change, saved just before the
// turn so "Undo my last answer" can put it all back.
interface Snapshot {
  conversation: Turn[];
  fullTranscript: string;
  askCount: number;
  category: (typeof CATEGORIES)[number] | null;
  optionsFor: { id: string; options: string[] } | null;
  askingText: string | null;
  askingWhen: { id: string; type: "date" | "time" } | null;
  lastAsked: string | null;
  canSkip: string | null;
  skipIds: string[];
  finished: boolean;
  checkedIds: string[];
  quickCheckDone: boolean;
  answers: Answers;
  aiFilled: Set<string>;
  draftTranscript: string | undefined;
  // What the reporter typed or said, put back in the box so they can edit it.
  replyText: string;
}

// /report/describe — an AI-led conversation. The assistant asks (out loud via
// ElevenLabs when a key is set, otherwise on screen), the reporter speaks or
// types, and the AI decides which of the 35 questions actually matter for this
// incident. It never asks irrelevant branches (e.g. injury on an IT issue).
// The ?site= a QR poster put in the link (read on the client only).
const subscribeNothing = () => () => {};
const readSiteParam = () => new URLSearchParams(window.location.search).get("site") ?? "";

export default function DescribePage() {
  const router = useRouter();
  const {
    answers,
    setAnswer,
    mergeAiAnswers,
    transcript: draftTranscript,
    setTranscript,
    aiFilled,
    anonymous,
    setAnonymous,
    hydrated,
    restoreDraft,
  } = useReportDraft();

  // Opened from a site's QR poster (?site=…): the location is already known.
  const qrSite = useSyncExternalStore(subscribeNothing, readSiteParam, () => "");
  useEffect(() => {
    if (!hydrated || !qrSite || answers.q5) return;
    if (QUESTION_BY_ID.q5?.options?.includes(qrSite)) setAnswer("q5", qrSite);
  }, [hydrated, qrSite, answers.q5, setAnswer]);

  // The reporter is whoever is signed in, so the assistant never has to ask.
  useEffect(() => {
    if (!hydrated || answers.q3 || anonymous) return;
    getMe()
      .then((me) => me.name && setAnswer("q3", me.name))
      .catch(() => {});
  }, [hydrated, answers.q3, anonymous, setAnswer]);

  const chooseAnonymous = (value: boolean) => {
    setAnonymous(value);
    // Off again: clear it so the signed-in name is filled back in.
    setAnswer("q3", value ? "Anonymous" : "");
  };

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
  // Quick check: answers the AI filled without asking are shown for the
  // reporter to confirm before the review page. Ids changed here stay listed.
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [quickCheckDone, setQuickCheckDone] = useState(false);
  const [askCount, setAskCount] = useState(0);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  // Tap-to-answer choices for the assistant's current multiple-choice question.
  const [optionsFor, setOptionsFor] = useState<{ id: string; options: string[] } | null>(null);
  // The free-text question the assistant just asked: a typed reply answers it
  // directly (short replies like "Not applicable" are too thin for the AI).
  const [askingText, setAskingText] = useState<string | null>(null);
  // A date or time question: typed phrases are parsed, and pickers are shown.
  const [askingWhen, setAskingWhen] = useState<{ id: string; type: "date" | "time" } | null>(null);
  const [whenValue, setWhenValue] = useState("");
  // Loop guard: the question asked last, the one that can be skipped, and skips so far.
  const [lastAsked, setLastAsked] = useState<string | null>(null);
  const [canSkip, setCanSkip] = useState<string | null>(null);
  const [skipIds, setSkipIds] = useState<string[]>([]);
  // One snapshot per answer given, newest last. Undo pops the last one.
  const [history, setHistory] = useState<Snapshot[]>([]);
  // The assistant's voice (ElevenLabs): speak, stop, mute, and what to show.
  const { voiceOn, speaking, needsTap, voiceStatus, speak, stopSpeaking, toggleVoice } =
    useAssistantVoice();

  const takeSnapshot = (replyText: string) =>
    setHistory((h) => [
      ...h,
      {
        conversation,
        fullTranscript,
        askCount,
        category,
        optionsFor,
        askingText,
        askingWhen,
        lastAsked,
        canSkip,
        skipIds,
        finished,
        checkedIds,
        quickCheckDone,
        answers,
        aiFilled: new Set(aiFilled),
        draftTranscript,
        replyText,
      },
    ]);

  const chooseCategory = (c: (typeof CATEGORIES)[number]) => {
    takeSnapshot("");
    setCategory(c);
    setFullTranscript(c.context);
    setConversation((conv) => [...conv, { who: "you", text: c.label }, { who: "ai", text: c.ask }]);
    void speak(c.ask);
  };

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Speak the opening question when the page opens.
  useEffect(() => {
    const timer = setTimeout(() => void speak(OPENING), 0);
    return () => clearTimeout(timer);
  }, [speak]);



  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    // The assistant must be quiet while you speak, or the mic would record it.
    stopSpeaking();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        // Label the recording with what the browser really made (Safari records
        // MP4, Chrome and Firefox record WebM or Ogg).
        const type = mr.mimeType || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
        await handleSpoken(new File(chunksRef.current, `recording.${ext}`, { type }));
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
      if (!transcript.trim()) {
        setError("I didn't hear anything. Tap the mic and try again, or type your answer.");
        setBusy(false);
        return;
      }
      await submitReply(transcript);
    } catch {
      setError("Couldn't hear that. Try again, or type your answer.");
      setBusy(false);
    }
  };

  // Send the reporter's reply into the conversation and act on the AI's turn.
  // `picked` is set when the reporter taps one of the answer chips: that answer
  // goes straight into the form instead of relying on the AI to map the words.
  const submitReply = async (
    reply: string,
    pickedChip?: { id: string; value: string },
    extraSkip?: string,
  ) => {
    const clean = reply.trim();
    if (!clean) {
      setBusy(false);
      return;
    }
    // Save how things stand, so this answer can be undone. A tapped chip has no
    // text worth putting back in the box; a typed or spoken answer does.
    stopSpeaking();
    takeSnapshot(pickedChip || extraSkip ? "" : clean);
    // A typed date/time ("10th sept", "last night", "10 pm") is read here, without AI.
    const parsedWhen =
      askingWhen?.type === "date"
        ? parseDatePhrase(clean)
        : askingWhen?.type === "time"
          ? parseTimePhrase(clean)
          : null;
    const picked =
      pickedChip ??
      (askingText ? { id: askingText, value: clean } : undefined) ??
      (askingWhen && parsedWhen ? { id: askingWhen.id, value: parsedWhen } : undefined);
    setAskingText(null);
    setAskingWhen(null);
    setCanSkip(null);
    setConversation((c) => [...c, { who: "you", text: clean }]);
    const nextTranscript = (fullTranscript + " " + clean).trim();
    setFullTranscript(nextTranscript);
    setTyped("");
    setOptionsFor(null);
    setBusy(true);
    setError(null);
    if (picked) setAnswer(picked.id, picked.value);
    if (extraSkip) setSkipIds((ids) => [...ids, extraSkip]);
    setWhenValue("");
    const sentAnswers = picked ? { ...answers, [picked.id]: picked.value } : answers;

    try {
      const res = await fetch("/api/intake/converse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: nextTranscript,
          answers: sentAnswers,
          skipExtraction: Boolean(picked) || Boolean(extraSkip),
          skipIds: extraSkip ? [...skipIds, extraSkip] : skipIds,
        }),
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
        const q = QUESTION_BY_ID[data.next.questionId];
        // Same question again → the last reply didn't answer it. Say so and
        // offer a way past it instead of repeating forever.
        if (data.next.questionId === lastAsked) {
          pushAi("Sorry, I didn't catch that. You can pick an answer below, or skip it and fill it in on the review page.");
          setCanSkip(data.next.questionId);
        } else {
          pushAi(data.next.question);
        }
        setLastAsked(data.next.questionId);
        if (q?.type === "single" && q.options) setOptionsFor({ id: q.id, options: q.options });
        else if (q && (q.type === "short" || q.type === "long")) setAskingText(q.id);
        else if (q && (q.type === "date" || q.type === "time")) setAskingWhen({ id: q.id, type: q.type });
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

  // Take back the last answer: the conversation, the form answers and the
  // question being asked all go back to how they were. What was typed or said
  // comes back in the box to edit, and the question is read out again so the
  // reporter can simply record a new answer.
  const undoLast = () => {
    const snap = history[history.length - 1];
    if (!snap || busy || recording) return;
    stopSpeaking();
    setHistory((h) => h.slice(0, -1));
    setConversation(snap.conversation);
    setFullTranscript(snap.fullTranscript);
    setAskCount(snap.askCount);
    setCategory(snap.category);
    setOptionsFor(snap.optionsFor);
    setAskingText(snap.askingText);
    setAskingWhen(snap.askingWhen);
    setLastAsked(snap.lastAsked);
    setCanSkip(snap.canSkip);
    setSkipIds(snap.skipIds);
    setFinished(snap.finished);
    setCheckedIds(snap.checkedIds);
    setQuickCheckDone(snap.quickCheckDone);
    restoreDraft(snap.answers, snap.aiFilled);
    setTranscript(snap.draftTranscript);
    setTyped(snap.replyText);
    setWhenValue("");
    setError(null);
    const lastQuestion = [...snap.conversation].reverse().find((t) => t.who === "ai")?.text;
    if (lastQuestion) void speak(lastQuestion);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Answers the AI filled that the reporter hasn't confirmed, in form order.
  // The reporter's own name and description are left out.
  const quickCheckRows = [...new Set([...aiFilled, ...checkedIds])]
    .filter((id) => id !== "q3" && id !== "q32")
    .map((id) => QUESTION_BY_ID[id])
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .filter((q) => {
      const v = answers[q.id as `q${number}`];
      return v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
    })
    .sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));

  const lastAiText = [...conversation].reverse().find((t) => t.who === "ai")?.text ?? OPENING;

  if (!hydrated) return null;

  return (
    <main>
      <BackLink href="/report" label="Back to start" />
      <h1 className="mb-1 text-2xl font-bold">Tell us what happened</h1>
      <p className="mb-6 text-slate-500">
        Answer in your own words. I&apos;ll only ask what matters for your
        situation.
      </p>

      <AnonymousToggle anonymous={anonymous} onChange={chooseAnonymous} />

      {qrSite && answers.q5 === qrSite && (
        <p className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Reporting from <strong>{qrSite}</strong> (from the QR code).
        </p>
      )}

      {/* Voice controls: the assistant reads its questions aloud (ElevenLabs) */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Voice controls">
        {voiceStatus !== "unavailable" && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={voiceOn}
            className={
              "rounded-full border px-3 py-1.5 font-medium " +
              (voiceOn
                ? "border-accent bg-blue-50 text-accent"
                : "border-slate-300 bg-white text-slate-600")
            }
          >
            Voice: {voiceOn ? "on" : "off"}
          </button>
        )}
        {speaking && (
          <>
            <span role="status" className="text-slate-500">
              Speaking…
            </span>
            <button
              type="button"
              onClick={stopSpeaking}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-600 hover:border-accent"
            >
              Stop
            </button>
          </>
        )}
        {needsTap && !speaking && (
          <button
            type="button"
            onClick={() => void speak(lastAiText, true)}
            className="rounded-full bg-accent px-3 py-1.5 font-medium text-white hover:bg-blue-800"
          >
            Play the question
          </button>
        )}
        {voiceStatus === "unavailable" && (
          <span className="text-xs text-slate-400">
            Voice is off right now. You can still read and type your answers.
          </span>
        )}
      </div>

      {/* Conversation */}
      <div className="mb-6 flex flex-col gap-3">
        {conversation.map((t, i) => (
          <div
            key={i}
            className={t.who === "ai" ? "flex items-end gap-2" : "flex justify-end"}
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
            {t.who === "ai" && voiceStatus !== "unavailable" && (
              <button
                type="button"
                onClick={() => void speak(t.text, true)}
                aria-label="Play this message"
                className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:border-accent hover:text-accent"
              >
                Play
              </button>
            )}
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

      {askingWhen && !busy && !finished && (
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Choose a date or time">
          {askingWhen.type === "date" &&
            (["Today", "Yesterday"] as const).map((label, back) => {
              const d = ontarioToday();
              d.setDate(d.getDate() - back);
              const value = d.toLocaleDateString("en-CA");
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => void submitReply(label, { id: askingWhen.id, value })}
                  className="tap-target rounded-full border border-accent bg-white px-4 py-2 text-sm font-medium text-accent hover:bg-blue-50"
                >
                  {label}
                </button>
              );
            })}
          <input
            type={askingWhen.type}
            value={whenValue}
            max={askingWhen.type === "date" ? ontarioToday().toLocaleDateString("en-CA") : undefined}
            onChange={(e) => setWhenValue(e.target.value)}
            aria-label={askingWhen.type === "date" ? "Pick the date" : "Pick the time"}
            className="tap-target rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={!whenValue}
            onClick={() => {
              const value = askingWhen.type === "time" ? parseTimePhrase(whenValue) ?? whenValue : whenValue;
              void submitReply(value, { id: askingWhen.id, value });
            }}
            className="tap-target rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Use this {askingWhen.type}
          </button>
        </div>
      )}

      {canSkip && !busy && !finished && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => void submitReply("Skip — I'll fill this in on the review page.", undefined, canSkip)}
            className="tap-target rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Skip, I&apos;ll fill it in later
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-warn">{error}</p>}

      {/* Undo: take back the last answer, then record or type it again */}
      {history.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undoLast}
            disabled={busy || recording}
            className="tap-target rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-accent hover:text-accent disabled:opacity-50"
          >
            ↶ Undo my last answer
          </button>
          <span className="text-xs text-slate-400">Then record it again or retype it.</span>
        </div>
      )}

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
              ref={inputRef}
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
        <>
          {quickCheckRows.length > 0 && !quickCheckDone && (
            <section
              aria-label="Check what I filled in"
              className="mb-4 rounded-2xl border border-amber-300 bg-amber-50/60 p-4"
            >
              <p className="font-semibold text-slate-900">Before you review: please check what I filled in</p>
              <p className="mb-3 text-sm text-slate-600">
                I didn&apos;t ask you these. I filled them in from your story. Tap to change any that are wrong.
              </p>
              <ul className="space-y-3">
                {quickCheckRows.map((q) => {
                  const value = answers[q.id as `q${number}`];
                  return (
                    <li key={q.id} className="rounded-xl bg-white p-3">
                      <p className="text-sm font-medium text-slate-800">{q.label}</p>
                      {q.type === "single" && q.options && q.options.length <= 6 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {q.options.map((option) => (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={value === option}
                              onClick={() => {
                                setAnswer(q.id, option);
                                setCheckedIds((ids) => (ids.includes(q.id) ? ids : [...ids, q.id]));
                              }}
                              className={
                                "rounded-full border px-3 py-1.5 text-sm " +
                                (value === option
                                  ? "border-accent bg-accent text-white"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-accent")
                              }
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">
                          {Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                          <span className="ml-2 text-xs text-slate-400">(change on the review page)</span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setQuickCheckDone(true)}
                className="tap-target mt-4 w-full rounded-xl bg-accent px-5 py-3 font-semibold text-white"
              >
                These look right
              </button>
            </section>
          )}
          {(quickCheckRows.length === 0 || quickCheckDone) && (
            <button
              type="button"
              onClick={() => router.push("/report/check")}
              className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
            >
              Review my report
            </button>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="inline-block min-h-11 px-3 py-3 text-sm text-slate-500 underline"
        >
          Skip the conversation and fill the form myself
        </button>
      </div>
    </main>
  );
}
