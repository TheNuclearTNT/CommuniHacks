"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { IncidentListItem } from "@/lib/types";
import { getIncidents } from "@/lib/api-client";
import { BackLink } from "@/components/form/BackLink";
import { ClockChip, SeverityDot, StatusPill, TypeChip } from "@/components/ui";
import { getRoleLabel } from "@/lib/question-labels";

// /my-reports — my incidents with a status pill; tap opens the full record & pathway tracker.
export default function MyReportsPage() {
  const [items, setItems] = useState<IncidentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(() => {
    getIncidents({ scope: "mine" })
      .then((data) => {
        setError(null);
        setItems(data);
      })
      .catch(() => setError("Could not load your reports."));
  }, []);

  useEffect(() => {
    loadReports();
    const handleRoleChanged = () => loadReports();
    window.addEventListener("langs:role-changed", handleRoleChanged);
    return () => window.removeEventListener("langs:role-changed", handleRoleChanged);
  }, [loadReports]);

  return (
    <main>
      <BackLink href="/" label="Back to home" />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">
            Staff Reporter View
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My submitted reports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track live pathway stages, current review owners, and supervisor sign-off.
          </p>
        </div>
        <Link
          href="/report"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-2xs transition hover:bg-blue-800"
        >
          + Report new incident
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
        </div>
      )}

      {!items && !error && (
        <p className="text-sm text-slate-500">Loading your reports…</p>
      )}

      {items && items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-2xs">
          <p className="text-sm font-medium text-slate-700">
            No reports found for your current persona.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Submit a new report or switch to Maya Chen / Jordan Singh in the top Persona Switcher.
          </p>
          <Link
            href="/report"
            className="mt-4 inline-flex rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white"
          >
            Report an incident →
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {items?.map((it) => (
          <li key={it.id}>
            <Link
              href={`/records/${it.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-blue-300 hover:shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <SeverityDot severity={it.severity} />
                  <span className="font-mono text-base font-bold text-slate-900">
                    {it.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockChip dueAt={it.nextClockDueAt} />
                  <StatusPill status={it.status} />
                </div>
              </div>

              <p className="mt-2 text-sm font-medium text-slate-800">
                {it.oneLiner}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {it.types.map((t) => (
                  <TypeChip key={t} type={t} />
                ))}
                <span>·</span>
                <span className="font-medium text-slate-700">{it.location}</span>
                <span>·</span>
                <span>
                  {new Date(it.createdAt).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                {it.currentOwnerRoles.length > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      Current stage owner:{" "}
                      <strong className="font-medium text-slate-700">
                        {it.currentOwnerRoles.map(getRoleLabel).join(", ")}
                      </strong>
                    </span>
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
