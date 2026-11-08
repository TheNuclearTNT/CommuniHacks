import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type PortalResponseItem, reviewClock } from "./types";

const NOW = new Date("2026-11-08T12:00:00.000Z").getTime();
const H = 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();

// A report submitted `hoursAgo` hours before NOW. The clock is always 24h from
// submission, whatever the incident time on the form says.
function item(
  hoursAgo: number,
  review?: { hoursAfterSubmit: number },
): PortalResponseItem {
  const started = NOW - hoursAgo * H;
  return {
    id: "INC-TEST",
    status: review ? "SPECIALTY_REVIEW" : "SUPERVISOR_REVIEW",
    types: [],
    severity: "Less Serious",
    location: "Main Site",
    incidentDate: "2020-01-01", // far in the past: must NOT affect the clock
    incidentTime: "8:00AM",
    reporter: "Riley Chen",
    victim: "N/A",
    summary: "test",
    createdAt: iso(started),
    reviewStartedAt: iso(started),
    reviewDueAt: iso(started + 24 * H),
    reviewSubmittedAt: review ? iso(started + review.hoursAfterSubmit * H) : null,
    reviewDone: Boolean(review),
  };
}

describe("reviewClock — 24h from submission", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("a brand-new report has the full 24 hours", () => {
    expect(reviewClock(item(0))).toEqual({ text: "Review due in 24h", level: "ok" });
  });

  it("counts down from submission and warns in the last 6 hours", () => {
    expect(reviewClock(item(10))).toEqual({ text: "Review due in 14h", level: "ok" });
    expect(reviewClock(item(20))).toEqual({ text: "Review due in 4h", level: "soon" });
  });

  it("marks a pending review late, by how many hours", () => {
    expect(reviewClock(item(30))).toEqual({ text: "Late by 6h", level: "overdue" });
    expect(reviewClock(item(49))).toEqual({ text: "Late by 25h", level: "overdue" });
  });

  it("says 'less than 1h' in the first hour after the deadline", () => {
    expect(reviewClock(item(24.5))).toEqual({
      text: "Late by less than 1h",
      level: "overdue",
    });
  });

  it("a review handed in within 24h is on time", () => {
    expect(reviewClock(item(40, { hoursAfterSubmit: 24 }))).toEqual({
      text: "Reviewed on time",
      level: "done",
    });
  });

  it("a review handed in after 24h says how late it was", () => {
    expect(reviewClock(item(40, { hoursAfterSubmit: 27 }))).toEqual({
      text: "Reviewed late by 3h",
      level: "done",
    });
  });
});
