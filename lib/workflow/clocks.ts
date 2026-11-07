import { addBusinessDays, addDays, addHours } from 'date-fns';
import type { ClockKind, SupervisorReviewInput } from '@/lib/types';

export interface ClockSpec {
  kind: ClockKind;
  startedAt: string;
  dueAt: string;
}

/**
 * Adds business days (skipping Saturday and Sunday; statutory holidays not excluded — TO CONFIRM).
 */
export function addOntarioBusinessDays(start: Date | string, businessDays: number): Date {
  const startDate = typeof start === 'string' ? new Date(start) : new Date(start.getTime());
  return addBusinessDays(startDate, businessDays);
}

/**
 * Computes compliance clocks (A3.7) triggered when a Supervisor Review is submitted.
 * Label in UI: "Prototype guidance — Langs to confirm".
 */
export function buildComplianceClocks(
  review: Pick<
    SupervisorReviewInput,
    'confirmedTypes' | 'healthCareBeyondFirstAid' | 'lostTime' | 'criticalInjury'
  >,
  startedAtInput: Date | string = new Date(),
): ClockSpec[] {
  const startedDate =
    typeof startedAtInput === 'string'
      ? new Date(startedAtInput)
      : new Date(startedAtInput.getTime());
  const startedAt = startedDate.toISOString();
  const isStaffInjury = review.confirmedTypes.includes('STAFF_INJURY');

  const clocks: ClockSpec[] = [];

  // 1. WSIB_FORM7: if STAFF_INJURY and (health care beyond first aid OR lost time). Due 3 business days.
  if (isStaffInjury && (review.healthCareBeyondFirstAid || review.lostTime)) {
    clocks.push({
      kind: 'WSIB_FORM7',
      startedAt,
      dueAt: addOntarioBusinessDays(startedDate, 3).toISOString(),
    });
  }

  // 2. MOL_CRITICAL_NOTICE: if critical injury. Due immediately (same timestamp).
  if (review.criticalInjury) {
    clocks.push({
      kind: 'MOL_CRITICAL_NOTICE',
      startedAt,
      dueAt: startedAt,
    });
  }

  // 3. CRITICAL_WRITTEN_48H: if critical injury. Due in 48 hours.
  if (review.criticalInjury) {
    clocks.push({
      kind: 'CRITICAL_WRITTEN_48H',
      startedAt,
      dueAt: addHours(startedDate, 48).toISOString(),
    });
  }

  // 4. JHSC_4DAY: if STAFF_INJURY and health care beyond first aid and not critical. Due in 4 calendar days.
  if (isStaffInjury && review.healthCareBeyondFirstAid && !review.criticalInjury) {
    clocks.push({
      kind: 'JHSC_4DAY',
      startedAt,
      dueAt: addDays(startedDate, 4).toISOString(),
    });
  }

  return clocks;
}

