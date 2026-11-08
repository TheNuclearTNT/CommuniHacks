"use client";

import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { Field } from "@/components/form/Field";
import { QUESTION_BY_ID } from "@/components/form/questions";
import { missingRequired } from "@/components/form/logic";
import { BackLink } from "@/components/form/BackLink";

// /report/questions — one missing required question per screen, big buttons.
export default function QuestionsPage() {
  const router = useRouter();
  const { answers, setAnswer, hydrated } = useReportDraft();

  if (!hydrated) return null;

  const missing = missingRequired(answers);

  // Nothing left to ask — move on.
  if (missing.length === 0) {
    router.replace("/report/extras");
    return null;
  }

  const id = missing[0];
  const q = QUESTION_BY_ID[id];
  const total = missing.length;

  return (
    <main>
      <BackLink href="/report/check" label="Back to all answers" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          Step 2 of 4 · Required Questions
        </span>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          {total} {total === 1 ? "question" : "questions"} left
        </span>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <Field
          q={q}
          value={answers[id as `q${number}`]}
          onChange={(v) => setAnswer(id, v)}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="tap-target flex-1 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
        >
          View all questions
        </button>
        <button
          type="button"
          onClick={() => {
            const stillMissing = missingRequired(answers);
            if (stillMissing.length <= 1) router.push("/report/extras");
          }}
          className="tap-target flex-1 rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs hover:bg-blue-800"
        >
          Next →
        </button>
      </div>
    </main>
  );
}
