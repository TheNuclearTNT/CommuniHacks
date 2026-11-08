"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { IncidentListItem, Status } from "@/lib/types";
import { getIncidents } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";

const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: "Submitted",
  SUPERVISOR_REVIEW: "Supervisor review",
  SPECIALTY_REVIEW: "Specialty acknowledgement",
  WITH_EA: "With Executive Assistant",
  CLOSED: "Filed and closed",
  REOPENED: "Reopened",
};

function StatusPill({ status }: { status: Status }) {
  const closed = status === "CLOSED";
  return (
    <span
      className={
        "rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (closed
          ? "bg-slate-100 text-slate-600"
          : "bg-accent-light text-accent")
      }
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// /my-reports — my incidents with a status pill; tap opens Neel's record view.
export default function MyReportsPage() {
  const [items, setItems] = useState<IncidentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIncidents({ scope: "mine" })
      .then(setItems)
      .catch(() => setError("Could not load your reports."));
  }, []);

  return (
    <main>
      <BackLink href="/" label="Back to home" />
      <h1 className="mb-6 text-2xl font-bold">My reports</h1>

      {error && <p className="text-warn">{error}</p>}
      {!items && !error && <p className="text-slate-500">Loading…</p>}
      {items && items.length === 0 && (
        <p className="text-slate-500">You haven’t reported anything yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {items?.map((it) => (
          <li key={it.id}>
            <Link
              href={`/records/${it.id}`}
              className="block rounded-xl border border-slate-200 p-4 hover:border-accent"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-900">{it.id}</span>
                <StatusPill status={it.status} />
              </div>
              <p className="mb-1 text-sm text-slate-600">{it.oneLiner}</p>
              <p className="text-xs text-slate-400">
                {it.location} ·{" "}
                {new Date(it.createdAt).toLocaleDateString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <Link href="/report" className="text-accent underline">
          Report something new
        </Link>
      </div>
    </main>
  );
}
