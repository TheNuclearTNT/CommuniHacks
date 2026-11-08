'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, TypeChip } from '@/components/ui';
import type { SimilarIncidentsResponse } from '@/app/api/incidents/[id]/similar/route';

// "Similar incidents": same site, a shared incident type, in the 4 weeks
// before this report. Helps a supervisor spot a pattern while reviewing.
export function SimilarIncidents({ incidentId }: { incidentId: string }) {
  const [data, setData] = useState<SimilarIncidentsResponse | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/incidents/${encodeURIComponent(incidentId)}/similar`)
      .then((r) => (r.ok ? (r.json() as Promise<SimilarIncidentsResponse>) : null))
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [incidentId]);

  if (!data) return null;
  const n = data.items.length;

  return (
    <Card className={`p-5 ${n >= 3 ? 'border-amber-300' : ''}`}>
      <h2 className="text-base font-semibold text-slate-900">
        {n === 0
          ? `No similar reports at ${data.site} in the last 4 weeks`
          : `${n >= 3 ? '⚠ ' : ''}${n} similar report${n === 1 ? '' : 's'} at ${data.site} in the 4 weeks before this one`}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Same site and a shared incident type.{n >= 3 ? ' This may be a pattern worth a corrective action.' : ''}
      </p>
      {n > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {data.items.slice(0, 5).map((item) => (
            <li key={item.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/records/${encodeURIComponent(item.id)}`} className="text-sm font-medium text-blue-700 underline">
                  {item.id}
                </Link>
                <span className="ml-2 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
                {item.oneLiner && <p className="truncate text-xs text-slate-500">{item.oneLiner}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {item.types.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {n > 5 && <p className="mt-2 text-xs text-slate-500">and {n - 5} more</p>}
    </Card>
  );
}
