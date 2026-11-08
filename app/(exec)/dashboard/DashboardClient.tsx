'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InsightsResponse, TrendsResponse } from '@/lib/types';
import { SITES } from '@/lib/mock/ananya';
import { AiBriefing } from '@/components/charts/AiBriefing';
import { ChartSkeleton } from '@/components/charts/ChartCard';
import { Heatmap } from '@/components/charts/Heatmap';
import { DemoDataTag } from '@/components/charts/DemoDataTag';
import { MetricCards } from '@/components/charts/MetricCards';
import { SiteBarChart } from '@/components/charts/SiteBarChart';
import { StageDurationChart } from '@/components/charts/StageDurationChart';
import { WeeklyTypeChart } from '@/components/charts/WeeklyTypeChart';
import { fetchInsights, fetchTrends, USE_DASHBOARD_MOCK } from './data';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};

const PRESETS = [
  { label: 'Last 4 weeks', days: 27 },
  { label: 'Last 12 weeks', days: 83 },
  { label: 'Last 6 months', days: 182 },
] as const;

const isEmpty = (t: TrendsResponse) => t.bySite.length === 0 && t.byWeekType.length === 0;

interface Result<T> {
  key: string;
  data: T | null;
  error: string | null;
}
const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export function DashboardClient(_props?: { noRole?: boolean }) {
  void _props;
  const [from, setFrom] = useState(() => daysAgo(83));
  const [to, setTo] = useState(() => daysAgo(0));
  const [site, setSite] = useState('');

  const [reload, setReload] = useState(0);

  // Each result remembers which request it answers; while the current request
  // is still out, the previous data stays on screen (dimmed).
  const trendsKey = `${from}|${to}|${site}|${reload}`;
  const insightsKey = `${from}|${to}|${reload}`;
  const [trendsResult, setTrendsResult] = useState<Result<TrendsResponse> | null>(null);
  const [insightsResult, setInsightsResult] = useState<Result<InsightsResponse> | null>(null);

  useEffect(() => {
    const handleRoleChanged = () => setReload((n) => n + 1);
    window.addEventListener('langs:role-changed', handleRoleChanged);
    return () => window.removeEventListener('langs:role-changed', handleRoleChanged);
  }, []);

  useEffect(() => {
    let live = true;
    fetchTrends({ from, to, site: site || undefined })
      .then((data) => live && setTrendsResult({ key: trendsKey, data, error: null }))
      .catch((e: unknown) =>
        live &&
        setTrendsResult((prev) => ({
          key: trendsKey,
          data: prev?.data ?? null,
          error: errorText(e),
        })),
      );
    return () => {
      live = false;
    };
  }, [from, to, site, trendsKey]);

  // The briefing covers the whole organisation, so it ignores the site filter.
  useEffect(() => {
    let live = true;
    fetchInsights({ from, to })
      .then((data) => live && setInsightsResult({ key: insightsKey, data, error: null }))
      .catch((e: unknown) =>
        live && setInsightsResult({ key: insightsKey, data: null, error: errorText(e) }),
      );
    return () => {
      live = false;
    };
  }, [from, to, insightsKey]);

  const loadingTrends = trendsResult?.key !== trendsKey;
  const trends = trendsResult?.data ?? null;
  const trendsError = loadingTrends ? null : (trendsResult?.error ?? null);
  const loadingInsights = insightsResult?.key !== insightsKey;
  const insights = loadingInsights ? null : (insightsResult?.data ?? null);
  const insightsError = loadingInsights ? null : (insightsResult?.error ?? null);

  const applyPreset = useCallback((days: number) => {
    setFrom(daysAgo(days));
    setTo(daysAgo(0));
  }, []);

  const activePreset =
    to === daysAgo(0) ? PRESETS.find((p) => from === daysAgo(p.days))?.label : undefined;

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            Executive &amp; Leadership Analytics
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Incident Trends &amp; Pathway Bottlenecks
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track incident categories, site volumes, day-of-week heatmaps, and stage-by-stage pathway turnaround times.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DemoDataTag />
          {USE_DASHBOARD_MOCK && (
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
              Mock data mode
            </span>
          )}
        </div>
      </header>

      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range presets">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              aria-pressed={activePreset === p.label}
              className={`min-h-10 rounded-xl border px-3.5 text-xs font-semibold transition ${
                activePreset === p.label
                  ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>From</span>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>To</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span>Site</span>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800"
            >
              <option value="">All Langs sites</option>
              {SITES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {trendsError ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Couldn&apos;t load trends: {trendsError}</p>
          <button
            type="button"
            onClick={() => setReload((n) => n + 1)}
            className="mt-2 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100"
          >
            Try again
          </button>
        </div>
      ) : loadingTrends && !trends ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <ChartSkeleton key={i} height={104} />
            ))}
          </div>
          <ChartSkeleton height={300} />
        </div>
      ) : trends && isEmpty(trends) ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <p className="font-semibold">
            No incidents in this date range{site ? ` at ${site}` : ''}.
          </p>
          <p className="mt-1 text-sm">Try a longer range or all sites.</p>
        </div>
      ) : trends ? (
        <div
          className={`space-y-5 transition-opacity ${loadingTrends ? 'opacity-60' : ''}`}
          aria-busy={loadingTrends}
        >
          <MetricCards totals={trends.totals} />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <StageDurationChart data={trends.stageDurations} />
            </div>
            <AiBriefing data={insights} loading={loadingInsights} error={insightsError} />
          </div>
          <WeeklyTypeChart data={trends.byWeekType} />
          <div className="grid gap-5 lg:grid-cols-2">
            <SiteBarChart data={trends.bySite} />
            <Heatmap data={trends.heatmap} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
