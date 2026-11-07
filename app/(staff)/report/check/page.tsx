"use client";

import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { IncidentForm } from "@/components/form/IncidentForm";
import { missingRequired } from "@/components/form/logic";

// /report/check — the full form as tap-to-edit rows, AI-filled rows flagged.
// This is also the manual entry point (works with voice/AI off).
export default function CheckPage() {
  const router = useRouter();
  const { answers, setAnswer, aiFilled, hydrated } = useReportDraft();

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
    <main>
      <h1 className="mb-1 text-2xl font-bold">Check the answers</h1>
      <p className="mb-6 text-slate-500">
        Tap any answer to change it. Rows marked “AI-filled” are our best guess —
        please check them.
      </p>

      <IncidentForm answers={answers} onChange={setAnswer} aiFilled={aiFilled} />

      <button
        type="button"
        onClick={next}
        className="tap-target mt-2 w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
      >
        {missing.length > 0
          ? `Answer ${missing.length} more required`
          : "Continue"}
      </button>
    </main>
  );
}
