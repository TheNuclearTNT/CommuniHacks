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
  reviewDueAt: string;
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

// The 24h supervisor-review clock, as a short human label + urgency level.
export function reviewClock(item: PortalResponseItem): {
  text: string;
  level: "done" | "ok" | "soon" | "overdue";
} {
  if (item.reviewDone) {
    return { text: "Review done", level: "done" };
  }
  const due = new Date(item.reviewDueAt).getTime();
  const now = Date.now();
  const diffH = (due - now) / 3600_000;

  if (diffH < 0) {
    const late = Math.round(-diffH);
    return { text: `Review overdue by ${late}h`, level: "overdue" };
  }
  const left = Math.round(diffH);
  return {
    text: `Review due in ${left}h`,
    level: left <= 6 ? "soon" : "ok",
  };
}
