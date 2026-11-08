"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { Answers, AnswerValue } from "@/lib/types";
import { clearHidden } from "./logic";
import { loadDraft, saveDraft, clearDraft, type Draft } from "./draft";

// No external store to subscribe to — the snapshot never changes after mount,
// so the subscribe callback is a no-op returning an unsubscribe.
function subscribeNoop(): () => void {
  return () => {};
}

// Hook holding the in-progress report, persisted to localStorage.
// aiFilled tracks which fields the AI set (for the "AI-filled" label).
export function useReportDraft() {
  // Lazy initial read from localStorage (SSR-safe: loadDraft guards `window`,
  // returning an empty draft on the server). The functional initializer runs
  // once on mount, so this avoids a setState-in-effect hydration pass (React 19
  // flags that) while keeping the saved draft on the first client render.
  const [answers, setAnswers] = useState<Answers>(
    () => loadDraft().answers ?? {}
  );
  const [transcript, setTranscript] = useState<string | undefined>(
    () => loadDraft().transcript
  );
  const [footageHoldRequested, setFootageHold] = useState(() =>
    Boolean(loadDraft().footageHoldRequested)
  );
  const [anonymous, setAnonymous] = useState(() => Boolean(loadDraft().anonymous));
  const [aiFilled, setAiFilled] = useState<Set<string>>(
    () => new Set(loadDraft().aiFilled ?? [])
  );

  // `hydrated` guards against an SSR/client markup mismatch: it reads false on
  // the server and during the first client render, then true once mounted.
  // useSyncExternalStore is the React-19 way to surface client-only state
  // without a setState-in-effect (which the react-hooks rule flags).
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true, // client snapshot
    () => false // server snapshot
  );

  // Persist on change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    const d: Draft = { answers, transcript, footageHoldRequested, aiFilled: [...aiFilled], anonymous };
    saveDraft(d);
  }, [answers, transcript, footageHoldRequested, aiFilled, anonymous, hydrated]);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    setAnswers((prev) => {
      const next = clearHidden({ ...prev, [id]: value });
      return next;
    });
    // A manual edit clears the AI-filled flag for that field.
    setAiFilled((prev) => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  // Merge AI-extracted answers and remember which keys the AI filled.
  const mergeAiAnswers = useCallback((merged: Answers) => {
    setAnswers((prev) => {
      const filledKeys = new Set<string>();
      for (const [k, v] of Object.entries(merged)) {
        const before = prev[k as `q${number}`];
        const emptyBefore =
          before === null ||
          before === undefined ||
          (typeof before === "string" && before.trim() === "") ||
          (Array.isArray(before) && before.length === 0);
        if (emptyBefore && v != null) filledKeys.add(k);
      }
      setAiFilled((old) => new Set([...old, ...filledKeys]));
      return clearHidden(merged);
    });
  }, []);

  const reset = useCallback(() => {
    setAnswers({});
    setTranscript(undefined);
    setFootageHold(false);
    setAiFilled(new Set());
    setAnonymous(false);
    clearDraft();
  }, []);

  return {
    answers,
    setAnswer,
    mergeAiAnswers,
    transcript,
    setTranscript,
    footageHoldRequested,
    setFootageHold,
    aiFilled,
    anonymous,
    setAnonymous,
    hydrated,
    reset,
  };
}
