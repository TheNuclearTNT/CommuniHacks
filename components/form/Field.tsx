"use client";

import type { AnswerValue } from "@/lib/types";
import type { Question } from "./questions";

interface FieldProps {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  aiFilled?: boolean;
  invalid?: boolean;
}

// Renders a single question by type. Large tap targets, sentence-case labels,
// one blue accent. No external UI lib — keeps Mathew's folder self-contained.
export function Field({ q, value, onChange, aiFilled, invalid }: FieldProps) {
  return (
    <div className="mb-5">
      <label className="mb-1 flex items-start gap-2 text-base font-medium text-slate-900">
        <span>
          {q.label}
          {q.required && <span className="ml-1 text-accent">*</span>}
        </span>
        {aiFilled && (
          <span className="mt-0.5 rounded bg-accent-light px-1.5 py-0.5 text-xs font-normal text-accent">
            AI-filled — check
          </span>
        )}
      </label>
      {q.help && <p className="mb-2 text-sm text-slate-500">{q.help}</p>}
      <FieldInput q={q} value={value} onChange={onChange} invalid={invalid} />
      {invalid && (
        <p className="mt-1 text-sm text-warn">This answer is needed.</p>
      )}
    </div>
  );
}

function FieldInput({
  q,
  value,
  onChange,
  invalid,
}: Omit<FieldProps, "aiFilled">) {
  const base =
    "w-full rounded-lg border px-3 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 " +
    (invalid ? "border-warn" : "border-slate-300");

  switch (q.type) {
    case "date":
      return (
        <input
          type="date"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "time":
      return (
        <input
          type="text"
          inputMode="text"
          placeholder="e.g. 3:30PM"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "short":
      return (
        <input
          type="text"
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "long":
      return (
        <textarea
          rows={4}
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "single":
      return (
        <div className="flex flex-col gap-2">
          {q.options?.map((opt) => {
            const selected = value === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange(opt)}
                className={
                  "tap-target rounded-lg border px-4 py-3 text-left text-base " +
                  (selected
                    ? "border-accent bg-accent-light font-medium text-accent"
                    : "border-slate-300 bg-white text-slate-900")
                }
                aria-pressed={selected}
              >
                {opt}
              </button>
            );
          })}
        </div>
      );
    case "multi": {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        onChange(
          arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]
        );
      };
      return (
        <div className="flex flex-col gap-2">
          {q.options?.map((opt) => {
            const selected = arr.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className={
                  "tap-target rounded-lg border px-4 py-3 text-left text-base " +
                  (selected
                    ? "border-accent bg-accent-light font-medium text-accent"
                    : "border-slate-300 bg-white text-slate-900")
                }
                aria-pressed={selected}
              >
                <span className="mr-2">{selected ? "☑" : "☐"}</span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }
    default:
      return null;
  }
}
