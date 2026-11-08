'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, EmptyState, StatusPill, TypeChip } from '@/components/ui';
import { PathwayTracker } from '@/components/tracker/PathwayTracker';
import { getIncident, getMe } from '@/lib/api-client';
import { getNeelMockIncident } from '@/lib/mock/neel';
import type { IncidentDetail, Role } from '@/lib/types';

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value == null) return 'Not answered';
  return String(value);
}

export default function RecordDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [role, setRole] = useState<Role>('SUPERVISOR');

  useEffect(() => {
    if (!id) return;

    let active = true;

    Promise.all([
      getIncident(id).catch(() => getNeelMockIncident(id) ?? null),
      getMe().catch(() => ({ role: 'SUPERVISOR' as Role })),
    ])
      .then(([incident, me]) => {
        if (!active) return;
        setDetail(incident);
        setRole(me.role);
      })
      .catch(() => {
        if (active) setDetail(getNeelMockIncident(id) ?? null);
      });

    return () => {
      active = false;
    };
  }, [id]);

  const groupedAnswers = useMemo(() => {
    if (!detail) return [] as Array<{ title: string; entries: Array<[string, unknown]> }>;

    const entries = Object.entries(detail.incident.answers ?? {}).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
    const sections = [
      { title: 'Report details', test: (q: number) => q <= 8 },
      { title: 'Immediate actions', test: (q: number) => q > 8 && q <= 18 },
      { title: 'Review summary', test: (q: number) => q > 18 },
    ];

    return sections
      .map((section) => {
        const items = entries.filter(([key]) => {
          const q = Number(key.replace('q', ''));
          return Number.isFinite(q) && section.test(q);
        });
        return { title: section.title, entries: items };
      })
      .filter((section) => section.entries.length > 0);
  }, [detail]);

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <EmptyState title="Record not found" description="This incident may still be loading or no longer exists." />
      </main>
    );
  }

  const canAcknowledge = detail.acknowledgements.some((ack) => ack.role === role && !ack.ackedAt);
  const canOpen = role === 'SUPERVISOR' && ['SUBMITTED', 'REOPENED'].includes(detail.incident.status);
  const canReceive = role === 'EXEC_ASSISTANT' && detail.incident.status === 'WITH_EA';
  const canReopen = (role === 'SUPERVISOR' || role === 'EXEC_ASSISTANT') && detail.incident.status === 'CLOSED';

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="sticky top-0 z-10 mb-6 border-b border-slate-200 bg-white/80 py-3 backdrop-blur-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/supervisor" className="text-sm font-medium text-blue-700 underline-offset-2 hover:underline">
              Back to queue
            </Link>
            <span className="text-sm text-slate-500">{detail.incident.id}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canOpen ? <Button>Open / review</Button> : null}
            {canAcknowledge ? <Button variant="secondary">Acknowledge</Button> : null}
            {canReceive ? <Button>Confirm receipt and file</Button> : null}
            {canReopen ? <Button variant="secondary">Reopen</Button> : null}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <PathwayTracker detail={detail} />

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {groupedAnswers.map((section) => (
              <Card key={section.title} className="p-4">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">{section.title}</h2>
                <div className="space-y-3">
                  {section.entries.map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{key}</p>
                      <p className="mt-1 text-sm text-slate-700">{formatAnswer(value)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {detail.incident.transcript ? (
              <Card className="p-4">
                <h2 className="text-lg font-semibold text-slate-900">Transcript</h2>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">Show transcript</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{detail.incident.transcript}</p>
                </details>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            {detail.incident.ai ? (
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">AI summary</h2>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-700">
                    AI-generated — check
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {detail.incident.ai.summaryBullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full bg-blue-600" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">Supervisor review</h2>
              {detail.reviews.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No review submitted yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {detail.reviews.map((review) => (
                    <div key={`${review.incidentId}-${review.cycle}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusPill status={detail.incident.status} />
                        {review.confirmedTypes.map((type) => (
                          <TypeChip key={`${review.incidentId}-${type}`} type={type} />
                        ))}
                      </div>
                      <p className="text-sm text-slate-700"><strong>Severity:</strong> {review.severity}</p>
                      <p className="mt-2 text-sm text-slate-700"><strong>Notes:</strong> {review.notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">Follow-up actions</h2>
              {detail.actions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No follow-up actions recorded.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {detail.actions.map((action) => (
                    <li key={action.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-2">
                        <strong>{action.title}</strong>
                        <span className="text-xs text-slate-500">{action.status}</span>
                      </div>
                      <p className="mt-1">Due: {new Date(action.dueAt).toLocaleString('en-CA')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-semibold text-slate-900">Clocks</h2>
              {detail.clocks.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No compliance clocks are active.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {detail.clocks.map((clock) => (
                    <li key={clock.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">{clock.kind}</p>
                      <p className="mt-1">Due: {new Date(clock.dueAt).toLocaleString('en-CA')}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
