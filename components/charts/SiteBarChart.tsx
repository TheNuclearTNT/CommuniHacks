'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendsResponse } from '@/lib/types';
import { ChartCard, SimpleTable } from './ChartCard';
import { ACCENT, AXIS_TEXT, GRID } from './typeStyles';

// Neel's supervisor queue reads ?site=
export const siteQueueHref = (site: string) => `/supervisor?site=${encodeURIComponent(site)}`;

export function SiteBarChart({ data }: { data: TrendsResponse['bySite'] }) {
  const router = useRouter();
  const rows = [...data].sort((a, b) => b.count - a.count);
  const title = rows.length ? `${rows[0].site} has the most reports` : 'Incidents by site';

  return (
    <ChartCard
      title={title}
      subtitle="Incidents by site. Select a site to open its records."
      table={
        <SimpleTable
          head={['Site', 'Incidents']}
          rows={rows.map((r) => [
            <Link key={r.site} href={siteQueueHref(r.site)} className="text-blue-700 underline">
              {r.site}
            </Link>,
            r.count,
          ])}
        />
      }
    >
      <div style={{ height: Math.max(180, rows.length * 34 + 30) }} role="img" aria-label={`Horizontal bar chart of incidents by site. ${title}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="site" width={190} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
            <Tooltip cursor={{ fill: 'rgba(42,120,214,0.08)' }} formatter={(v) => [v, 'Incidents']} />
            <Bar
              dataKey="count"
              fill={ACCENT}
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
              cursor="pointer"
              onClick={(entry: unknown) => {
                const e = entry as { site?: string; payload?: { site?: string } };
                const site = e.payload?.site ?? e.site;
                if (site) router.push(siteQueueHref(site));
              }}
            >
              <LabelList dataKey="count" position="right" style={{ fill: AXIS_TEXT, fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
