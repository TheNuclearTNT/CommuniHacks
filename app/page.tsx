'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge, Card } from '@/components/ui';
import { getUsers, setMe } from '@/lib/api-client';
import { SEED_USERS as MOCK_USERS } from '@/lib/mock/connan';
import { getRoleLabel } from '@/lib/question-labels';
import type { Role, User } from '@/lib/types';

const ROLE_DESTINATION: Record<Role, string> = {
  STAFF: '/report',
  SUPERVISOR: '/supervisor',
  PRIVACY_OFFICER: '/inbox',
  JOHSC_CHAIR: '/inbox',
  IT_FACILITIES: '/inbox',
  DIRECTOR_OPS: '/inbox',
  CID_GROUP: '/inbox',
  EXEC_ASSISTANT: '/ea',
  EXECUTIVE: '/dashboard',
};

const ROLE_DESCRIPTION: Record<Role, string> = {
  STAFF: 'Report an incident via voice/text or check status of submitted reports',
  SUPERVISOR: 'Review new submissions, verify AI checks, and route to specialty leads',
  PRIVACY_OFFICER: 'Acknowledge privacy breaches and misdirected communication reports',
  JOHSC_CHAIR: 'Acknowledge staff injuries, WSIB / JHSC statutory clocks, and safety hazards',
  IT_FACILITIES: 'Acknowledge property/facility hazards, cyber incidents, and camera holds',
  DIRECTOR_OPS: 'Co-sign facilities, cyber, and serious behavioural escalations',
  CID_GROUP: 'Coordinate Critical Incident Debriefs requested by staff',
  EXEC_ASSISTANT: 'Confirm final receipt, file completed records, or reopen closed incidents',
  EXECUTIVE: 'Explore 12-week multi-site trends, stage bottlenecks, and AI briefings',
};

export default function HomePage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  useEffect(() => {
    let active = true;
    getUsers()
      .then((data) => {
        if (active && data.length) setUsers(data);
      })
      .catch(() => {
        if (active) setUsers(MOCK_USERS);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePickPersona = async (user: User) => {
    try {
      await setMe({ userId: user.id, role: user.role });
    } catch {
      // Ignore if offline
    }
    window.dispatchEvent(new CustomEvent('langs:role-changed', { detail: user }));
    router.push(ROLE_DESTINATION[user.role]);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:py-12">
      {/* Hero Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs md:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">Langs Community Health Centre</Badge>
          <span className="text-xs font-medium text-slate-500">
            Fictional, non-identifiable demonstration data only
          </span>
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Report in a minute.{' '}
              <span className="text-accent">Track every step to closure.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
              Langs SafeReport replaces disconnected paper and static forms with a guided 60-second voice or form intake, automated multi-role routing, statutory compliance clocks, and live pathway tracking.
            </p>

            {/* Primary 2-Audience Entry Cards */}
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

              <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-accent">
                    Supervisors, Specialty Leads &amp; Execs
                  </span>
                  <h2 className="mt-3 text-xl font-bold text-slate-900">
                    Review, route &amp; track trends
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Jump directly into your role queue, executive trends, or the admin form portal.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/supervisor"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    Supervisor Queue
                  </Link>
                  <Link
                    href="/inbox"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    Specialty Inbox
                  </Link>
                  <Link
                    href="/ea"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    EA Filing
                  </Link>
                  <Link
                    href="/dashboard"
                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-accent shadow-2xs ring-1 ring-blue-200 hover:bg-blue-50"
                  >
                    Executive Trends
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 5-Stage Pathway Visual Overview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              5-Stage Incident Pathway
            </p>
            <ol className="mt-3 space-y-2.5">
              {[
                {
                  step: '1',
                  title: 'Submitted',
                  desc: 'Staff submits via voice or form; 24h supervisor SLA clock starts',
                  href: '/report',
                },
                {
                  step: '2',
                  title: 'Supervisor review',
                  desc: 'Supervisor confirms types, severity, WSIB/MOL triggers & corrective actions',
                  href: '/supervisor',
                },
                {
                  step: '3',
                  title: 'Specialty acknowledgement',
                  desc: 'Parallel sign-off by Privacy, JOHSC, IT/Facilities, Ops, or CID Group',
                  href: '/inbox',
                },
                {
                  step: '4',
                  title: 'With Executive Assistant',
                  desc: 'Unlocks automatically once all required specialty sign-offs complete',
                  href: '/ea',
                },
                {
                  step: '5',
                  title: 'Filed and closed (or Reopened)',
                  desc: 'EA files record; can be reopened on the same ID if new details emerge',
                  href: '/dashboard',
                },
              ].map((s) => (
                <li key={s.step}>
                  <Link
                    href={s.href}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5 transition hover:border-blue-300 hover:shadow-2xs"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-accent ring-1 ring-blue-200">
                      {s.step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900">{s.title}</p>
                      <p className="text-[11px] leading-snug text-slate-500">{s.desc}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Interactive Demo Persona Switcher Grid */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-accent">
              Interactive Walkthrough
            </p>
            <h2 className="mt-0.5 text-xl font-bold text-slate-900">
              Switch Demo Persona (12 Langs Staff Accounts)
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Click any persona to assume their role and jump straight to their workspace.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user) => (
            <Card
              key={user.id}
              className="flex flex-col justify-between p-4 transition hover:border-blue-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{user.name}</h3>
                    <p className="mt-0.5 text-xs font-medium text-accent">
                      {getRoleLabel(user.role)}
                    </p>
                  </div>
                  {user.site ? (
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {user.site}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                  {ROLE_DESCRIPTION[user.role]}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handlePickPersona(user)}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              >
                <span>Switch &amp; open {ROLE_DESTINATION[user.role]}</span>
                <span>→</span>
              </button>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
