/**
 * Cancellation deadline and wording (AD-9, FR-20, FR-24). Pure: callers pass
 * "now". The one place that knows the rule: free cancellation ends 48 hours
 * before check-in, at the Hotel's check-in time in Africa/Johannesburg.
 * Johannesburg is UTC+2 all year (no daylight saving), so the stored instant
 * needs no time zone database.
 */
import { addDays, shortDayLabel } from "@/domain/dates";
import type { CancellationPolicy, IsoDate } from "@/domain/types";

/** Free cancellation ends this many days before check-in (48 hours). */
const FREE_CANCELLATION_DAYS = 2;

/** Africa/Johannesburg's fixed offset from UTC. */
const JOHANNESBURG_OFFSET = "+02:00";

export const NON_REFUNDABLE_LINE = "Non-refundable. This booking can't be cancelled.";

/** The free-cancellation deadline: check-in minus 2 days, at the check-in time. */
export function cancellationDeadline(
  checkIn: IsoDate,
  checkInTime: string,
): { date: IsoDate; time: string } {
  return { date: addDays(checkIn, -FREE_CANCELLATION_DAYS), time: checkInTime };
}

/**
 * The deadline as an ISO UTC instant, as a Booking stores it (AD-9, AD-16):
 * check-in 2026-11-13 at 14:00 gives "2026-11-11T12:00:00.000Z".
 */
export function cancellationDeadlineInstant(checkIn: IsoDate, checkInTime: string): string {
  const { date, time } = cancellationDeadline(checkIn, checkInTime);
  return new Date(`${date}T${time}:00${JOHANNESBURG_OFFSET}`).toISOString();
}

/** True once `now` (an ISO instant) has reached the deadline. */
export function deadlinePassed(checkIn: IsoDate, checkInTime: string, now: string): boolean {
  return Date.parse(now) >= Date.parse(cancellationDeadlineInstant(checkIn, checkInTime));
}

/** "Wed 11 Nov 2026, 14:00" */
export function deadlineLabel(deadline: { date: IsoDate; time: string }): string {
  return `${shortDayLabel(deadline.date)} ${deadline.date.slice(0, 4)}, ${deadline.time}`;
}

/**
 * The summary's cancellation line. `free` shows a Mint badge "Free
 * cancellation" beside `until`; `ended` (the deadline has passed) and
 * `non-refundable` show `text` alone. `text` is the whole sentence either
 * way, for screen readers.
 */
export type CancellationLine =
  | { kind: "free"; until: string; text: string }
  | { kind: "ended"; text: string }
  | { kind: "non-refundable"; text: string };

/** `now` is an ISO instant read at request time. */
export function cancellationLine(
  policy: CancellationPolicy,
  checkIn: IsoDate,
  checkInTime: string,
  now: string,
): CancellationLine {
  if (policy === "non_refundable") {
    return { kind: "non-refundable", text: NON_REFUNDABLE_LINE };
  }
  const label = deadlineLabel(cancellationDeadline(checkIn, checkInTime));
  if (deadlinePassed(checkIn, checkInTime, now)) {
    return { kind: "ended", text: `Free cancellation ended on ${label}.` };
  }
  const until = `until ${label}`;
  return { kind: "free", until, text: `Free cancellation ${until}` };
}
