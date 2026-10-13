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

/** A Hotel's Cancellation policy, as the seed's `policies.cancellation.type`. */
export type CancellationPolicy =
  | "free_until_48_hours_before_check_in"
  | "non_refundable";

/**
 * One Hotel's entry in Search results (FR-6). A plain serializable view
 * model: every value is ready to show except money, which stays integer rand
 * and is displayed only through `formatZar` (AD-9).
 *
 * Part of the search seam (AD-7): a replacement `searchHotels` returns cards
 * of exactly this shape, so no page or component has to change.
 */
export type ListingCard = {
  hotelId: string;
  name: string;
  /** luxury, business, family, boutique or budget. */
  category: string;
  /** 1 to 5. */
  starRating: number;
  area: string;
  cityName: string;
  /** Out of 5. */
  reviewScore: number;
  /** "Superb", "Very good", "Good", "Pleasant", or null below 3.0 (FR-12). */
  reviewLabel: string | null;
  reviewCount: number;
  /** Up to 3 Facility labels from the seed, Wi-Fi left out. */
  facilities: string[];
  cancellation: {
    policy: CancellationPolicy;
    /** "Free cancellation" or "Non-refundable". */
    label: string;
  };
  /** The Hotel's first photo, or null if it has none. */
  firstImage: { url: string; alt: string } | null;
  /** Nights of the searched Stay. */
  nights: number;
  /** Adults in the searched Party. */
  adults: number;
  /** Lowest available Nightly price × Nights × the Party's Rooms (FR-6). */
  totalRand: number;
  /** The lowest Nightly price among the available Room types. */
  nightlyRand: number;
};

/**
 * What `searchHotels` returns (AD-7). `heading` is the FR-7 count line, or
 * null when nothing was found or no search ran. `cards` are in display order.
 *
 * Part of the search seam: a replacement keeps this shape.
 */
export type SearchResult = {
  heading: string | null;
  cards: ListingCard[];
};
