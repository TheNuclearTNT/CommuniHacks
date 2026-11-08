"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type PortalResponseItem,
  STATUS_LABEL,
  reviewClock,
} from "./types";

const CLOCK_STYLE: Record<string, string> = {
  done: "bg-slate-100 text-slate-600",
  ok: "bg-blue-50 text-blue-700 border border-blue-200",
  soon: "bg-amber-50 text-amber-800 border border-amber-200",
  overdue: "bg-red-50 text-red-700 border border-red-200 font-semibold",
};

// /portal/responses — every submitted report with the key fields:
// location, time, reporter, victim, summary, plus status and the 24h clock.
export default function ResponsesPage() {
  const [items, setItems] = useState<PortalResponseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/portal-responses")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setItems)
      .catch(() => setError("Could not load reports."));
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (statusFilter && it.status !== statusFilter) return false;
      if (!q) return true;
      return (
        it.id.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q) ||
        it.location.toLowerCase().includes(q) ||
        it.reporter.toLowerCase().includes(q) ||
        it.victim.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  return (
    <main>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
            Portal · Intake Log
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Form responses
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every incident reported across Langs sites, newest first, with 24-hour supervisor review SLA clocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, site, reporter, summary…"
            aria-label="Search form responses"
            className="w-64 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-2xs outline-none focus:border-accent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs"
          >
            <option value="">All stages</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="SUPERVISOR_REVIEW">Supervisor review</option>
            <option value="SPECIALTY_REVIEW">Specialty acknowledgement</option>
            <option value="WITH_EA">With Executive Assistant</option>
            <option value="CLOSED">Filed and closed</option>
            <option value="REOPENED">Reopened</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}
      {!items && !error && <p className="text-sm text-slate-500">Loading form responses…</p>}
      {items && filtered.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No reports match the current filter.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((it) => {
          const clock = reviewClock(it);
          return (
            <div
              key={it.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-blue-300"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/records/${it.id}`}
                    className="font-mono text-base font-bold text-slate-900 hover:text-accent"
                  >
                    {it.id}
                  </Link>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {STATUS_LABEL[it.status]}
                  </span>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                      CLOCK_STYLE[clock.level]
                    }
                  >
                    {clock.text}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(it.status === "SUBMITTED" ||
                    it.status === "SUPERVISOR_REVIEW" ||
                    it.status === "REOPENED") && (
                    <Link
                      href={`/supervisor/review/${it.id}`}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                    >
                      Review &amp; route →
                    </Link>
                  )}
                  <Link
                    href={`/records/${it.id}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    View record
                  </Link>
                </div>
              </div>

              <p className="mb-3 text-sm font-medium text-slate-800">{it.summary}</p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50/80 p-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Location
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{it.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Date &amp; time
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">
                    {it.incidentDate ?? "—"}
                    {it.incidentTime ? ` · ${it.incidentTime}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Reporter
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{it.reporter}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-[0.06em] text-slate-400">
                    Person involved
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{it.victim}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </main>
  );
}
