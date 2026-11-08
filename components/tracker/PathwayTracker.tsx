'use client';

import { useMemo, useState } from 'react';
import { Badge, StatusPill, ToConfirmTag } from '@/components/ui';
import { MOCK_ROLE_USERS } from '@/lib/mock/neel';
import type { IncidentDetail, Role } from '@/lib/types';

const roleLabels: Record<Role, string> = {
  STAFF: 'Staff',
  SUPERVISOR: 'Supervisor',
  PRIVACY_OFFICER: 'Privacy officer',
  JOHSC_CHAIR: 'JOHSC chair',
  IT_FACILITIES: 'IT / Facilities',
  DIRECTOR_OPS: 'Director of operations',
  CID_GROUP: 'CID group',
  EXEC_ASSISTANT: 'Executive assistant',
  EXECUTIVE: 'Executive',
};

function formatActor(id: string): string {
  const byId = new Map(MOCK_ROLE_USERS.map((user) => [user.id, user.name]));
  return byId.get(id) ?? id;
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not yet';
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function PathwayTracker({ detail }: { detail: IncidentDetail }) {
  const [showTimeline, setShowTimeline] = useState(true);

  const cycleAcks = useMemo(
    () => detail.acknowledgements.filter((ack) => ack.cycle === detail.incident.cycle),
    [detail],
  );

  const receivedBy = detail.acknowledgements.find(
    (ack) => ack.role === 'EXEC_ASSISTANT' && ack.ackedAt,
  );

  const steps = [
    { key: 'submitted', label: 'Submitted', done: true },
    { key: 'review', label: 'Supervisor review', done: detail.incident.status !== 'SUBMITTED' },
    {
      key: 'specialty',
      label: 'Specialty acknowledgement',
      done: ['SPECIALTY_REVIEW', 'WITH_EA', 'CLOSED', 'REOPENED'].includes(detail.incident.status),
    },
    {
      key: 'ea',
      label: 'Executive Assistant',
      done: ['WITH_EA', 'CLOSED', 'REOPENED'].includes(detail.incident.status),
    },
    { key: 'filed', label: 'Filed', done: ['CLOSED', 'REOPENED'].includes(detail.incident.status) },
  ];

  const statusText =
    detail.incident.status === 'REOPENED'
      ? `Reopened — cycle ${detail.incident.cycle}`
      : detail.incident.status;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Routing status</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Now with:</span>
            <span className="text-sm text-slate-700">
              {detail.incident.currentOwnerRoles.length > 0
                ? detail.incident.currentOwnerRoles.map((role) => roleLabels[role]).join(', ')
                : 'Unassigned'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusPill status={detail.incident.status} />
          {detail.incident.cycle > 1 ? <Badge tone="amber">Reopened — cycle {detail.incident.cycle}</Badge> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const tone = step.done
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-200 bg-white text-slate-500';
          const connector = index < steps.length - 1 ? 'after:absolute after:-right-2 after:top-1/2 after:h-px after:w-4 after:-translate-y-1/2 after:bg-slate-200' : '';

          return (
            <div key={step.key} className={`relative ${connector}`}>
              <div className={`flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                {step.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Status:</span>
          <span>{statusText}</span>
        </div>

        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <span>Specialty acknowledgements</span>
            <span className="font-medium text-slate-900">
              {cycleAcks.filter((ack) => ack.ackedAt).length}/{cycleAcks.length || 0}
            </span>
          </div>

          {cycleAcks.length === 0 ? (
            <div className="text-slate-500">No specialty acknowledgements required for this route.</div>
          ) : (
            cycleAcks.map((ack) => (
              <div key={ack.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-2 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{roleLabels[ack.role]}</span>
                    {ack.toConfirm ? <ToConfirmTag /> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {ack.ackedAt
                      ? `Acknowledged by ${formatActor(ack.ackedBy ?? 'unknown')} on ${formatDateTime(ack.ackedAt)}`
                      : 'Waiting'}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${ack.ackedAt ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {ack.ackedAt ? '✓ Done' : 'Waiting'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <span>Executive Assistant</span>
            <span>
              {receivedBy
                ? `Received by ${formatActor(receivedBy.ackedBy ?? 'EA')} • ${formatDateTime(receivedBy.ackedAt)}`
                : 'Waiting for receipt'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={() => setShowTimeline((value) => !value)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          {showTimeline ? 'Hide' : 'Show'} timeline
        </button>

        {showTimeline ? (
          <div className="mt-4 space-y-3">
            {Object.entries(
              detail.events.reduce<Record<number, typeof detail.events>>((acc, event) => {
                const cycle = event.cycle;
                acc[cycle] = [...(acc[cycle] ?? []), event];
                return acc;
              }, {}),
            ).map(([cycle, events]) => (
              <div key={cycle} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Cycle {cycle}</p>
                  {Number(cycle) > 1 ? <Badge tone="amber">Reopened</Badge> : null}
                </div>
                <div className="space-y-2">
                  {events.map((event, index) => (
                    <div key={`${event.time}-${index}`} className="flex gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <span className="mt-0.5 text-xs font-medium text-slate-500">
                        {formatDateTime(event.time)}
                      </span>
                      <div className="flex-1 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{formatActor(event.actorId)}</span>{' '}
                        {event.kind === 'SUBMITTED' && 'submitted the incident'}
                        {event.kind === 'OPENED' && 'opened the record for review'}
                        {event.kind === 'REVIEW_SUBMITTED' && 'submitted the supervisor review'}
                        {event.kind === 'ROUTED' && 'routed the incident'}
                        {event.kind === 'ACKNOWLEDGED' && 'acknowledged the incident'}
                        {event.kind === 'EA_RECEIVED' && 'received the filed record'}
                        {event.kind === 'CLOSED' && 'filed the record'}
                        {event.kind === 'REOPENED' && 'reopened the record for follow-up'}
                        {event.kind === 'NOTE' && 'added follow-up information'}
                        {event.kind === 'ACTION_UPDATED' && 'updated a follow-up action'}
                        {event.kind === 'CLOCK_MET' && 'closed a compliance clock'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
