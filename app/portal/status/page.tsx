"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Status } from "@/lib/types";
import {
  type PortalResponseItem,
  STATUS_LABEL,
  reviewClock,
} from "../responses/types";

type Bucket = "needs-review" | "in-progress" | "with-exec" | "closed";

function bucketOf(status: Status): Bucket {
  if (
    status === "SUBMITTED" ||
    status === "SUPERVISOR_REVIEW" ||
    status === "REOPENED"
  ) {
    return "needs-review";
  }
  if (status === "SPECIALTY_REVIEW") return "in-progress";
  if (status === "WITH_EA") return "with-exec";
  return "closed";
}

const BUCKETS: {
  key: Bucket;
  title: string;
  note: string;
  accentBorder: string;
  badgeClass: string;
}[] = [
  {
    key: "needs-review",
    title: "Needs supervisor review",
    note: "Stage 1–2 · Awaiting supervisor sign-off",
    accentBorder: "border-t-4 border-t-amber-500",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    key: "in-progress",
    title: "Under specialty review",
    note: "Stage 3 · Parallel specialty acknowledgements",
    accentBorder: "border-t-4 border-t-sky-600",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
  },
  {
    key: "with-exec",
    title: "With Executive Assistant",
    note: "Stage 4 · Ready for final receipt",
    accentBorder: "border-t-4 border-t-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  {
    key: "closed",
    title: "Filed and closed",
    note: "Stage 5 · Complete (reopenable on same ID)",
    accentBorder: "border-t-4 border-t-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
];

// The column picked on the home page ("#in-progress" etc.), to highlight it.
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.slice(1);

export default function StatusPage() {
  const selected = useSyncExternalStore(subscribeHash, readHash, () => "");
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

  const byBucket = (b: Bucket) =>
    (items ?? []).filter((it) => bucketOf(it.status) === b);

  return (
    <main>
      <div className="mb-6">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
          Portal · Live Pathway Board
        </span>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Report status across the pathway
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          See where every incident sits in the 5-stage Langs routing workflow. Click any card to open its full record.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}
      {!items && !error && <p className="text-sm text-slate-500">Loading pathway board…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BUCKETS.map((b) => {
          const list = byBucket(b.key);
          return (
            <section
              key={b.key}
              id={b.key}
              className={`flex scroll-mt-24 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs ${b.accentBorder} ${
                selected === b.key ? "ring-2 ring-blue-400 ring-offset-2" : ""
              }`}
            >
              <div className="mb-3 border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">{b.title}</h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-bold ${b.badgeClass}`}
                  >
                    {list.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{b.note}</p>
              </div>

              <div className="flex flex-col gap-2.5">
                {list.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No records in this stage.
                  </p>
                )}
                {list.map((it) => {
                  const clock = reviewClock(it);
                  const urgent =
                    clock.level === "overdue" || clock.level === "soon";
                  return (
                    <Link
                      key={it.id}
                      href={`/records/${it.id}`}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm transition hover:border-blue-300 hover:bg-white hover:shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {it.id}
                        </span>
                        {b.key === "needs-review" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              urgent
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {clock.text}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-relaxed text-slate-800">
                        {it.summary}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium text-slate-600">{it.location}</span>
                        <span>{STATUS_LABEL[it.status]}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
