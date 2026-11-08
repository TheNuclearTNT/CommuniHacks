'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Button, Card, ClockChip, SeverityDot, StatusPill, TypeChip } from '@/components/ui';
import { getIncidents, receiveIncident, reopenIncident } from '@/lib/api-client';
import { MOCK_NEEL_LIST } from '@/lib/mock/neel';
import type { IncidentListItem } from '@/lib/types';

export default function ExecutiveAssistantPage() {
  const [waiting, setWaiting] = useState<IncidentListItem[]>([]);
  const [filed, setFiled] = useState<IncidentListItem[]>([]);
  const [tab, setTab] = useState<'waiting' | 'filed'>('waiting');

  const load = async () => {
    try {
      const [waitingData, filedData] = await Promise.all([
        getIncidents({ scope: 'ea' }),
        getIncidents({ scope: 'ea', status: 'CLOSED' }),
      ]);
      setWaiting(waitingData.length ? waitingData : MOCK_NEEL_LIST.filter((item) => item.status === 'WITH_EA'));
      setFiled(filedData.length ? filedData : MOCK_NEEL_LIST.filter((item) => item.status === 'CLOSED'));
    } catch {
      setWaiting(MOCK_NEEL_LIST.filter((item) => item.status === 'WITH_EA'));
      setFiled(MOCK_NEEL_LIST.filter((item) => item.status === 'CLOSED'));
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  const listed = tab === 'waiting' ? waiting : filed;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Executive assistant</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Receipt and filing</h1>
        </div>
        <Badge tone="blue">Records</Badge>
      </div>

      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'waiting' ? 'primary' : 'secondary'} onClick={() => setTab('waiting')}>
          Waiting for receipt
        </Button>
        <Button variant={tab === 'filed' ? 'primary' : 'secondary'} onClick={() => setTab('filed')}>
          Filed records
        </Button>
      </div>

      <div className="space-y-3">
        {listed.map((item) => (
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
                {tab === 'waiting' ? (
                  <Button
                    variant="primary"
                    onClick={async () => {
                      await receiveIncident(item.id);
                      await load();
                    }}
                  >
                    Confirm receipt and file
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const reason = window.prompt('Please add the reason for reopening the record') ?? 'Follow-up needed';
                      await reopenIncident(item.id, { reason });
                      await load();
                    }}
                  >
                    Reopen
                  </Button>
                )}
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
