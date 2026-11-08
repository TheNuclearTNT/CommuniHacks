import { useEffect, useState } from 'react';

interface ClockChipProps {
  dueAt?: string | null;
}

export function ClockChip({ dueAt }: ClockChipProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!dueAt) {
      return;
    }

    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [dueAt]);

  if (!dueAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        No clock
      </span>
    );
  }

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
        No clock
      </span>
    );
  }

  const diffMs = due.getTime() - now;
  const hours = Math.round(diffMs / (1000 * 60 * 60));

  if (hours < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        Overdue • {Math.abs(hours)}h
      </span>
    );
  }

  if (hours <= 24) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Due in {hours}h
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
      Due in {hours}h
    </span>
  );
}
