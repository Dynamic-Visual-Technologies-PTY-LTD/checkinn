/**
 * The Best-fit room (AD-26, FR-14): the one Room type a Smart search card is
 * priced from and the Hotel page pre-selects. Pure: the qualifying Room types
 * come from `qualifyingRoomTypes` (AD-23) and prices from `pricing.ts` (AD-9).
 */
import { stayTotalRand } from "@/domain/pricing";
import type { BestFitRoom } from "@/domain/types";

/** What the pick needs to know about a qualifying Room type. */
export type BestFitRoomType = {
  id: string;
  name: string;
  maxGuests: number;
  nightlyRand: number;
};

/**
 * Picks the Best-fit room among the qualifying Room types, given in seed
 * order. The highest Room-type meaning wins. Ties go to the lower Nightly
 * price, then seed order. A Room type missing from `meanings` counts as
 * meaning 0, so with no meanings (empty Preferences, or until Relevance
 * exists) the cheapest Room type wins.
 *
 * It never splits a Party: the result is one Room type × the Party's Rooms,
 * so `sleeps` is `maxGuests × rooms`. Null when nothing qualifies.
 */
export function bestFit(
  qualifying: readonly BestFitRoomType[],
  meanings: ReadonlyMap<string, number>,
  rooms: number,
  nights: number,
): BestFitRoom | null {
  let best: BestFitRoomType | null = null;
  let bestMeaning = 0;
  for (const type of qualifying) {
    const meaning = meanings.get(type.id) ?? 0;
    if (
      best === null ||
      meaning > bestMeaning ||
      (meaning === bestMeaning && type.nightlyRand < best.nightlyRand)
    ) {
      best = type;
      bestMeaning = meaning;
    }
  }
  if (best === null) return null;
  return {
    roomTypeId: best.id,
    name: best.name,
    rooms,
    sleeps: best.maxGuests * rooms,
    nightlyRand: best.nightlyRand,
    totalRand: stayTotalRand(best.nightlyRand, nights, rooms),
  };
}
