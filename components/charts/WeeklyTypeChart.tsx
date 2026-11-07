'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IncidentType, TrendsResponse } from '@/lib/types';
import { ChartCard, SimpleTable } from './ChartCard';
import { AXIS_TEXT, GRID, TYPE_COLOR, TYPE_LABEL, TYPE_ORDER } from './typeStyles';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function weekLabel(week: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(week);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : week;
}

type Row = { week: string } & Partial<Record<IncidentType, number>>;

export function WeeklyTypeChart({ data }: { data: TrendsResponse['byWeekType'] }) {
  const weeks = [...new Set(data.map((d) => d.week))].sort();
  const rows: Row[] = weeks.map((week) => {
    const r: Row = { week };
    for (const t of TYPE_ORDER) r[t] = 0;
    for (const d of data) if (d.week === week) r[d.type] = (r[d.type] ?? 0) + d.count;
    return r;
  });
  const totals = TYPE_ORDER.map((t) => ({ t, n: data.filter((d) => d.type === t).reduce((s, d) => s + d.count, 0) }));
  const present = TYPE_ORDER.filter((t) => totals.find((x) => x.t === t)!.n > 0);
  const top = [...totals].sort((a, b) => b.n - a.n)[0];
  const title = top && top.n > 0 ? `${TYPE_LABEL[top.t]} reports are the most common type` : 'Incidents per week';

  return (
    <ChartCard
      title={title}
      subtitle="Incidents per week by type. A record with two types counts in both."
      table={
        <SimpleTable
          head={['Week of', ...present.map((t) => TYPE_LABEL[t])]}
          rows={rows.map((r) => [weekLabel(r.week), ...present.map((t) => r[t] ?? 0)])}
        />
      }
    >
      <div className="h-72" role="img" aria-label={`Stacked bar chart of incidents per week by type. ${title}.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="week" tickFormatter={weekLabel} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis allowDecimals={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip labelFormatter={(w) => `Week of ${weekLabel(String(w))}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {present.map((t, i) => (
              <Bar
                key={t}
                dataKey={t}
                name={TYPE_LABEL[t]}
                stackId="types"
                fill={TYPE_COLOR[t]}
                stroke="#ffffff"
                strokeWidth={1}
                radius={i === present.length - 1 ? [4, 4, 0, 0] : 0}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
