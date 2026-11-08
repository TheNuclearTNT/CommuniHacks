'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { InsightsResponse } from '@/lib/types';
import { AiLabel } from '@/components/ui';

const recordHref = (id: string) => `/records/${encodeURIComponent(id)}`;

function RecordLinks({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  if (ids.length === 0) return null;
  if (ids.length === 1) {
    return (
      <Link href={recordHref(ids[0])} className="ml-1 text-blue-700 underline">
        see 1 record
      </Link>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="ml-1 text-blue-700 underline" aria-expanded={open}>
        {open ? 'hide records' : `see ${ids.length} records`}
      </button>
      {open && (
        <span className="mt-2 flex flex-wrap gap-1.5">
          {ids.map((id) => (
            <Link key={id} href={recordHref(id)} className="rounded border border-gray-200 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50">
              {id}
            </Link>
          ))}
        </span>
      )}
    </>
  );
}

interface Props {
  data: InsightsResponse | null;
  loading: boolean;
  error: string | null;
}

export function AiBriefing({ data, loading, error }: Props) {
  return (
    <section className="min-w-0 rounded-lg border border-blue-200 bg-white p-4" aria-live="polite">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">Briefing</h2>
        <AiLabel />
        {data?.mock && <span className="text-xs text-gray-500">Sample briefing (mock mode)</span>}
      </div>

      {loading && (
        <div className="space-y-2" aria-label="Loading briefing">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-gray-100" style={{ width: `${90 - i * 12}%` }} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-gray-600">The briefing isn&apos;t available right now. The numbers and charts on this page are calculated directly from the records.</p>
      )}

      {!loading && !error && data && data.bullets.length === 0 && <p className="text-sm text-gray-600">No notable patterns in this date range.</p>}

      {!loading && !error && data && data.bullets.length > 0 && (
        <>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-800">
            {data.bullets.map((b, i) => (
              <li key={i}>
                {b.text}
                <RecordLinks ids={b.incidentIds} />
              </li>
            ))}
          </ul>
          {data.focus && (
            <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-gray-800">
              <p className="font-medium text-blue-900">Suggested focus</p>
              <p className="mt-0.5">{data.focus}</p>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">Generated {new Date(data.generatedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </>
      )}
    </section>
  );
}
