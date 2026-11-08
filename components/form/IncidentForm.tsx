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
      {SECTIONS.map((section) => {
        const qs = questions.filter(
          (q) => q.section === section && isVisible(q, answers)
        );
        if (qs.length === 0) return null;
        return (
          <section key={section} className="mb-8">
            <h2 className="mb-4 border-b border-slate-200 pb-2 text-lg font-semibold text-slate-800">
              {section}
            </h2>
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
  );
}
