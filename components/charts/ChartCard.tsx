'use client';

import { useState, type ReactNode } from 'react';

interface Props {
  title: string; // states the finding
  subtitle: string; // says what is plotted
  children: ReactNode;
  table?: ReactNode; // accessible table view of the same numbers
  className?: string;
}

export function ChartCard({ title, subtitle, children, table, className = '' }: Props) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section className={`min-w-0 rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((s) => !s)}
            className="shrink-0 rounded px-2 py-1 text-sm text-blue-700 hover:bg-blue-50"
          >
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>
      {showTable && table ? <div className="max-h-80 overflow-auto text-sm">{table}</div> : children}
    </section>
  );
}

export function SimpleTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-left tabular-nums">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          {head.map((h) => (
            <th key={h} className="py-1 pr-3 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-gray-100">
            {r.map((c, j) => (
              <td key={j} className="py-1 pr-3">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return <div className="animate-pulse rounded bg-gray-100" style={{ height }} aria-label="Loading chart" />;
}
