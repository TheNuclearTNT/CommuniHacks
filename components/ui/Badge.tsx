import type { ReactNode } from 'react';

interface BadgeProps {
  tone?: 'blue' | 'slate' | 'amber' | 'red' | 'green';
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'blue', children, className = '' }: BadgeProps) {
  const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
