"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Status } from "@/lib/types";
import {
  type PortalResponseItem,
  STATUS_LABEL,
  reviewClock,
} from "../responses/types";

// Three buckets the brief asks for.
type Bucket = "needs-review" | "in-progress" | "with-exec" | "closed";

function bucketOf(status: Status): Bucket {
  if (status === "SUBMITTED" || status === "SUPERVISOR_REVIEW" || status === "REOPENED") {
    return "needs-review";
  }
  if (status === "SPECIALTY_REVIEW") return "in-progress";
  if (status === "WITH_EA") return "with-exec";
  return "closed";
}

const BUCKETS: { key: Bucket; title: string; note: string }[] = [
  { key: "needs-review", title: "Needs review", note: "Waiting on a supervisor" },
  { key: "in-progress", title: "Under specialty review", note: "Being acknowledged" },
  { key: "with-exec", title: "Sent to Executive Assistant", note: "Final receipt" },
  { key: "closed", title: "Filed and closed", note: "Done (can reopen)" },
];

export default function StatusPage() {
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
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Report status</h1>
      <p className="mb-6 text-slate-600">
        Where each report sits in the pathway.
      </p>

      {error && <p className="text-warn">{error}</p>}
      {!items && !error && <p className="text-slate-500">Loading…</p>}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {BUCKETS.map((b) => {
          const list = byBucket(b.key);
          return (
            <section
              key={b.key}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="mb-3">
                <h2 className="font-semibold text-slate-900">
                  {b.title}{" "}
                  <span className="text-slate-400">({list.length})</span>
                </h2>
                <p className="text-xs text-slate-400">{b.note}</p>
              </div>
              <div className="flex flex-col gap-2">
                {list.length === 0 && (
                  <p className="text-sm text-slate-400">None.</p>
                )}
                {list.map((it) => {
                  const clock = reviewClock(it);
                  const urgent =
                    clock.level === "overdue" || clock.level === "soon";
                  return (
                    <Link
                      key={it.id}
                      href={`/records/${it.id}`}
                      className="rounded-lg border border-slate-200 p-3 text-sm hover:border-accent"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">
                          {it.id}
                        </span>
                        {b.key === "needs-review" && (
                          <span
                            className={
                              urgent ? "text-critical" : "text-slate-400"
                            }
                          >
                            {clock.text}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-slate-600">
                        {it.summary}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {it.location} · {STATUS_LABEL[it.status]}
                      </p>
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
