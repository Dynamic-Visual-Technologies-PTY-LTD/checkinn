/**
 * Cancellation deadline and wording (AD-9, FR-20, FR-24). Pure: callers pass
 * "now". The one place that knows the rule: free cancellation ends 48 hours
 * before check-in, at the Hotel's check-in time in Africa/Johannesburg.
 * Johannesburg is UTC+2 all year (no daylight saving), so the stored instant
 * needs no time zone database.
 */
import { addDays, shortDayLabel } from "@/domain/dates";
import type { CancellationLine, CancellationPolicy, IsoDate } from "@/domain/types";

export type { CancellationLine };

/** Free cancellation ends this many days before check-in (48 hours). */
const FREE_CANCELLATION_DAYS = 2;

/** Africa/Johannesburg's fixed offset from UTC. */
const JOHANNESBURG_OFFSET = "+02:00";
const JOHANNESBURG_OFFSET_MS = 2 * 60 * 60 * 1000;

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

/** The Johannesburg date and time of a stored deadline instant (AD-9). */
export function deadlineFromInstant(instant: string): { date: IsoDate; time: string } {
  const local = new Date(Date.parse(instant) + JOHANNESBURG_OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/**
 * The cancellation line from a Booking's snapshot (AD-16): its policy and its
 * stored deadline instant (null for Non-refundable). `now` is an ISO instant
 * read at request time.
 */
export function snapshotCancellationLine(
  policy: CancellationPolicy,
  deadline: string | null,
  now: string,
): CancellationLine {
  if (policy === "non_refundable" || deadline === null) {
    return { kind: "non-refundable", text: NON_REFUNDABLE_LINE };
  }
  const label = deadlineLabel(deadlineFromInstant(deadline));
  if (Date.parse(now) >= Date.parse(deadline)) {
    return { kind: "ended", text: `Free cancellation ended on ${label}.` };
  }
  const until = `until ${label}`;
  return { kind: "free", until, text: `Free cancellation ${until}` };
}

/**
 * The cancellation line for a Stay at a Hotel, before a Booking exists. It
 * derives the deadline as `createBooking` stores it, then words it like the
 * snapshot, so the summary and the confirmation always agree. `now` is an
 * ISO instant read at request time.
 */
export function cancellationLine(
  policy: CancellationPolicy,
  checkIn: IsoDate,
  checkInTime: string,
  now: string,
): CancellationLine {
  const deadline =
    policy === "non_refundable" ? null : cancellationDeadlineInstant(checkIn, checkInTime);
  return snapshotCancellationLine(policy, deadline, now);
}

/**
 * Whether a stored Booking can be cancelled at `now` (FR-24, AD-9, AD-16),
 * read from its snapshot only:
 *
 * - `cancelled`: already cancelled.
 * - `non-refundable`: the snapshot's policy is Non-refundable.
 * - `deadline-passed`: free cancellation, but `now` has reached the stored deadline.
 * - `open`: free cancellation before the deadline; the guest may cancel.
 */
export type CancelState = "open" | "deadline-passed" | "non-refundable" | "cancelled";

export function cancelState(
  booking: {
    status: "confirmed" | "cancelled";
    cancellationPolicy: CancellationPolicy;
    /** An ISO UTC instant; null for Non-refundable. */
    cancellationDeadline: string | null;
  },
  now: string,
): CancelState {
  if (booking.status === "cancelled") return "cancelled";
  if (booking.cancellationPolicy === "non_refundable" || booking.cancellationDeadline === null) {
    return "non-refundable";
  }
  return Date.parse(now) >= Date.parse(booking.cancellationDeadline) ? "deadline-passed" : "open";
}

/** Shown when cancel is asked of a Booking that is already cancelled. */
export const ALREADY_CANCELLED_MESSAGE = "This booking is already cancelled.";

/** "Wed 14 Oct 2026": the Johannesburg date a stored instant falls on (AD-9). */
export function instantDateLabel(instant: string): string {
  const { date } = deadlineFromInstant(instant);
  return `${shortDayLabel(date)} ${date.slice(0, 4)}`;
}
