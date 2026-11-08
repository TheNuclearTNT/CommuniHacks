'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { ApiError, getIncidents, receiveIncident, reopenIncident } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import type { IncidentListItem, Role } from '@/lib/types';
import { canConfirmReceipt } from '@/lib/workflow/receipt-roles';

export default function ExecutiveAssistantPage() {
  const [waiting, setWaiting] = useState<IncidentListItem[]>([]);
  const [filed, setFiled] = useState<IncidentListItem[]>([]);
  const [tab, setTab] = useState<'waiting' | 'filed'>('waiting');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  // Who is signed in: undefined = still checking, null = nobody. Only executives
  // get the "Confirm receipt & file" button.
  const [viewerRole, setViewerRole] = useState<Role | null | undefined>(undefined);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  // The record filed a moment ago, highlighted in the completed tab.
  const [justFiledId, setJustFiledId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/portal-login')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { account?: { role: Role } } | null) => {
        if (live) setViewerRole(d?.account?.role ?? null);
      })
      .catch(() => {
        if (live) setViewerRole(null);
      });
    return () => {
      live = false;
    };
  }, []);

  const canFile = canConfirmReceipt(viewerRole);

  // Confirm receipt and file. On success the record leaves "Waiting for receipt"
  // and appears under "Completed receipts and files".
  const fileRecord = async (item: IncidentListItem) => {
    setBusyId(item.id);
    setNotice(null);
    try {
      await receiveIncident(item.id);
      setJustFiledId(item.id);
      setNotice({ kind: 'ok', text: `${item.id} is confirmed and filed.` });
      await load();
    } catch (err) {
      setNotice({
        kind: 'error',
        text:
          err instanceof ApiError && err.status === 403
            ? 'Only executives can confirm receipt and file.'
            : err instanceof Error
              ? err.message
              : 'Could not file this record. Please try again.',
      });
    } finally {
      setBusyId(null);
    }
  };

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
          Completed receipts and files ({filed.length})
        </Button>
      </div>

      {/* Result of the last action */}
      {notice ? (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-300 bg-amber-50 text-amber-900'
          }`}
        >
          <span>
            {notice.text}
            {notice.kind === 'ok' ? ' It now appears under Completed receipts and files.' : ''}
          </span>
          {notice.kind === 'ok' && tab !== 'filed' ? (
            <Button variant="secondary" onClick={() => setTab('filed')}>
              Show in Completed receipts and files
            </Button>
          ) : null}
        </div>
      ) : null}

      {viewerRole !== undefined && !canFile && tab === 'waiting' ? (
        <p className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Only executives can confirm receipt and file a record. You can view what is waiting.
        </p>
      ) : null}

      {loading ? <p className="text-slate-500">Loading records…</p> : null}

      {!loading && listed.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm font-medium text-slate-700">
            {tab === 'waiting'
              ? 'No records are currently waiting for Executive Assistant receipt.'
              : 'No completed receipts and files yet.'}
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {listed.map((item) => (
          <Card
            key={item.id}
            className={`p-4 ${tab === 'filed' && item.id === justFiledId ? 'ring-2 ring-emerald-300' : ''}`}
          >
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
                    {tab === 'filed' && item.id === justFiledId ? (
                      <Badge tone="green">Just filed</Badge>
                    ) : null}
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
                  viewerRole === undefined ? null : canFile ? (
                    <Button
                      variant="primary"
                      disabled={busyId === item.id}
                      onClick={() => void fileRecord(item)}
                    >
                      {busyId === item.id ? 'Filing…' : 'Confirm receipt & file'}
                    </Button>
                  ) : (
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                      Executives only
                    </span>
                  )
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
                        setNotice(null);
                        try {
                          await reopenIncident(item.id, {
                            reason: reopenReason.trim() || 'Follow-up information added',
                          });
                          setReopenTargetId(null);
                          setJustFiledId(null);
                          await load();
                        } catch (err) {
                          setNotice({
                            kind: 'error',
                            text:
                              err instanceof ApiError && err.status === 403
                                ? 'Your role cannot reopen records.'
                                : err instanceof Error
                                  ? err.message
                                  : 'Could not reopen this record. Please try again.',
                          });
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
