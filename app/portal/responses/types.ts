import type { IncidentType, Status } from "@/lib/types";

// Shape returned by GET /api/portal-responses.
export interface PortalResponseItem {
  id: string;
  status: Status;
  types: IncidentType[];
  severity: string;
  location: string;
  incidentDate: string | null;
  incidentTime: string | null;
  reporter: string;
  victim: string;
  summary: string;
  createdAt: string;
  // The supervisor-review clock: starts when the report is submitted (or
  // reopened) and always runs for 24 hours.
  reviewStartedAt: string;
  reviewDueAt: string;
  reviewSubmittedAt: string | null;
  reviewDone: boolean;
}

export const STATUS_LABEL: Record<Status, string> = {
  SUBMITTED: "Submitted",
  SUPERVISOR_REVIEW: "Supervisor review",
  SPECIALTY_REVIEW: "Specialty acknowledgement",
  WITH_EA: "With Executive Assistant",
  CLOSED: "Filed and closed",
  REOPENED: "Reopened",
};

const HOUR = 3600_000;

// "5h", or "less than 1h" in the first hour past the deadline.
function lateAmount(lateMs: number): string {
  const hours = Math.floor(lateMs / HOUR);
  return hours < 1 ? "less than 1h" : `${hours}h`;
}

// The 24h supervisor-review clock, as a short human label + urgency level.
export function reviewClock(item: PortalResponseItem): {
  text: string;
  level: "done" | "ok" | "soon" | "overdue";
} {
  const due = new Date(item.reviewDueAt).getTime();

  // Review handed in: say whether it made the 24 hours.
  if (item.reviewDone) {
    if (item.reviewSubmittedAt) {
      const lateMs = new Date(item.reviewSubmittedAt).getTime() - due;
      if (lateMs > 0) {
        return { text: `Reviewed late by ${lateAmount(lateMs)}`, level: "done" };
      }
    }
    return { text: "Reviewed on time", level: "done" };
  }

  // Still waiting on the supervisor.
  const diffMs = due - Date.now();
  if (diffMs < 0) {
    return { text: `Late by ${lateAmount(-diffMs)}`, level: "overdue" };
  }
  // Round up so a brand-new report reads "24h", never "0h" while on time.
  const left = Math.ceil(diffMs / HOUR);
  return {
    text: `Review due in ${left}h`,
    level: left <= 6 ? "soon" : "ok",
  };
}
