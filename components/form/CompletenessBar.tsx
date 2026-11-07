"use client";

import type { Answers } from "@/lib/types";
import { completeness } from "./logic";

// "31 of 35 answered" with a thin blue progress bar.
export function CompletenessBar({ answers }: { answers: Answers }) {
  const { answered, total } = completeness(answers);
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm text-slate-600">
        <span>
          {answered} of {total} answered
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
