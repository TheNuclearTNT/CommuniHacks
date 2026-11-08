interface SeverityDotProps {
  severity: 'Critical' | 'Less Serious' | 'Unsure' | string;
}

export function SeverityDot({ severity }: SeverityDotProps) {
  const toneBySeverity: Record<string, string> = {
    Critical: 'bg-red-600',
    'Less Serious': 'bg-amber-500',
    Unsure: 'bg-slate-400',
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${toneBySeverity[severity] ?? 'bg-slate-400'}`} />
      {severity}
    </span>
  );
}
