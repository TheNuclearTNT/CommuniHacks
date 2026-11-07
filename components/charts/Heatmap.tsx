'use client';

import type { TrendsResponse } from '@/lib/types';
import { ChartCard, SimpleTable } from './ChartCard';
import { HEAT_STEPS } from './typeStyles';

const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon first; API uses 0 = Sun
const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DOW_PLURAL = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

export function Heatmap({ data }: { data: TrendsResponse['heatmap'] }) {
  const cell = new Map(data.map((d) => [`${d.dow}|${d.hour}`, d.count]));
  const withData = data.filter((d) => d.count > 0).map((d) => d.hour);
  const minH = Math.min(7, ...withData);
  const maxH = Math.max(19, ...withData);
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
  const max = Math.max(1, ...data.map((d) => d.count));
  const peak = [...data].sort((a, b) => b.count - a.count)[0];

  const step = (n: number) => (n === 0 ? 0 : Math.min(HEAT_STEPS.length - 1, 1 + Math.floor(((n - 1) / max) * (HEAT_STEPS.length - 1))));
  const title = peak && peak.count > 0 ? `Busiest time: ${DOW_PLURAL[peak.dow]}, ${hourLabel(peak.hour)}–${hourLabel(peak.hour + 1)}` : 'When incidents happen';

  return (
    <ChartCard
      title={title}
      subtitle="Incidents by day of week and hour they happened"
      table={
        <SimpleTable
          head={['Day', 'Hour', 'Incidents']}
          rows={[...data]
            .filter((d) => d.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((d) => [DOW_SHORT[d.dow], hourLabel(d.hour), d.count])}
        />
      }
    >
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[560px] gap-[2px] text-xs"
          style={{ gridTemplateColumns: `3rem repeat(${hours.length}, minmax(0, 1fr))` }}
          role="grid"
          aria-label={`Heatmap of incidents by day and hour. ${title}.`}
        >
          <div />
          {hours.map((h) => (
            <div key={h} className="pb-1 text-center text-gray-500">
              {h % 2 === 1 ? '' : hourLabel(h)}
            </div>
          ))}
          {DOW_ORDER.map((dow) => (
            <div key={dow} className="contents" role="row">
              <div className="flex items-center pr-2 text-gray-600">{DOW_SHORT[dow]}</div>
              {hours.map((h) => {
                const n = cell.get(`${dow}|${h}`) ?? 0;
                const s = step(n);
                const label = `${DOW_SHORT[dow]} ${hourLabel(h)}: ${n} incident${n === 1 ? '' : 's'}`;
                return (
                  <div
                    key={h}
                    role="gridcell"
                    title={label}
                    aria-label={label}
                    className="flex h-8 items-center justify-center rounded-sm tabular-nums hover:ring-2 hover:ring-gray-900"
                    style={{ background: HEAT_STEPS[s], color: s >= 4 ? '#ffffff' : '#0b0b0b' }}
                  >
                    {n > 0 ? n : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <span>Fewer</span>
        {HEAT_STEPS.slice(1).map((c) => (
          <span key={c} className="h-3 w-5 rounded-sm" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </ChartCard>
  );
}
