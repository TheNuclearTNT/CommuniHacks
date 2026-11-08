'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncidents, receiveIncident, reopenIncident } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import type { IncidentListItem } from '@/lib/types';

export default function ExecutiveAssistantPage() {
  const [waiting, setWaiting] = useState<IncidentListItem[]>([]);
  const [filed, setFiled] = useState<IncidentListItem[]>([]);
  const [tab, setTab] = useState<'waiting' | 'filed'>('waiting');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [waitingData, filedData] = await Promise.all([
        getIncidents({ scope: 'ea' }),
        getIncidents({ scope: 'ea', status: 'CLOSED' }),
      ]);
      setWaiting(waitingData);
      setFiled(filedData);
    } catch {
      setWaiting(MOCK_NEEL_LIST.filter((item) => item.status === 'WITH_EA'));
      setFiled(MOCK_NEEL_LIST.filter((item) => item.status === 'CLOSED'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    const handleRoleChanged = () => void load();
    window.addEventListener('langs:role-changed', handleRoleChanged);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('langs:role-changed', handleRoleChanged);
    };
  }, [load]);

  const listed = tab === 'waiting' ? waiting : filed;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            Stages 4 &amp; 5 · Executive Assistant Receipt &amp; Filing
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Receipt &amp; Final Filing
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirm final receipt after all specialty sign-offs are complete, or reopen a closed record on the same ID.
          </p>
        </div>
        <Badge tone="blue">Executive Assistant</Badge>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          variant={tab === 'waiting' ? 'primary' : 'secondary'}
          onClick={() => setTab('waiting')}
        >
          Waiting for receipt ({waiting.length})
        </Button>
        <Button
          variant={tab === 'filed' ? 'primary' : 'secondary'}
          onClick={() => setTab('filed')}
        >
          Filed records ({filed.length})
        </Button>
      </div>

      {loading ? <p className="text-slate-500">Loading records…</p> : null}

      {!loading && listed.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-slate-700">
            {tab === 'waiting'
              ? 'No records are currently waiting for Executive Assistant receipt.'
              : 'No filed and closed records found.'}
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {listed.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <SeverityDot severity={item.severity} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/records/${item.id}`}
                      className="font-mono text-base font-bold text-slate-900 hover:text-blue-700"
                    >
                      {item.id}
                    </Link>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">{item.oneLiner}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {item.types.map((type) => (
                      <TypeChip key={`${item.id}-${type}`} type={type} />
                    ))}
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-600">{item.location}</span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('en-CA')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <ClockChip dueAt={item.nextClockDueAt} />
                <Link
                  href={`/records/${item.id}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View record
                </Link>
                {tab === 'waiting' ? (
                  <Button
                    variant="primary"
                    disabled={busyId === item.id}
                    onClick={async () => {
                      setBusyId(item.id);
                      try {
                        await receiveIncident(item.id);
                        await load();
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {busyId === item.id ? 'Filing…' : 'Confirm receipt & file'}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setReopenTargetId((prev) => (prev === item.id ? null : item.id));
                      setReopenReason('');
                    }}
                  >
                    Reopen record
                  </Button>
                )}
              </div>
            </div>

            {reopenTargetId === item.id ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
                <label className="block text-xs font-semibold text-amber-900">
                  Reason for reopening {item.id} (keeps same Incident ID and increments cycle)
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    placeholder="e.g., Additional WSIB physiotherapy note received..."
                    className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setReopenTargetId(null)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={busyId === item.id}
                      onClick={async () => {
                        setBusyId(item.id);
                        try {
                          await reopenIncident(item.id, {
                            reason: reopenReason.trim() || 'Follow-up information added',
                          });
                          setReopenTargetId(null);
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      {busyId === item.id ? 'Reopening…' : 'Confirm reopen'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </main>
  );
}
