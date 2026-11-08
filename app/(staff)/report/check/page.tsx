"use client";

import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { IncidentForm } from "@/components/form/IncidentForm";
import { missingRequired } from "@/components/form/logic";
import { useLiveQuestions } from "@/components/form/useLiveConfig";
import { BackLink } from "@/components/form/BackLink";

// /report/check — the full form as tap-to-edit rows, AI-filled rows flagged.
// This is also the manual entry point (works with voice/AI off).
export default function CheckPage() {
  const router = useRouter();
  const { answers, setAnswer, aiFilled, hydrated } = useReportDraft();
  const questions = useLiveQuestions();

  if (!hydrated) return null;

  const missing = missingRequired(answers);

  const next = () => {
    if (missing.length > 0) {
      router.push("/report/questions");
    } else {
      router.push("/report/extras");
    }
  };

  return (
    <main className="pb-20">
      <BackLink href="/report" label="Back to start" />

      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
        <span>Step 2 of 4</span>
        <span className="text-slate-300">·</span>
        <span>Verify & Edit Answers</span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Check the answers
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Tap any answer to change it. Rows marked{" "}
        <strong className="font-semibold text-accent">AI-filled — check</strong>{" "}
        are pre-filled from your narrative.
      </p>

      <IncidentForm
        answers={answers}
        onChange={setAnswer}
        aiFilled={aiFilled}
        questions={questions}
      />

      {/* Sticky action footer */}
      <div className="sticky bottom-4 z-10 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
        <button
          type="button"
          onClick={next}
          className="tap-target w-full rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs transition hover:bg-blue-800"
        >
          {missing.length > 0
            ? `Answer ${missing.length} remaining required ${
                missing.length === 1 ? "question" : "questions"
              } →`
            : "Continue to follow-up extras →"}
        </button>
      </div>
    </main>
  );
}
