'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncidents } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import { getRoleLabel } from '@/lib/question-labels';
import type { IncidentListItem } from '@/lib/types';

export default function SupervisorQueuePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-8">
          <p className="text-slate-500">Loading supervisor queue…</p>
        </main>
      }
    >
      <SupervisorQueueContent />
    </Suspense>
  );
}

const NEEDS_REVIEW_STATUSES = new Set(['SUBMITTED', 'REOPENED', 'SUPERVISOR_REVIEW']);

function SupervisorQueueContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const siteFilter = params.get('site') ?? '';
  const typeFilter = params.get('type') ?? '';

  const loadQueue = useCallback(() => {
    getIncidents({ scope: 'queue' })
      .then((data) => {
        setItems(data.length ? data : MOCK_NEEL_LIST);
      })
      .catch(() => {
        setItems(MOCK_NEEL_LIST);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadQueue();
    const handleRoleChanged = () => loadQueue();
    window.addEventListener('langs:role-changed', handleRoleChanged);
    return () => window.removeEventListener('langs:role-changed', handleRoleChanged);
  }, [loadQueue]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (siteFilter && item.location !== siteFilter) return false;
      if (typeFilter && !item.types.includes(typeFilter as never)) return false;
      return true;
    });
  }, [items, siteFilter, typeFilter]);

  const awaitingSupervisorReview = useMemo(
    () =>
      filteredItems
        .filter((item) => NEEDS_REVIEW_STATUSES.has(item.status))
        .sort((a, b) => {
          if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
          if (a.severity !== 'Critical' && b.severity === 'Critical') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    [filteredItems],
  );

  const routedOrClosed = useMemo(
    () => filteredItems.filter((item) => !NEEDS_REVIEW_STATUSES.has(item.status)),
    [filteredItems],
  );

  const criticalCount = awaitingSupervisorReview.filter((i) => i.severity === 'Critical').length;

  const updateParam = (key: string, value: string) => {
    const search = new URLSearchParams(params.toString());
    if (value) search.set(key, value);
    else search.delete(key);
    const qs = search.toString();
    router.replace(qs ? `/supervisor?${qs}` : '/supervisor');
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Header & Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            Stage 2 · Supervisor Triage &amp; Investigation
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Supervisor Review Queue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Confirm incident types, verify AI discrepancy checks, assign follow-up actions, and route to specialty leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={siteFilter}
            onChange={(event) => updateParam('site', event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs"
          >
            <option value="">All Langs sites</option>
            <option value="Main Site">Main Site (1145 Concession Rd)</option>
            <option value="Grow Community Centre">Grow Community Centre</option>
            <option value="North Dumfries">North Dumfries</option>
            <option value="Youth Wellness Hub">Youth Wellness Hub</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => updateParam('type', event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs"
          >
            <option value="">All incident types</option>
            <option value="PRIVACY">Privacy</option>
            <option value="STAFF_INJURY">Staff injury</option>
            <option value="FACILITIES">Facilities</option>
            <option value="IT_CYBER">IT / Cyber</option>
            <option value="BEHAVIOURAL">Behavioural</option>
            <option value="CID">CID</option>
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {(siteFilter || typeFilter) ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Active filters:</span>
          {siteFilter ? (
            <button
              type="button"
              onClick={() => updateParam('site', '')}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
            >
              <span>Showing: {siteFilter}</span>
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
          {typeFilter ? (
            <button
              type="button"
              onClick={() => updateParam('type', '')}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
            >
              <span>Type: {typeFilter}</span>
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Summary metrics bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Needs Supervisor Review</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{awaitingSupervisorReview.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Critical Priority</p>
          <p className={`mt-1 text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {criticalCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">In Specialty / EA Routing</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {routedOrClosed.filter((i) => i.status !== 'CLOSED').length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <p className="text-xs font-medium text-slate-500">Filed &amp; Closed</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {routedOrClosed.filter((i) => i.status === 'CLOSED').length}
          </p>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Loading queue…</p> : null}

      {!loading && filteredItems.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium text-slate-700">No incidents match the current queue filters.</p>
          <button
            type="button"
            onClick={() => router.replace('/supervisor')}
            className="mt-2 text-xs font-semibold text-blue-700 hover:underline"
          >
            Clear filters
          </button>
        </Card>
      ) : null}

      {/* Section 1: Needs supervisor review */}
      {!loading && awaitingSupervisorReview.length > 0 ? (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge tone="amber">Needs supervisor review ({awaitingSupervisorReview.length})</Badge>
              <span className="text-xs text-slate-500">
                New, reopened, or in-progress supervisor reviews
              </span>
            </div>
          </div>
          <QueueList items={awaitingSupervisorReview} actionMode="review" />
        </div>
      ) : null}

      {/* Section 2: Already routed or closed */}
      {!loading && routedOrClosed.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge tone="slate">Routed &amp; filed records ({routedOrClosed.length})</Badge>
              <span className="text-xs text-slate-500">
                Completed supervisor review — currently with specialty leads, EA, or closed
              </span>
            </div>
          </div>
          <QueueList items={routedOrClosed} actionMode="view" />
        </div>
      ) : null}
    </main>
  );
}

function QueueList({
  items,
  actionMode,
}: {
  items: IncidentListItem[];
  actionMode: 'review' | 'view';
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-4 transition hover:border-slate-300">
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
                  {item.severity === 'Critical' ? (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      Critical
                    </span>
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
                    {new Date(item.createdAt).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {item.currentOwnerRoles.length > 0 ? (
                    <>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        With: {item.currentOwnerRoles.map(getRoleLabel).join(', ')}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <ClockChip dueAt={item.nextClockDueAt} />
              {actionMode === 'review' ? (
                <>
                  <Link
                    href={`/records/${item.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View record
                  </Link>
                  <Link
                    href={`/supervisor/review/${item.id}`}
                    className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-800"
                  >
                    Review &amp; route →
                  </Link>
                </>
              ) : (
                <Link
                  href={`/records/${item.id}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  View record →
                </Link>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
