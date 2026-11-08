import type { IncidentType } from '@/lib/types';

interface TypeChipProps {
  type: IncidentType | string;
}

const TYPE_LABELS: Record<string, string> = {
  PRIVACY: 'Privacy',
  STAFF_INJURY: 'Staff injury',
  FACILITIES: 'Facilities',
  IT_CYBER: 'IT / Cyber',
  BEHAVIOURAL: 'Behavioural',
  CID: 'CID',
};

export function TypeChip({ type }: TypeChipProps) {
  const label = TYPE_LABELS[type] ?? type;
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700">
      {label}
    </span>
  );
}
