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
// one blue accent, accessible labels and ARIA attributes.
export function Field({ q, value, onChange, aiFilled, invalid }: FieldProps) {
  const inputId = `field-${q.id}`;
  const helpId = q.help ? `help-${q.id}` : undefined;

  return (
    <div
      className={`mb-5 rounded-xl border p-4 transition ${
        invalid
          ? "border-amber-300 bg-amber-50/40"
          : aiFilled
            ? "border-blue-200 bg-blue-50/25"
            : "border-slate-200/80 bg-slate-50/40"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <label
          htmlFor={inputId}
          className="text-base font-semibold leading-snug text-slate-900"
        >
          <span>{q.label}</span>
          {q.required && (
            <span className="ml-1 text-accent" title="Required">
              *
            </span>
          )}
        </label>
        <div className="flex items-center gap-1.5">
          {aiFilled && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-accent">
              AI-filled — check
            </span>
          )}
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
            {q.id.toUpperCase()}
          </span>
        </div>
      </div>

      {q.help && (
        <p id={helpId} className="mb-2.5 text-xs leading-relaxed text-slate-500">
          {q.help}
        </p>
      )}

      <FieldInput
        q={q}
        value={value}
        onChange={onChange}
        invalid={invalid}
        inputId={inputId}
        helpId={helpId}
      />

      {invalid && (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-warn">
          This answer is required before submitting.
        </p>
      )}
    </div>
  );
}

function FieldInput({
  q,
  value,
  onChange,
  invalid,
  inputId,
  helpId,
}: Omit<FieldProps, "aiFilled"> & { inputId: string; helpId?: string }) {
  const base =
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-slate-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 " +
    (invalid ? "border-warn" : "border-slate-300");

  switch (q.type) {
    case "date":
      return (
        <input
          id={inputId}
          type="date"
          aria-invalid={invalid}
          aria-describedby={helpId}
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "time":
      return (
        <input
          id={inputId}
          type="text"
          inputMode="text"
          placeholder="e.g. 2:30 PM"
          aria-invalid={invalid}
          aria-describedby={helpId}
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "short":
      return (
        <input
          id={inputId}
          type="text"
          aria-invalid={invalid}
          aria-describedby={helpId}
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "long":
      return (
        <textarea
          id={inputId}
          rows={4}
          aria-invalid={invalid}
          aria-describedby={helpId}
          className={base}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "single":
      return (
        <div
          role="radiogroup"
          aria-labelledby={inputId}
          className="grid gap-2 sm:grid-cols-2"
        >
          {q.options?.map((opt) => {
            const selected = value === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => onChange(opt)}
                className={
                  "tap-target flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition " +
                  (selected
                    ? "border-accent bg-accent-light font-semibold text-accent shadow-2xs"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50")
                }
                aria-pressed={selected}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? "●" : ""}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      );
    case "multi": {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (opt: string) => {
        onChange(
          arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt],
        );
      };
      return (
        <div
          role="group"
          aria-labelledby={inputId}
          className="grid gap-2 sm:grid-cols-2"
        >
          {q.options?.map((opt) => {
            const selected = arr.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className={
                  "tap-target flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm transition " +
                  (selected
                    ? "border-accent bg-accent-light font-semibold text-accent shadow-2xs"
                    : "border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50")
                }
                aria-pressed={selected}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    selected
                      ? "border-accent bg-accent text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {selected ? "✓" : ""}
                </span>
                <span>{opt}</span>
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
