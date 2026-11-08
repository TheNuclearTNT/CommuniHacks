import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description ? <div className="mt-2 text-sm text-slate-600">{description}</div> : null}
    </div>
  );
}
