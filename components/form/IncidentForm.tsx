"use client";

import type { Answers, AnswerValue } from "@/lib/types";
import { QUESTIONS, SECTIONS, type Question } from "./questions";
import { isVisible } from "./logic";
import { Field } from "./Field";
import { CompletenessBar } from "./CompletenessBar";

interface IncidentFormProps {
  answers: Answers;
  onChange: (id: string, value: AnswerValue) => void;
  aiFilled?: Set<string>;
  invalidIds?: string[];
  // Optional live/edited question set (from the portal form editor). When
  // omitted, the baseline config is used.
  questions?: Question[];
}

const SECTION_TITLES: Record<string, string> = {
  "incident details": "Section 1 · Incident Details",
  "type of incident": "Section 2 · Type of Incident & Triggers",
  summary: "Section 3 · Narrative Summary & Follow-up",
};

// The full 35-question form, grouped by section, with a completeness bar.
// Conditional questions appear only when their parent reveals them.
export function IncidentForm({
  answers,
  onChange,
  aiFilled,
  invalidIds = [],
  questions = QUESTIONS,
}: IncidentFormProps) {
  const invalid = new Set(invalidIds);

  return (
    <div>
      <CompletenessBar answers={answers} />
      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const qs = questions.filter(
            (q) => q.section === section && isVisible(q, answers),
          );
          if (qs.length === 0) return null;
          return (
            <section
              key={section}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  {SECTION_TITLES[section] ?? section}
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {qs.length} {qs.length === 1 ? "question" : "questions"}
                </span>
              </div>
              {qs.map((q) => (
                <Field
                  key={q.id}
                  q={q}
                  value={answers[q.id as `q${number}`]}
                  onChange={(v) => onChange(q.id, v)}
                  aiFilled={aiFilled?.has(q.id)}
                  invalid={invalid.has(q.id)}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
