/**
 * The Best-fit room (AD-26, FR-14): the one Room type a Smart search card is
 * priced from and the Hotel page pre-selects. Pure: the qualifying Room types
 * come from `qualifyingRoomTypes` (AD-23) and prices from `pricing.ts` (AD-9).
 */
import { qualifyingRoomTypes, type HardCriteriaRoomType } from "@/domain/hard-criteria";
import { stayTotalRand } from "@/domain/pricing";
import type { BestFitRoom, Party, RoomSelection } from "@/domain/types";

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

/** What the Hotel page does with the URL's `bestFit` (AD-26, FR-14). */
export type HotelBestFit = {
  /** The Room type whose row carries the Best-fit chip, or null for no chip. */
  chipRoomTypeId: string | null;
  /** The selection to start from when the URL has no `sel` at all, or null. */
  preselect: RoomSelection[] | null;
};

const NO_BEST_FIT: HotelBestFit = { chipRoomTypeId: null, preselect: null };

/**
 * The Hotel page's Best-fit decision (AD-26), made on the server once
 * Availability is read, so reload, Back and a shared link agree. The URL's
 * `bestFit` counts only when a Provider is configured and the Room type still
 * qualifies for the page's Stay and Party: `qualifyingRoomTypes` without Max
 * price, which the Hotel page never enforces. Then its row carries the chip,
 * and, when the URL has no `sel` at all, it is pre-selected at the Party's
 * Rooms. With `sel` in the URL, valid or not, `sel` wins and `bestFit` only
 * places the chip. An unknown, sold-out or too-small Room type gives neither.
 */
export function hotelBestFit(
  bestFitId: string | null,
  rooms: readonly HardCriteriaRoomType[],
  availability: ReadonlyMap<string, number>,
  party: Party,
  /** The URL carries `sel`, even one the codec rejected (`sel-invalid`). */
  selInUrl: boolean,
  providerOn: boolean,
): HotelBestFit {
  if (!providerOn || !bestFitId) return NO_BEST_FIT;
  const qualifies = qualifyingRoomTypes(rooms, availability, party, null).some(
    (type) => type.id === bestFitId,
  );
  if (!qualifies) return NO_BEST_FIT;
  return {
    chipRoomTypeId: bestFitId,
    preselect: selInUrl ? null : [{ roomTypeId: bestFitId, quantity: party.rooms }],
  };
}
