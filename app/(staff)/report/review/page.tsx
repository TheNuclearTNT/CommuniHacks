"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReportDraft } from "@/components/form/useReportDraft";
import { QUESTIONS, SECTIONS } from "@/components/form/questions";
import { isVisible, missingRequired } from "@/components/form/logic";
import { createIncident } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";

function hasAnswer(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function display(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

const SECTION_TITLES: Record<string, string> = {
  "incident details": "Section 1 · Incident Details",
  "type of incident": "Section 2 · Type of Incident & Triggers",
  summary: "Section 3 · Narrative Summary & Follow-up",
};

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
  const [showUnanswered, setShowUnanswered] = useState(false);
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
      <BackLink href="/report/extras" label="Back to extras" />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          <span>Step 4 of 4</span>
          <span className="text-slate-300">·</span>
          <span>Review & Submit</span>
        </div>
        <button
          type="button"
          onClick={() => setShowUnanswered((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          {showUnanswered ? "Hide blank optional fields" : "Show all fields"}
        </button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Review and submit
      </h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Confirm the summary looks right, then send it to your supervisor for review.
      </p>

      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const qs = QUESTIONS.filter(
            (q) =>
              q.section === section &&
              isVisible(q, answers) &&
              (showUnanswered || q.required || hasAnswer(answers[q.id as `q${number}`])),
          );
          if (qs.length === 0) return null;
          return (
            <section
              key={section}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h2 className="text-base font-bold text-slate-900">
                  {SECTION_TITLES[section] ?? section}
                </h2>
                <Link
                  href="/report/check"
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-blue-50"
                >
                  Edit answers
                </Link>
              </div>
              <dl className="divide-y divide-slate-100">
                {qs.map((q) => {
                  const val = answers[q.id as `q${number}`];
                  return (
                    <div key={q.id} className="py-2.5">
                      <dt className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>{q.label}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {q.id.toUpperCase()}
                        </span>
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-slate-900">
                        {display(val)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          );
        })}
      </div>

      {footageHoldRequested && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
          ✓ Security camera footage hold requested — IT / Facilities will be notified.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="tap-target w-full rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting
            ? "Submitting & running AI clinical check…"
            : missing.length > 0
              ? `Answer ${missing.length} required first`
              : "Submit incident report"}
        </button>
      </div>
    </main>
  );
}
