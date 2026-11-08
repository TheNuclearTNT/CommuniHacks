import type { Status } from '@/lib/types';

interface StatusPillProps {
  status: Status;
}

const STATUS_LABELS: Record<Status, string> = {
  SUBMITTED: 'Submitted',
  SUPERVISOR_REVIEW: 'Supervisor review',
  SPECIALTY_REVIEW: 'Specialty acknowledgement',
  WITH_EA: 'With Executive Assistant',
  CLOSED: 'Filed and closed',
  REOPENED: 'Reopened',
};

const STATUS_STYLES: Record<Status, string> = {
  // Stage colours are deliberately NOT the brand green, so a stage is never
  // confused with the green "Filed and closed" or with the app's accent.
  SUBMITTED: 'bg-sky-50 text-sky-700 ring-sky-200',
  SUPERVISOR_REVIEW: 'bg-amber-50 text-amber-800 ring-amber-200',
  SPECIALTY_REVIEW: 'bg-sky-50 text-sky-800 ring-sky-200',
  WITH_EA: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  CLOSED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REOPENED: 'bg-red-50 text-red-700 ring-red-200',
};

const STATUS_DOTS: Record<Status, string> = {
  SUBMITTED: 'bg-sky-600',
  SUPERVISOR_REVIEW: 'bg-amber-500',
  SPECIALTY_REVIEW: 'bg-sky-600',
  WITH_EA: 'bg-indigo-600',
  CLOSED: 'bg-emerald-600',
  REOPENED: 'bg-red-600',
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? 'bg-slate-400'}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
