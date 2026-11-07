import type { TrendsResponse } from '@/lib/types';
import { ToConfirmTag } from './LocalTags';

function Card({ label, value, sub, tone = 'normal', extra }: { label: string; value: string; sub?: string; tone?: 'normal' | 'alert'; extra?: React.ReactNode }) {
  const alert = tone === 'alert';
  return (
    <div className={`rounded-lg border bg-white p-4 ${alert ? 'border-red-300' : 'border-gray-200'}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${alert ? 'text-red-700' : 'text-gray-900'}`}>
        {alert && <span aria-hidden="true">⚠ </span>}
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-gray-500">{sub}</p>}
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  );
}

// reopenedRate is a percentage (e.g. 5.3), as /api/trends returns it.
const pct = (r: number) => `${r < 10 ? r.toFixed(1) : Math.round(r)}%`;

export function MetricCards({ totals }: { totals: TrendsResponse['totals'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Card label="Incidents this month" value={String(totals.thisMonth)} sub={`${totals.lastMonth} last month`} />
      <Card label="Open records" value={String(totals.open)} sub="Not yet filed and closed" />
      <Card label="Awaiting acknowledgement" value={String(totals.awaitingAck)} sub="With a specialty area" />
      <Card label="Average days to close" value={totals.avgDaysToClose.toFixed(1)} sub="Submitted to filed" />
      <Card
        label="Overdue clocks"
        value={String(totals.overdueClocks)}
        tone={totals.overdueClocks > 0 ? 'alert' : 'normal'}
        sub={totals.overdueClocks > 0 ? 'Past the reporting deadline' : 'None past deadline'}
        extra={<ToConfirmTag label="Prototype guidance — Langs to confirm" />}
      />
      <Card label="Reopened rate" value={pct(totals.reopenedRate)} sub="Of records in this range" />
    </div>
  );
}
