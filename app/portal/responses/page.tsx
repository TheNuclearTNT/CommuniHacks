"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  type PortalResponseItem,
  STATUS_LABEL,
  reviewClock,
} from "./types";

const CLOCK_STYLE: Record<string, string> = {
  done: "bg-slate-100 text-slate-600",
  ok: "bg-accent-light text-accent",
  soon: "bg-amber-50 text-warn",
  overdue: "bg-red-50 text-critical",
};

// /portal/responses — every submitted report with the key fields:
// location, time, reporter, victim, summary, plus status and the 24h clock.
export default function ResponsesPage() {
  const [items, setItems] = useState<PortalResponseItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal-responses")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setItems)
      .catch(() => setError("Could not load reports."));
  }, []);

  return (
    <main>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Form responses</h1>
      <p className="mb-6 text-slate-600">
        Every incident reported, newest first.
      </p>

      {error && <p className="text-warn">{error}</p>}
      {!items && !error && <p className="text-slate-500">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-slate-500">No reports yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((it) => {
          const clock = reviewClock(it);
          return (
            <Link
              key={it.id}
              href={`/records/${it.id}`}
              className="block rounded-xl border border-slate-200 p-4 hover:border-accent"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900">{it.id}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-light px-2.5 py-0.5 text-xs font-medium text-accent">
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
              </div>

              <p className="mb-2 text-slate-800">{it.summary}</p>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-slate-400">Location</dt>
                  <dd className="text-slate-700">{it.location}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Date &amp; time</dt>
                  <dd className="text-slate-700">
                    {it.incidentDate ?? "—"}
                    {it.incidentTime ? `, ${it.incidentTime}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Reporter</dt>
                  <dd className="text-slate-700">{it.reporter}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Person involved</dt>
                  <dd className="text-slate-700">{it.victim}</dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
