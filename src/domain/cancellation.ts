/**
 * Cancellation deadline and wording (AD-9, FR-20). Pure: no clock and no time
 * zone maths. Every Hotel shares the seed's one zone, so the deadline is a
 * calendar date and a `HH:MM` time.
 */
import { addDays, shortDayLabel } from "@/domain/dates";
import type { CancellationPolicy, IsoDate } from "@/domain/types";

/** Free cancellation ends this many days before check-in (48 hours). */
const FREE_CANCELLATION_DAYS = 2;

export const NON_REFUNDABLE_LINE = "Non-refundable. This booking can't be cancelled.";

/** The free-cancellation deadline: check-in minus 2 days, at the check-in time. */
export function cancellationDeadline(
  checkIn: IsoDate,
  checkInTime: string,
): { date: IsoDate; time: string } {
  return { date: addDays(checkIn, -FREE_CANCELLATION_DAYS), time: checkInTime };
}

/** "Wed 11 Nov 2026, 14:00" */
export function deadlineLabel(deadline: { date: IsoDate; time: string }): string {
  return `${shortDayLabel(deadline.date)} ${deadline.date.slice(0, 4)}, ${deadline.time}`;
}

/**
 * The summary's cancellation line. `free` shows a Mint badge "Free
 * cancellation" beside `until`; `non-refundable` shows `text` with a warning
 * icon. `text` is the whole sentence either way, for screen readers.
 */
export type CancellationLine =
  | { kind: "free"; until: string; text: string }
  | { kind: "non-refundable"; text: string };

export function cancellationLine(
  policy: CancellationPolicy,
  checkIn: IsoDate,
  checkInTime: string,
): CancellationLine {
  if (policy === "non_refundable") {
    return { kind: "non-refundable", text: NON_REFUNDABLE_LINE };
  }
  const until = `until ${deadlineLabel(cancellationDeadline(checkIn, checkInTime))}`;
  return { kind: "free", until, text: `Free cancellation ${until}` };
}
