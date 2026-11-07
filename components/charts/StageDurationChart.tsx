'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendsResponse } from '@/lib/types';
import { ChartCard, SimpleTable } from './ChartCard';
import { ACCENT, AXIS_TEXT, GRID, MUTED_BAR, STATUS_LABEL } from './typeStyles';

// Non-breaking space so Recharts doesn't wrap short labels onto two lines.
const fmt = (hours: number) => (hours >= 24 ? `${(hours / 24).toFixed(1)} days` : `${Math.round(hours)} hours`);

export function StageDurationChart({ data }: { data: TrendsResponse['stageDurations'] }) {
  const rows = data
    .filter((d) => d.stage !== 'CLOSED' && d.stage !== 'REOPENED')
    .map((d) => ({ ...d, name: STATUS_LABEL[d.stage], days: Math.round((d.avgHours / 24) * 10) / 10, label: fmt(d.avgHours) }));
  const slowest = rows.reduce<(typeof rows)[number] | null>((m, r) => (!m || r.avgHours > m.avgHours ? r : m), null);
  const title = slowest && slowest.avgHours > 0 ? `Reports wait longest at ${slowest.name.toLowerCase()}` : 'Time in each pathway stage';

  return (
    <ChartCard
      title={title}
      subtitle="Average time a record spends in each step of the pathway"
      table={<SimpleTable head={['Stage', 'Average time']} rows={rows.map((r) => [r.name, r.label])} />}
    >
      <div className="h-56" role="img" aria-label={`Horizontal bar chart of average time in each stage. ${title}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 72, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" dataKey="days" unit=" d" tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={190} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
            <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(_v, _n, item) => [(item.payload as { label: string }).label, 'Average']} />
            <Bar dataKey="days" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {rows.map((r) => (
                <Cell key={r.stage} fill={r === slowest ? ACCENT : MUTED_BAR} />
              ))}
              <LabelList dataKey="label" position="right" style={{ fill: AXIS_TEXT, fontSize: 12 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
