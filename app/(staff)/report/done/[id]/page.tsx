import Link from "next/link";

// /report/done/[id] — check mark, reference number, sent-to-supervisor, link.
export default async function DonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
          <span className="text-3xl font-bold text-emerald-600">✓</span>
        </div>

        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-xs font-semibold text-blue-700">
          Stage 1 Complete · Routed to Supervisor
        </span>

        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Incident report submitted
        </h1>
        <p className="mt-2 text-sm text-slate-600">Your Langs reference number is</p>
        <p className="mt-1 font-mono text-2xl font-bold text-accent">{id}</p>

        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate-600">
          Your report has been logged with a 24-hour supervisor review clock and AI discrepancy check. You can follow its live progress through all 5 routing stages at any time.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/records/${id}`}
            className="tap-target flex items-center justify-center rounded-xl bg-accent px-5 py-3.5 text-base font-semibold text-white shadow-xs transition hover:bg-blue-800"
          >
            View live pathway &amp; record →
          </Link>
          <Link
            href={`/supervisor/review/${id}`}
            className="tap-target flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50/70 px-5 py-3.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
          >
            Demo shortcut: Open in Supervisor Review →
          </Link>
          <Link
            href="/my-reports"
            className="tap-target flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to My reports
          </Link>
        </div>
      </div>
    </main>
  );
}
