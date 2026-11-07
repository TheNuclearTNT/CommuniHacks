"use client";

import type { Answers } from "@/lib/types";

// localStorage-backed draft so a refresh doesn't lose a half-finished report.
// Everything is wrapped in try/catch — storage can be unavailable (private
// mode, quota), and a broken draft must never block reporting.

const KEY = "langs-safereport-draft";

export interface Draft {
  answers: Answers;
  transcript?: string;
  footageHoldRequested?: boolean;
}

export function loadDraft(): Draft {
  if (typeof window === "undefined") return { answers: {} };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { answers: {} };
    const parsed = JSON.parse(raw) as Draft;
    return { ...parsed, answers: parsed.answers ?? {} };
  } catch {
    return { answers: {} };
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore storage failures */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
