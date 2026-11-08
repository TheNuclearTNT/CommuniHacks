'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TrendsResponse } from '@/lib/types';
import { ChartCard, SimpleTable } from './ChartCard';
import { TYPE_COLOR, TYPE_LABEL, TYPE_ORDER } from './typeStyles';

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Share of each incident type over the selected range (donut + legend). */
export function TypeShareChart({ data }: { data: TrendsResponse['byWeekType'] }) {
  // Fixed type order keeps each colour on the same type as the weekly chart.
  const rows = TYPE_ORDER.map((type) => ({
    type,
    label: TYPE_LABEL[type],
    count: data.filter((d) => d.type === type).reduce((s, d) => s + d.count, 0),
  })).filter((r) => r.count > 0);
  const total = rows.reduce((s, r) => s + r.count, 0);
  const top = [...rows].sort((a, b) => b.count - a.count)[0];
  const title = top ? `${top.label} is ${pct(top.count, total)}% of incidents` : 'Incidents by type';

  return (
    <ChartCard
      title={title}
      subtitle="Share of incidents by type. A record with two types counts in both."
      table={
        <SimpleTable
          head={['Type', 'Incidents', 'Share']}
          rows={rows.map((r) => [r.label, r.count, `${pct(r.count, total)}%`])}
        />
      }
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
        <div className="h-48 w-48 shrink-0" role="img" aria-label={`Donut chart of incidents by type. ${title}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="count"
                nameKey="label"
                innerRadius="58%"
                outerRadius="100%"
                paddingAngle={1}
                stroke="#ffffff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.type} fill={TYPE_COLOR[r.type]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value} (${pct(Number(value), total)}%)`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="w-full space-y-1.5 text-sm">
          {[...rows]
            .sort((a, b) => b.count - a.count)
            .map((r) => (
              <li key={r.type} className="flex items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: TYPE_COLOR[r.type] }} aria-hidden="true" />
                <span className="flex-1 text-gray-700">{r.label}</span>
                <span className="font-medium tabular-nums text-gray-900">{pct(r.count, total)}%</span>
                <span className="w-10 text-right tabular-nums text-gray-500">{r.count}</span>
              </li>
            ))}
        </ul>
      </div>
    </ChartCard>
  );
}
