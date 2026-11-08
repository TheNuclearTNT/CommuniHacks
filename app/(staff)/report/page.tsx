import Link from "next/link";

// /report — the entry point. Big button, one-minute promise, two paths.
export default function ReportHome() {
  return (
    <main className="py-2">
      <div className="mb-6">
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          Stage 1 · Front-line Staff Intake
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Report an incident
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Takes about a minute. Choose voice/text extraction or step through the form directly.
        </p>
      </div>

      <div className="flex flex-col gap-3.5">
        <Link
          href="/report/describe"
          className="tap-target group flex flex-col justify-center rounded-2xl bg-accent px-5 py-5 text-white shadow-xs transition hover:bg-blue-800"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Tell us what happened</span>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-blue-50">
              AI Voice / Text →
            </span>
          </div>
          <span className="mt-1 text-sm text-blue-100">
            Speak or type in plain language; we pre-fill the 35-question Langs form for you to check.
          </span>
        </Link>

        <Link
          href="/report/check"
          className="tap-target flex flex-col justify-center rounded-2xl border border-slate-300 bg-white px-5 py-5 text-slate-900 shadow-2xs transition hover:border-blue-300 hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Fill in the form directly</span>
            <span className="text-sm font-medium text-slate-400">35 questions →</span>
          </div>
          <span className="mt-1 text-sm text-slate-600">
            Go through the structured Langs incident report questions yourself.
          </span>
        </Link>

        <Link
          href="/my-reports"
          className="tap-target mt-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/80 px-5 py-4 text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <div>
            <span className="block text-base font-semibold text-slate-900">
              My submitted reports
            </span>
            <span className="block text-xs text-slate-600">
              Check live pathway status, current stage owner, and supervisor sign-off
            </span>
          </div>
          <span className="text-sm font-semibold text-accent">View status →</span>
        </Link>
      </div>
    </main>
  );
}
