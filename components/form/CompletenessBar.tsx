"use client";

import type { Answers } from "@/lib/types";
import { completeness, missingRequired } from "./logic";

// "31 of 35 answered" with a thin blue progress bar and required status badge.
export function CompletenessBar({ answers }: { answers: Answers }) {
  const { answered, total } = completeness(answers);
  const missingReq = missingRequired(answers).length;
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">
            {answered} of {total} visible questions answered
          </span>
          {missingReq === 0 ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              All required complete ✓
            </span>
          ) : (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {missingReq} required remaining
            </span>
          )}
        </div>
        <span className="font-mono text-xs font-bold text-accent">{pct}%</span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
