'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncidents, getMe } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import type { IncidentListItem, Role } from '@/lib/types';

export default function SpecialtyInboxPage() {
  const [items, setItems] = useState<IncidentListItem[]>([]);
  const [role, setRole] = useState<Role>('PRIVACY_OFFICER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      getMe().catch(() => ({ role: 'PRIVACY_OFFICER' as Role })),
      getIncidents({ scope: 'inbox' }).catch(() => MOCK_NEEL_LIST),
    ])
      .then(([me, data]) => {
        if (!active) return;
        setRole(me.role);
        setItems(
          data.filter(
            (item) => item.currentOwnerRoles.includes(me.role) || item.status === 'SPECIALTY_REVIEW',
          ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Role inbox</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Review and acknowledgement</h1>
        </div>
        <Badge tone="blue">{role}</Badge>
      </div>

      {loading ? <p className="text-slate-500">Loading your inbox…</p> : null}
      {!loading && items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-600">You have no incidents waiting for review and acknowledgement.</p>
        </Card>
      ) : null}

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
                <Link href={`/records/${item.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                  View record
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
    </main>
  );
}
