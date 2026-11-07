// Stand-ins for Neel's components/ui AiLabel and ToConfirmTag so the dashboard
// builds before components/ui is merged. Swap the imports to '@/components/ui'
// once it lands, then delete this file.

export function AiLabel() {
  return (
    <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-800">
      AI-generated — check
    </span>
  );
}

export function ToConfirmTag({ label = 'TO CONFIRM' }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600">
      {label}
    </span>
  );
}

export function DemoDataTag() {
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      Fictional demo data
    </span>
  );
}
