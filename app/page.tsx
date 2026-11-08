'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui';

// The public home page. It shows nothing from the supervisor / executive side
// (no report status, queues, trends or staff lists). Those only appear after
// logging in.
export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">Langs Community Health Centre</Badge>
          <span className="text-xs font-medium text-slate-500">
            Fictional, non-identifiable demonstration data only
          </span>
        </div>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Report or <span className="text-accent">Track Incidents</span>
        </h1>

        {/* Two entry points */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link
            href="/report"
            className="group flex flex-col justify-between rounded-2xl bg-accent p-5 text-white shadow-sm transition hover:bg-blue-800"
          >
            <div>
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-blue-50">
                Front-line Staff
              </span>
              <h2 className="mt-3 text-xl font-bold">I&apos;m reporting an incident</h2>
              <p className="mt-1 text-sm text-blue-100">
                Speak or type what happened — AI pre-fills the 35-question form for you to review.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-white group-hover:translate-x-0.5">
              Start 1-minute report →
            </span>
          </Link>

          <Link
            href="/portal-login"
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:bg-white"
          >
            <div>
              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-accent">
                Supervisors &amp; Executives
              </span>
              <h2 className="mt-3 text-xl font-bold text-slate-900">Supervisor Login</h2>
              <p className="mt-1 text-sm text-slate-600">
                Sign in with your own name and password to review reports, see trends and manage the form.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center text-sm font-semibold text-accent group-hover:translate-x-0.5">
              Sign in →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
