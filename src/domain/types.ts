/**
 * Base domain types. Names follow the PRD Glossary.
 */

/** An ISO calendar date, `YYYY-MM-DD`, with no time and no time zone. */
export type IsoDate = string;

/** A check-in date and a check-out date. Nights = check-out minus check-in. */
export type Stay = {
  checkIn: IsoDate;
  checkOut: IsoDate;
};

/** The adults, children and Rooms a Guest asks for. Guests = adults + children. */
export type Party = {
  adults: number;
  children: number;
  rooms: number;
};

/** A City tile on Home: the City, its catalog Hotel count and its photo. */
export type CityTile = {
  id: string;
  name: string;
  hotelCount: number;
  image: {
    url: string;
    alt: string;
    /** The photo's source page, which holds the photographer credit. */
    sourceUrl: string;
  };
};

/** One Booking line asked for in the URL: a Room type and how many Rooms. */
export type RoomSelection = {
  roomTypeId: string;
  quantity: number;
};

/** A one-off message carried in the URL (AD-8). */
export type CriteriaNotice =
  | { type: "room-unavailable"; roomTypeIds: string[] }
  | { type: "cancelled" };

/**
 * Everything the URL holds about a search, a Hotel or a Booking in progress
 * (AD-8). Parse and serialize it only with `src/domain/criteria.ts`.
 */
export type SearchCriteria = {
  /** The Destination as typed, trimmed. Empty runs the default search. */
  q: string;
  /** `null` when no dates are set, or the URL's dates were rejected. */
  stay: Stay | null;
  party: Party;
  hotel: string | null;
  sel: RoomSelection[] | null;
  /** The idempotency key minted by `startBooking` (AD-10). */
  k: string | null;
  notice: CriteriaNotice | null;
};

/** Why parsing rejected part of the criteria. */
export type CriteriaProblem =
  | "stay-past"
  | "stay-too-long"
  | "stay-order"
  | "stay-malformed"
  | "party-invalid"
  | "sel-invalid";
