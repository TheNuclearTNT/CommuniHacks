"use client";

import { useEffect, useState } from "react";
import { QUESTIONS, type Question } from "./questions";

// Loads the live question config (edited in the portal form editor) and merges
// the editable fields — label, help, options, required — over the baseline.
// Question ids and types are never changed, so the form engine still works.
// Falls back to the baseline if the API is unreachable.
export function useLiveQuestions(): Question[] {
  const [questions, setQuestions] = useState<Question[]>(QUESTIONS);

  useEffect(() => {
    let live = true;
    fetch("/api/form-config")
      .then((r) => r.json())
      .then((cfg: { questions?: Partial<Question>[] }) => {
        if (!live || !Array.isArray(cfg.questions)) return;
        const byId = new Map(cfg.questions.map((q) => [q.id, q]));
        setQuestions(
          QUESTIONS.map((base) => {
            const edit = byId.get(base.id);
            if (!edit) return base;
            return {
              ...base,
              label: edit.label ?? base.label,
              help: edit.help ?? base.help,
              required:
                typeof edit.required === "boolean"
                  ? edit.required
                  : base.required,
              options: edit.options ?? base.options,
            };
          }),
        );
      })
      .catch(() => {
        /* keep baseline */
      });
    return () => {
      live = false;
    };
  }, []);

  return questions;
}
