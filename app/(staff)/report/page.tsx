import Link from "next/link";

// /report — the entry point. Big button, one-minute promise, two paths.
export default function ReportHome() {
  return (
    <main>
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
            Speak or type; we fill in the form for you.
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

      <div className="mt-10 text-center">
        <Link href="/my-reports" className="text-accent underline">
          My reports
        </Link>
      </div>
    </main>
  );
}
