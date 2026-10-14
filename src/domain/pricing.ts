/**
 * The only place money totals are computed (AD-9, FR-20). Amounts are integer
 * whole rand. Prices are fixed per Room type: no weekend, seasonal or levy
 * variation.
 */

/** Stay total = Nightly price × Nights × Rooms. */
export function stayTotalRand(
  nightlyRand: number,
  nights: number,
  rooms: number,
): number {
  return nightlyRand * nights * rooms;
}

/** Booking total = the sum of the lines' Stay totals. */
export function bookingTotalRand(lineTotalsRand: readonly number[]): number {
  return lineTotalsRand.reduce((sum, total) => sum + total, 0);
}

/**
 * A Listing card's "from" price (FR-6): the lowest Nightly price among the
 * available Room types, and its Stay total for the Party's Rooms. Null when
 * no Room type is available.
 */
export function fromPrice(
  availableNightlyRand: readonly number[],
  nights: number,
  rooms: number,
): { nightlyRand: number; totalRand: number } | null {
  if (availableNightlyRand.length === 0) return null;
  const nightlyRand = Math.min(...availableNightlyRand);
  return { nightlyRand, totalRand: stayTotalRand(nightlyRand, nights, rooms) };
}
