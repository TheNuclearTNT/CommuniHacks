'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Badge, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncidents } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import type { IncidentListItem } from '@/lib/types';

export default function SupervisorQueuePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-6xl px-4 py-8"><p className="text-slate-500">Loading queue…</p></main>}>
      <SupervisorQueueContent />
    </Suspense>
  );
}

function SupervisorQueueContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const siteFilter = params.get('site') ?? '';
  const typeFilter = params.get('type') ?? '';

  useEffect(() => {
    let active = true;

    getIncidents({ scope: 'queue' })
      .then((data) => {
        if (active) setItems(data.length ? data : MOCK_NEEL_LIST.filter((item) => item.status !== 'CLOSED'));
      })
      .catch(() => {
        if (active) setItems(MOCK_NEEL_LIST.filter((item) => item.status !== 'CLOSED'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (siteFilter && item.location !== siteFilter) return false;
      if (typeFilter && !item.types.includes(typeFilter as never)) return false;
      return true;
    });
  }, [items, siteFilter, typeFilter]);

  const needsAttention = filteredItems.filter((item) => item.severity === 'Critical');
  const normalItems = filteredItems.filter((item) => !needsAttention.includes(item));

  const updateParam = (key: string, value: string) => {
    const search = new URLSearchParams(params.toString());
    if (value) search.set(key, value); else search.delete(key);
    router.replace(`/supervisor?${search.toString()}`);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Supervisor</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Review queue</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={siteFilter}
            onChange={(event) => updateParam('site', event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="">All sites</option>
            <option value="Main Site">Main Site</option>
            <option value="Grow Community Centre">Grow Community Centre</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => updateParam('type', event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
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

      {loading ? <p className="text-slate-500">Loading queue…</p> : null}

      {!loading && filteredItems.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">No incidents match the current queue filters.</p>
        </Card>
      ) : null}

      {!loading && needsAttention.length > 0 ? (
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="amber">Needs attention</Badge>
          </div>
          <QueueList items={needsAttention} />
        </div>
      ) : null}

      {!loading && normalItems.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge tone="slate">All queue items</Badge>
          </div>
          <QueueList items={normalItems} />
        </div>
      ) : null}
    </main>
  );
}

function QueueList({ items }: { items: IncidentListItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className="p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <SeverityDot severity={item.severity} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/records/${item.id}`} className="text-base font-semibold text-slate-900 hover:text-blue-700">
                    {item.id}
                  </Link>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.types.map((type) => (
                    <TypeChip key={`${item.id}-${type}`} type={type} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <ClockChip dueAt={item.nextClockDueAt} />
              <Link href={`/supervisor/review/${item.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                Review
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <span>{item.location}</span>
            <span>{new Date(item.createdAt).toLocaleDateString('en-CA')}</span>
            <span>{item.oneLiner}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
