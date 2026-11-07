import type { Answers, AnswerValue } from "@/lib/types";
import { QUESTIONS, QUESTION_BY_ID, type Question } from "./questions";

/** True when a single answer value is empty (null / "" / []). */
export function isEmpty(value: AnswerValue | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * A question is visible when it has no showIf, or when the parent answer
 * matches. For a multi-select parent (array answer), match if the array
 * includes the required value.
 */
export function isVisible(q: Question, answers: Answers): boolean {
  if (!q.showIf) return true;
  for (const [parentId, needed] of Object.entries(q.showIf)) {
    const parentVal = answers[parentId as `q${number}`];
    if (Array.isArray(parentVal)) {
      if (!parentVal.includes(needed)) return false;
    } else if (parentVal !== needed) {
      return false;
    }
  }
  return true;
}

/** All questions currently visible, in config order. */
export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => isVisible(q, answers));
}

/** Ids of questions that are visible, required, and still empty. */
export function missingRequired(answers: Answers): string[] {
  return visibleQuestions(answers)
    .filter((q) => q.required && isEmpty(answers[q.id as `q${number}`]))
    .map((q) => q.id);
}

/**
 * Remove answers for questions that are no longer visible given the current
 * answers (e.g. parent toggled from Yes to No). Returns a new Answers object.
 */
export function clearHidden(answers: Answers): Answers {
  const next: Answers = { ...answers };
  for (const q of QUESTIONS) {
    if (!isVisible(q, next) && q.id in next) {
      delete next[q.id as `q${number}`];
    }
  }
  return next;
}

/** Count of visible questions that have a non-empty answer. */
export function answeredCount(answers: Answers): number {
  return visibleQuestions(answers).filter(
    (q) => !isEmpty(answers[q.id as `q${number}`])
  ).length;
}

/** Completeness as { answered, total } over visible questions. */
export function completeness(answers: Answers): { answered: number; total: number } {
  const visible = visibleQuestions(answers);
  const answered = visible.filter(
    (q) => !isEmpty(answers[q.id as `q${number}`])
  ).length;
  return { answered, total: visible.length };
}

export { QUESTION_BY_ID };
