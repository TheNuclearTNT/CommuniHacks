import Link from "next/link";

// Landing page (home route `/`). Splits the app into its two audiences:
// front-line staff who REPORT an incident, and supervisors/executives who
// REVIEW them (behind a demo sign-in). Neel owns the final version in the team
// plan; this is a clean stand-in so the deployed URL opens into the real app.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-accent">
        Langs Community Health Centre
      </p>
      <h1 className="mb-3 text-4xl font-bold text-slate-900">
        Langs SafeReport
      </h1>
      <p className="mb-10 max-w-xl text-lg text-slate-600">
        Report any incident in about a minute — injury, near miss, privacy, IT,
        or behaviour. Supervisors and executives review, route and track each
        one through to closure.
      </p>

      <p className="mb-3 text-sm font-medium text-slate-500">
        Who are you?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/report"
          className="flex flex-col rounded-xl bg-accent px-6 py-6 text-white"
        >
          <span className="text-xl font-semibold">I&apos;m reporting an incident</span>
          <span className="mt-1 text-sm text-blue-100">
            Front-line staff. Takes about a minute.
          </span>
        </Link>

        <Link
          href="/portal-login"
          className="flex flex-col rounded-xl border-2 border-accent bg-white px-6 py-6 text-slate-900 hover:bg-accent-light"
        >
          <span className="text-xl font-semibold">
            I&apos;m a supervisor or executive
          </span>
          <span className="mt-1 text-sm text-slate-500">
            Review reports, see trends, edit the form. Sign in required.
          </span>
        </Link>
      </div>

      <p className="mt-10 text-sm text-slate-400">
        Prototype — fictional, non-identifiable data only.
      </p>
    </main>
  );
}
