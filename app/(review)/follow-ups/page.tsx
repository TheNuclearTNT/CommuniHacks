'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { updateAction } from '@/lib/api-client';
import { getRoleLabel } from '@/lib/question-labels';
import type { FollowUpAction } from '@/lib/types';
import type { FollowUpListItem } from '@/app/api/actions/route';

// /follow-ups — every open follow-up action across all records, so nothing
// slips between people ("follow-up gets missed" is Langs' core problem).

const DAY = 86_400_000;
type Group = 'overdue' | 'week' | 'later';

const GROUPS: { key: Group; title: string; tone: string }[] = [
  { key: 'overdue', title: 'Overdue', tone: 'border-t-amber-500' },
  { key: 'week', title: 'Due in the next 7 days', tone: 'border-t-blue-600' },
  { key: 'later', title: 'Later', tone: 'border-t-slate-300' },
];

const KIND_LABEL: Record<FollowUpAction['kind'], string> = {
  CORRECTIVE: 'Corrective action',
  FOOTAGE_HOLD: 'Camera footage hold',
  REOPEN_NOTE: 'Reopen follow-up',
};

function dueText(dueAt: string, now: number): string {
  const days = Math.round((new Date(dueAt).getTime() - now) / DAY);
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUpListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owner, setOwner] = useState('');
  const [site, setSite] = useState('');
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let live = true;
    fetch('/api/actions')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FollowUpListItem[]>;
      })
      .then((data) => live && setItems(data))
      .catch(() => live && setError('Could not load follow-up actions.'));
    return () => {
      live = false;
    };
  }, []);

  const owners = useMemo(() => [...new Set((items ?? []).map((i) => i.ownerRole))].sort(), [items]);
  const sites = useMemo(() => [...new Set((items ?? []).map((i) => i.site))].sort(), [items]);

  const visible = (items ?? []).filter(
    (i) => (showDone ? i.status === 'DONE' : i.status !== 'DONE') && (!owner || i.ownerRole === owner) && (!site || i.site === site),
  );
  const groupOf = (i: FollowUpListItem): Group => {
    const t = new Date(i.dueAt).getTime();
    return t < now ? 'overdue' : t < now + 7 * DAY ? 'week' : 'later';
  };
  const open = (items ?? []).filter((i) => i.status !== 'DONE');
  const overdue = open.filter((i) => new Date(i.dueAt).getTime() < now).length;
  const doneThisWeek = (items ?? []).filter(
    (i) => i.status === 'DONE' && i.completedAt && new Date(i.completedAt).getTime() > now - 7 * DAY,
  ).length;

  const setStatus = async (item: FollowUpListItem, status: FollowUpAction['status']) => {
    setBusyId(item.id);
    try {
      await updateAction(item.id, status);
      setItems((all) =>
        (all ?? []).map((x) => (x.id === item.id ? { ...x, status, completedAt: status === 'DONE' ? new Date().toISOString() : null } : x)),
      );
      setNotice(status === 'DONE' ? `Marked done: ${item.title}` : `Marked in progress: ${item.title}`);
    } catch {
      setNotice('Could not update that action. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const remind = async (item: FollowUpListItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(item.incidentId)}/remind`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toRole: item.ownerRole, about: item.title }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNotice(`Reminder logged for ${getRoleLabel(item.ownerRole)} on ${item.incidentId} (prototype: no email sent).`);
    } catch {
      setNotice('Could not send the reminder. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700">Follow-up tracking</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Follow-up board</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every follow-up action across all reports, so nothing gets missed between people.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Open actions</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{items ? open.length : '…'}</p>
        </div>
        <div className={`rounded-xl border bg-white p-4 ${overdue ? 'border-amber-300' : 'border-slate-200'}`}>
          <p className="text-sm text-slate-600">Overdue</p>
          <p className={`mt-1 text-3xl font-semibold ${overdue ? 'text-amber-700' : 'text-slate-900'}`}>
            {items ? (overdue ? `⚠ ${overdue}` : 0) : '…'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Done in the last 7 days</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{items ? doneThisWeek : '…'}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex gap-1" role="group" aria-label="Open or done">
          {[false, true].map((done) => (
            <button
              key={String(done)}
              type="button"
              aria-pressed={showDone === done}
              onClick={() => setShowDone(done)}
              className={`min-h-10 rounded-lg border px-3 text-sm ${
                showDone === done ? 'border-blue-600 bg-blue-50 font-medium text-blue-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {done ? 'Done' : 'Open'}
            </button>
          ))}
        </div>
        <label className="text-sm text-slate-700">
          Owner
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="ml-2 min-h-10 rounded-lg border border-slate-300 px-2">
            <option value="">Everyone</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {getRoleLabel(o)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Site
          <select value={site} onChange={(e) => setSite(e.target.value)} className="ml-2 min-h-10 rounded-lg border border-slate-300 px-2">
            <option value="">All sites</option>
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <p role="status" className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {notice}
        </p>
      )}
      {error && <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}
      {!items && !error && <p className="mt-6 text-sm text-slate-500">Loading follow-up actions…</p>}
      {items && visible.length === 0 && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {showDone ? 'No completed actions match these filters.' : 'No open follow-up actions. Nothing is waiting.'}
        </p>
      )}

      {items &&
        visible.length > 0 &&
        (showDone ? [{ key: 'later' as Group, title: 'Completed', tone: 'border-t-emerald-600' }] : GROUPS).map((g) => {
          const list = showDone ? visible : visible.filter((i) => groupOf(i) === g.key);
          if (list.length === 0) return null;
          return (
            <section key={g.key} className={`mt-6 rounded-2xl border border-slate-200 border-t-4 bg-white p-4 ${g.tone}`}>
              <h2 className="mb-3 text-sm font-bold text-slate-900">
                {g.title} <span className="font-normal text-slate-500">({list.length})</span>
              </h2>
              <ul className="divide-y divide-slate-100">
                {list.map((item) => {
                  const late = !showDone && groupOf(item) === 'overdue';
                  return (
                    <li key={item.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">
                          {getRoleLabel(item.ownerRole)} · {KIND_LABEL[item.kind]} ·{' '}
                          <Link href={`/records/${encodeURIComponent(item.incidentId)}`} className="text-blue-700 underline">
                            {item.incidentId}
                          </Link>{' '}
                          · {item.site}
                        </p>
                        {item.oneLiner && <p className="mt-0.5 truncate text-xs text-slate-500">{item.oneLiner}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            showDone
                              ? 'bg-emerald-50 text-emerald-800'
                              : late
                                ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-300'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {showDone ? 'Done' : `${late ? '⚠ ' : ''}${dueText(item.dueAt, now)}`}
                        </span>
                        {!showDone && item.status === 'NOT_STARTED' && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => setStatus(item, 'IN_PROGRESS')}
                            className="min-h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Start
                          </button>
                        )}
                        {!showDone && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => setStatus(item, 'DONE')}
                            className="min-h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                          >
                            Mark done
                          </button>
                        )}
                        {late && (
                          <button
                            type="button"
                            disabled={busyId === item.id}
                            onClick={() => remind(item)}
                            className="min-h-10 rounded-lg border border-amber-400 px-3 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                          >
                            Send reminder
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </main>
  );
}
