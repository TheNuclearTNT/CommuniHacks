import Link from "next/link";
import { BackLink } from "@/components/form/BackLink";

// /report — the entry point. Two paths: an AI-led conversation, or fill the
// form yourself. No "My reports" link here (that lives elsewhere).
export default function ReportHome() {
  return (
    <main>
      <BackLink href="/" label="Back to home" />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">
        Report an incident
      </h1>
      <p className="mb-8 text-slate-500">Takes about a minute.</p>

      <div className="flex flex-col gap-4">
        <Link
          href="/report/describe"
          className="tap-target flex flex-col rounded-xl bg-accent px-5 py-5 text-white"
        >
          <span className="text-lg font-semibold">Tell us what happened</span>
          <span className="text-sm text-blue-100">
            Speak or type; we ask only what matters and fill the form for you.
          </span>
        </Link>

        <Link
          href="/report/check"
          className="tap-target flex flex-col rounded-xl border border-slate-300 bg-white px-5 py-5 text-slate-900"
        >
          <span className="text-lg font-semibold">Fill in the form</span>
          <span className="text-sm text-slate-500">
            Go through the questions yourself.
          </span>
        </Link>
      </div>
    </main>
  );
}
