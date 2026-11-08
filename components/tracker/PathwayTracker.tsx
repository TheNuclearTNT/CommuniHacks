'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { ToConfirmTag } from '@/components/ui/ToConfirmTag';
import { getRoleLabel, getUserDisplayName } from '@/lib/question-labels';
import type { IncidentDetail, Status } from '@/lib/types';

export interface PathwayTrackerProps {
  detail: IncidentDetail;
}

const STAGES: { key: Status; label: string; shortDesc: string }[] = [
  { key: 'SUBMITTED', label: 'Submitted', shortDesc: 'Staff intake logged' },
  { key: 'SUPERVISOR_REVIEW', label: 'Supervisor review', shortDesc: 'Triage & routing' },
  { key: 'SPECIALTY_REVIEW', label: 'Specialty acknowledgement', shortDesc: 'Parallel role sign-off' },
  { key: 'WITH_EA', label: 'With Executive Assistant', shortDesc: 'Final receipt check' },
  { key: 'CLOSED', label: 'Filed and closed', shortDesc: 'Complete & archived' },
];

const STAGE_ORDER: Record<Status, number> = {
  SUBMITTED: 0,
  REOPENED: 0,
  SUPERVISOR_REVIEW: 1,
  SPECIALTY_REVIEW: 2,
  WITH_EA: 3,
  CLOSED: 4,
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function PathwayTracker({ detail }: PathwayTrackerProps) {
  const [showAuditLog, setShowAuditLog] = useState(false);
  const { incident, acknowledgements, events } = detail;
  const currentIdx = STAGE_ORDER[incident.status] ?? 0;
  const currentOwners = incident.currentOwnerRoles ?? [];

  // Filter acknowledgements for current cycle (or all if none match)
  const currentCycleAcks = acknowledgements.filter((a) => a.cycle === incident.cycle);
  const displayAcks = currentCycleAcks.length > 0 ? currentCycleAcks : acknowledgements;

  // Group events by cycle
  const cycles = Array.from(new Set(events.map((e) => e.cycle))).sort((a, b) => b - a);

  return (
    <Card className="p-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Pathway Tracker</h2>
            {incident.cycle > 1 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Cycle {incident.cycle} (Reopened on same ID)
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Live stage progression, parallel specialty sign-offs, and immutable audit trail
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentOwners.length > 0 && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              Current owner:{' '}
              <strong className="font-semibold text-slate-900">
                {currentOwners.map(getRoleLabel).join(', ')}
              </strong>
            </span>
          )}
          <StatusPill status={incident.status} />
        </div>
      </div>

      {/* 5-Stage Visual Stepper */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-5">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx || incident.status === 'CLOSED';
          const isActive = idx === currentIdx && incident.status !== 'CLOSED';
          return (
            <div
              key={stage.key}
              className={`relative flex flex-col justify-between rounded-xl border p-3 transition ${
                isActive
                  ? 'border-sky-400 bg-sky-50/70 ring-2 ring-sky-500/20'
                  : isCompleted
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isActive
                        ? 'bg-accent text-white'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCompleted
                      ? 'text-emerald-700'
                      : isActive
                        ? 'text-accent'
                        : 'text-slate-400'
                  }`}
                >
                  {isCompleted ? 'Done' : isActive ? 'Current' : 'Pending'}
                </span>
              </div>
              <div className="mt-2.5">
                <p className="text-xs font-bold text-slate-900">{stage.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{stage.shortDesc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Specialty Acknowledgements Grid */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
              Stage 3 · Specialty Acknowledgements ({displayAcks.filter((a) => a.ackedAt).length}/
              {displayAcks.length})
            </h3>
            <span className="text-[11px] text-slate-500">Parallel sign-off</span>
          </div>

          {displayAcks.length === 0 ? (
            <p className="mt-2.5 text-xs text-slate-600">
              No specialty acknowledgements required yet (determined upon Supervisor Review).
            </p>
          ) : (
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {displayAcks.map((ack) => {
                const done = Boolean(ack.ackedAt);
                return (
                  <div
                    key={ack.id}
                    className={`rounded-xl border p-3 ${
                      done
                        ? 'border-emerald-200 bg-white'
                        : 'border-amber-200 bg-amber-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {getRoleLabel(ack.role)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ack.toConfirm && <ToConfirmTag />}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            done
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {done ? 'Signed off ✓' : 'Awaiting sign-off'}
                        </span>
                      </div>
                    </div>
                    {done ? (
                      <div className="mt-1.5 text-xs text-slate-600">
                        <p>
                          By <strong className="font-medium text-slate-800">{getUserDisplayName(ack.ackedBy)}</strong> ·{' '}
                          {formatDateTime(ack.ackedAt)}
                        </p>
                        {ack.comment && (
                          <p className="mt-1 italic text-slate-700">&ldquo;{ack.comment}&rdquo;</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-amber-800">
                        Waiting for {getRoleLabel(ack.role)} review and acknowledgement.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stage 4 & 5 EA Filing Summary */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
              Stage 4 &amp; 5 · EA Receipt
            </h3>
            {incident.status === 'CLOSED' ? (
              <div className="mt-2.5 rounded-lg border border-emerald-200 bg-white p-3">
                <p className="text-xs font-bold text-emerald-800">✓ Received &amp; Filed</p>
                <p className="mt-1 text-xs text-slate-600">
                  Closed at {formatDateTime(incident.closedAt)}
                </p>
              </div>
            ) : incident.status === 'WITH_EA' ? (
              <div className="mt-2.5 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3">
                <p className="text-xs font-bold text-indigo-900">Ready for Executive Assistant</p>
                <p className="mt-1 text-xs text-indigo-800">
                  All specialty acknowledgements are complete. Waiting for final receipt &amp; filing.
                </p>
              </div>
            ) : (
              <p className="mt-2.5 text-xs text-slate-600">
                Unlocks automatically once Supervisor Review and all required Specialty Acknowledgements are signed off.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowAuditLog((v) => !v)}
            className="mt-4 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {showAuditLog ? 'Hide audit log ▲' : `Show audit log (${events.length} events) ▼`}
          </button>
        </div>
      </div>

      {/* Collapsible Cycle-Grouped Audit Log */}
      {showAuditLog && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
            Immutable Pathway Audit Log
          </h3>
          <div className="space-y-4">
            {cycles.map((cycleNum) => {
              const cycleEvents = events.filter((e) => e.cycle === cycleNum);
              return (
                <div key={cycleNum}>
                  {cycles.length > 1 && (
                    <p className="mb-2 text-xs font-bold text-slate-700">
                      Cycle {cycleNum} {cycleNum > 1 ? '(Reopened)' : '(Initial)'}
                    </p>
                  )}
                  <ol className="space-y-2 border-l-2 border-slate-200 pl-3">
                    {cycleEvents.map((ev, index) => (
                      <li key={`${ev.time}-${ev.kind}-${index}`} className="text-xs text-slate-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {ev.kind.replace(/_/g, ' ')}
                            {ev.toStatus ? ` → ${ev.toStatus}` : ''}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {formatDateTime(ev.time)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {getUserDisplayName(ev.actorId)}
                          {ev.payload && typeof ev.payload.reason === 'string'
                            ? ` — "${ev.payload.reason}"`
                            : ev.payload && typeof ev.payload.comment === 'string'
                              ? ` — "${ev.payload.comment}"`
                              : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
