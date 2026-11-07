import Link from "next/link";

// /report/done/[id] — check mark, reference number, sent-to-supervisor, link.
export default function DonePage({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="pt-10 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent-light">
        <span className="text-4xl text-accent">✓</span>
      </div>
      <h1 className="mb-2 text-2xl font-bold">Report sent</h1>
      <p className="mb-1 text-slate-600">Your reference number is</p>
      <p className="mb-6 text-xl font-semibold text-accent">{id}</p>
      <p className="mb-8 text-slate-600">
        It’s gone to your supervisor for review. You’ll see updates in “My
        reports”.
      </p>

      <div className="flex flex-col gap-3">
        <Link
          href={`/records/${id}`}
          className="tap-target rounded-xl bg-accent px-5 py-4 text-lg font-semibold text-white"
        >
          View the record
        </Link>
        <Link
          href="/my-reports"
          className="tap-target rounded-xl border border-slate-300 px-5 py-4 text-lg"
        >
          My reports
        </Link>
      </div>
    </main>
  );
}
