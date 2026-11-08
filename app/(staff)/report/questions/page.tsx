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
  // Position of this question among the originally-missing set.
  const total = missing.length;

  return (
    <main>
      <BackLink href="/report/check" label="Back to all answers" />
      <p className="mb-4 text-sm text-slate-500">
        {1} of {total} to answer
      </p>
      <Field
        q={q}
        value={answers[id as `q${number}`]}
        onChange={(v) => setAnswer(id, v)}
      />

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/report/check")}
          className="tap-target flex-1 rounded-xl border border-slate-300 px-5 py-4 text-lg"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            // Re-evaluate; if more remain, this page re-renders the next one.
            const stillMissing = missingRequired(answers);
            if (stillMissing.length <= 1) router.push("/report/extras");
            // else: staying on the page shows the next missing question
          }}
          className="tap-target flex-1 rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
        >
          Next
        </button>
      </div>
    </main>
  );
}
