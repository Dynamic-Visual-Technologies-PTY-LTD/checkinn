/**
 * Availability counting (AD-4). Pure: the SQL that loads the Booking lines
 * lives in `src/features/hotels/availability.repo.ts`.
 *
 * A Booking covers Night n when check-in ≤ n < check-out. A Room type's
 * Availability for a Stay is its inventory minus the busiest Night of the
 * Stay. It is available when that count is at least 1.
 */
import { addDays, nightsBetween } from "@/domain/dates";
import type { IsoDate, Stay } from "@/domain/types";

/** A Confirmed Booking line for one Room type: its Stay and how many Rooms. */
export type BookedLine = Stay & { quantity: number };

/** The Nights of a Stay: check-in up to, not including, check-out. */
export function nightsOf(stay: Stay): IsoDate[] {
  const count = Math.max(nightsBetween(stay.checkIn, stay.checkOut), 0);
  return Array.from({ length: count }, (_, i) => addDays(stay.checkIn, i));
}

/** Whether a Booking line covers a Night. */
function covers(line: Stay, night: IsoDate): boolean {
  return line.checkIn <= night && night < line.checkOut;
}

/**
 * Rooms of one Room type free for every Night of the Stay: `totalRooms`
 * minus the most Rooms booked on any one Night. Never below 0. `lines` may
 * include lines outside the Stay; they count only on the Nights they cover.
 */
export function countAvailable(
  totalRooms: number,
  lines: readonly BookedLine[],
  stay: Stay,
): number {
  let busiest = 0;
  for (const night of nightsOf(stay)) {
    const booked = lines
      .filter((line) => covers(line, night))
      .reduce((sum, line) => sum + line.quantity, 0);
    busiest = Math.max(busiest, booked);
  }
  return Math.max(totalRooms - busiest, 0);
}

/** A Room type is available when at least 1 Room is free (AD-4). */
export function isAvailable(count: number): boolean {
  return count >= 1;
}
