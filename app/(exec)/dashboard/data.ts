import type { InsightsResponse, TrendsResponse } from '@/lib/types';
import { getInsights, getTrends } from '@/lib/api-client';
import { mockInsights, mockTrends, type DashboardParams } from '@/lib/mock/ananya';

// Live by default (Connan's /api/trends and /api/insights). Set
// NEXT_PUBLIC_DASHBOARD_MOCK=true to show the generated demo data with no backend.
export const USE_DASHBOARD_MOCK = process.env.NEXT_PUBLIC_DASHBOARD_MOCK === 'true';

export function fetchTrends(p: DashboardParams): Promise<TrendsResponse> {
  return USE_DASHBOARD_MOCK ? mockTrends(p) : getTrends({ from: p.from, to: p.to, site: p.site });
}

export function fetchInsights(p: DashboardParams): Promise<InsightsResponse> {
  return USE_DASHBOARD_MOCK ? mockInsights(p) : getInsights({ from: p.from, to: p.to });
}
