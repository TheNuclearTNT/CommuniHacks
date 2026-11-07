"use client";

import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { QUESTION_BY_ID } from "@/components/form/questions";
import { Field } from "@/components/form/Field";

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
      <h1 className="mb-1 text-2xl font-bold">A few extras</h1>
      <p className="mb-6 text-slate-500">Optional, but helpful for follow-up.</p>

      <div className="mb-6 rounded-lg border border-slate-200 p-4">
        <label className="flex items-center justify-between">
          <span className="pr-4 text-base font-medium">
            Might this be on camera?
            <span className="block text-sm font-normal text-slate-500">
              We’ll ask facilities to preserve the footage.
            </span>
          </span>
          <input
            type="checkbox"
            checked={footageHoldRequested}
            onChange={(e) => setFootageHold(e.target.checked)}
            className="h-6 w-6 accent-[#1d4ed8]"
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

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="tap-target flex-1 rounded-xl border border-slate-300 px-5 py-4 text-lg"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => router.push("/report/review")}
          className="tap-target flex-1 rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
        >
          Review
        </button>
      </div>
    </main>
  );
}
