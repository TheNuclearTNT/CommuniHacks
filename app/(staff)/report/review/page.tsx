"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { QUESTIONS, SECTIONS } from "@/components/form/questions";
import { isVisible, missingRequired } from "@/components/form/logic";
import { createIncident } from "@/lib/api-client";

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

// /report/review — plain-language summary, Edit links, Submit.
export default function ReviewPage() {
  const router = useRouter();
  const {
    answers,
    transcript,
    footageHoldRequested,
    hydrated,
    reset,
  } = useReportDraft();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return null;

  const missing = missingRequired(answers);

  const submit = async () => {
    if (missing.length > 0) {
      router.push("/report/questions");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const incident = await createIncident({
        answers,
        transcript,
        footageHoldRequested,
      });
      reset();
      router.push(`/report/done/${incident.id}`);
    } catch {
      setError("Could not submit. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold">Review and submit</h1>
      <p className="mb-6 text-slate-500">
        Check it reads right, then send it to your supervisor.
      </p>

      {SECTIONS.map((section) => {
        const qs = QUESTIONS.filter(
          (q) => q.section === section && isVisible(q, answers)
        );
        return (
          <section key={section} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{section}</h2>
              <Link href="/report/check" className="text-sm text-accent underline">
                Edit
              </Link>
            </div>
            <dl className="divide-y divide-slate-100">
              {qs.map((q) => (
                <div key={q.id} className="py-2">
                  <dt className="text-sm text-slate-500">{q.label}</dt>
                  <dd className="text-slate-900">
                    {display(answers[q.id as `q${number}`])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {footageHoldRequested && (
        <p className="mb-4 rounded bg-accent-light px-3 py-2 text-sm text-accent">
          Camera footage will be preserved.
        </p>
      )}

      {error && <p className="mb-4 text-warn">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white disabled:opacity-50"
      >
        {submitting
          ? "Sending…"
          : missing.length > 0
          ? `Answer ${missing.length} required first`
          : "Submit report"}
      </button>
    </main>
  );
}
