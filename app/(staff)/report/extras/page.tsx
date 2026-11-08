"use client";

import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { QUESTION_BY_ID } from "@/components/form/questions";
import { Field } from "@/components/form/Field";
import { BackLink } from "@/components/form/BackLink";

// /report/extras — footage hold toggle, q34 Critical Incident Debrief,
// q33 follow-up suggestions.
export default function ExtrasPage() {
  const router = useRouter();
  const {
    answers,
    setAnswer,
    footageHoldRequested,
    setFootageHold,
    hydrated,
  } = useReportDraft();

  if (!hydrated) return null;

  return (
    <main>
      <BackLink href="/report/check" label="Back to form answers" />

      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
        <span>Step 3 of 4</span>
        <span className="text-slate-300">·</span>
        <span>Camera Hold & Debrief Options</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        A few helpful extras
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Optional flags that help IT / Facilities and your supervisor act right away.
      </p>

      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span>
              <span className="block text-base font-semibold text-slate-900">
                Might this incident be on security camera?
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Requests an immediate camera footage hold so IT / Facilities preserves the clip before overwrite.
              </span>
            </span>
            <input
              type="checkbox"
              checked={footageHoldRequested}
              onChange={(e) => setFootageHold(e.target.checked)}
              className="h-6 w-6 shrink-0 rounded accent-accent"
            />
          </label>
        </div>

        <Field
          q={QUESTION_BY_ID["q34"]}
          value={answers.q34}
          onChange={(v) => setAnswer("q34", v)}
        />

        <Field
          q={QUESTION_BY_ID["q33"]}
          value={answers.q33}
          onChange={(v) => setAnswer("q33", v)}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="tap-target flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => router.push("/report/review")}
          className="tap-target flex-1 rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs hover:bg-blue-800"
        >
          Review before sending →
        </button>
      </div>
    </main>
  );
}
