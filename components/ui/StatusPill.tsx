import type { Status } from '@/lib/types';

interface StatusPillProps {
  status: Status | string;
}

export function StatusPill({ status }: StatusPillProps) {
  const map: Record<string, { label: string; className: string }> = {
    SUBMITTED: { label: 'Submitted', className: 'bg-slate-100 text-slate-700' },
    SUPERVISOR_REVIEW: {
      label: 'Supervisor review',
      className: 'bg-blue-50 text-blue-700',
    },
    SPECIALTY_REVIEW: {
      label: 'Specialty review',
      className: 'bg-amber-50 text-amber-700',
    },
    WITH_EA: { label: 'With EA', className: 'bg-violet-50 text-violet-700' },
    CLOSED: { label: 'Closed', className: 'bg-emerald-50 text-emerald-700' },
    REOPENED: { label: 'Reopened', className: 'bg-amber-50 text-amber-800' },
  };

  const config = map[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
