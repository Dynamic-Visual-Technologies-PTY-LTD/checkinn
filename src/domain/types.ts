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

/** The Policy criteria a Query can set (FR-4), in Criteria chip order. */
export const POLICY_CRITERIA = ["pets", "children", "smoking"] as const;
export type PolicyCriterion = (typeof POLICY_CRITERIA)[number];

/**
 * What an ignored value was (user decision, 2026-10-20): an unusable Stay
 * ("check your dates") or an unusable Party ("check who's staying").
 */
export const IGNORED_KINDS = ["dates", "party"] as const;
export type IgnoredKind = (typeof IGNORED_KINDS)[number];

/**
 * Smart search state in the URL (AD-21). `query` is the submitted Query, used
 * to refill the Smart search box; `interpreted` is true only after a
 * successful Query interpretation (`smart=1`). Empty values are `null` (or
 * `[]` for Policy criteria).
 */
export type SmartCriteria = {
  query: string;
  interpreted: boolean;
  /** The Preferences text (`prefs`), at most 300 characters. */
  preferences: string | null;
  /** Max price (`maxPrice`), positive whole rand. */
  maxPriceRand: number | null;
  /** Policy criteria (`policy`), in `POLICY_CRITERIA` order, each once. */
  policies: PolicyCriterion[];
  /** The out-of-catalog place (`place`) for its notice. */
  place: string | null;
  /** One phrase from the Query that could not be used (`ignored`), for its notice. */
  ignored: string | null;
  /** What `ignored` was (`ignoredKind`); `dates` when absent or invalid. */
  ignoredKind: IgnoredKind;
};

/**
 * A Smart search notice on Search results (AD-20), shown after the result
 * heading. `place` names the out-of-catalog place; `ignored` names the
 * Guest's phrase and what it was about.
 */
export type SmartNotice =
  | { kind: "place"; place: string }
  | { kind: "ignored"; text: string; about: IgnoredKind };

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
  /** Smart search state; non-null exactly when the URL holds a valid `sq` (AD-21). */
  smart: SmartCriteria | null;
  /**
   * The Best-fit Room type id (`bestFit`), for the Hotel page only (AD-21).
   * Only `hotelHref` writes it; checking it against the Hotel is the Hotel
   * page's job.
   */
  bestFit: string | null;
};

/** Why parsing rejected part of the criteria. */
export type CriteriaProblem =
  | "stay-past"
  | "stay-too-long"
  | "stay-order"
  | "stay-malformed"
  | "party-invalid"
  | "sel-invalid";

/**
 * A cancellation line for a Stay (AD-9). `free` shows a Mint "Free
 * cancellation" badge beside `until`; `ended` (the deadline has passed) and
 * `non-refundable` show `text` alone. `text` is always the whole sentence,
 * for screen readers.
 */
export type CancellationLine =
  | { kind: "free"; until: string; text: string }
  | { kind: "ended"; text: string }
  | { kind: "non-refundable"; text: string };

/**
 * The Cancellation policies, as the seed's `policies.cancellation.type`.
 * The one list the app, features and components import.
 */
export const CANCELLATION_POLICIES = [
  "free_until_48_hours_before_check_in",
  "non_refundable",
] as const;

/** A Hotel's Cancellation policy, as the seed's `policies.cancellation.type`. */
export type CancellationPolicy = (typeof CANCELLATION_POLICIES)[number];

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
  /**
   * The Hotel's cancellation policy for this Stay, as the Hotel page shows it:
   * open with its deadline, ended once the deadline has passed, or
   * Non-refundable.
   */
  cancellation: CancellationLine;
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
  /**
   * The Best-fit room (FR-14, AD-26), set on every `smart` card: its
   * `nightlyRand` and `totalRand` are the card's.
   */
  bestFit?: BestFitRoom;
  /** The Score breakdown (FR-20), present only under the debug flag (AD-29). */
  breakdown?: ScoreBreakdown;
};

/**
 * The Room type that best fits a Smart search (FR-14, AD-26): one Room type ×
 * the Party's Rooms, never split. `sleeps` is `maxGuests × rooms`.
 */
export type BestFitRoom = {
  roomTypeId: string;
  name: string;
  rooms: number;
  sleeps: number;
  nightlyRand: number;
  totalRand: number;
};

/**
 * Why a Hotel ranks where it does (FR-20): each Relevance part, each signal
 * and the Ranking blend score, all in 0–1.
 */
export type ScoreBreakdown = {
  meaning: number;
  exact: number;
  reviewSignal: number;
  priceSignal: number;
  score: number;
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
  /** Smart search notices, in priority order, at most 2; `[]` for an MVP search. */
  notices: SmartNotice[];
  /** How the search ran (AD-20); `mvp` is the MVP search, unchanged. */
  mode: SearchMode;
  /**
   * The no-results sentence naming the Hard criteria (FR-10), from
   * `hardCriteriaSummary`. Null when something was found or nothing is named.
   */
  criteriaSummary: string | null;
};

/**
 * How `searchHotels` ran a search (AD-20): `mvp`, the MVP search unchanged,
 * or `smart`, filtered by the Hard criteria (AD-23).
 */
export type SearchMode = "mvp" | "smart";

/** A City photo's credit on `/credits`: the source page holds the credit. */
export type CityPhotoCredit = {
  cityId: string;
  cityName: string;
  sourceUrl: string;
  /** The seed's instructions, e.g. "Use the photographer credit and licence…". */
  creditInstructions: string;
};

/** One Hotel's photo credits on `/credits`, photos in seed order. */
export type HotelPhotoCredit = {
  hotelId: string;
  hotelName: string;
  photos: {
    alt: string;
    provider: string;
    sourceUrl: string;
    licenseUrl: string;
  }[];
  /** The seed's illustrative-photos note, or null if no photo is illustrative. */
  note: string | null;
};

/** Every seed photo credit, Cities then Hotels, in seed order. */
export type PhotoCredits = {
  cities: CityPhotoCredit[];
  hotels: HotelPhotoCredit[];
};

/** One line of a Hotel's house rules (FR-14), e.g. Check-in "From 14:00". */
export type HouseRule = {
  term: string;
  value: string;
};

/**
 * Everything the Hotel page shows about one Hotel (FR-9, FR-10, FR-12–FR-14).
 * A plain serializable view model: every value is ready to show.
 */
export type HotelPage = {
  hotelId: string;
  name: string;
  /** luxury, business, family, boutique or budget. */
  category: string;
  /** 1 to 5. */
  starRating: number;
  area: string;
  cityName: string;
  province: string;
  description: string;
  /** Out of 5. */
  reviewScore: number;
  /** "Superb", "Very good", "Good", "Pleasant", or null below 3.0 (FR-12). */
  reviewLabel: string | null;
  reviewCount: number;
  /** Every Facility with a seed label, in seed order. `key` is the seed amenity key. */
  facilities: { key: string; label: string }[];
  /** The Hotel's photos in seed order, with the seed alt text. */
  photos: { url: string; alt: string }[];
  /** Check-in, Check-out, Children, Pets, Smoking and Cancellation, in that order. */
  houseRules: HouseRule[];
  /** The Hotel's Room types in seed order, for the room table (FR-17). */
  rooms: RoomOption[];
  cancellationPolicy: CancellationPolicy;
  /** The Hotel's check-in time, `HH:MM`, the base of the cancellation deadline (AD-9). */
  checkInTime: string;
};

/** One Room type as the room table shows it. Money is whole rand (AD-9). */
export type RoomOption = {
  id: string;
  name: string;
  maxGuests: number;
  /** "1 double bed, 2 single beds". */
  bedsLabel: string;
  /** Seed amenity labels, e.g. "Private bathroom", with their keys. */
  amenities: { key: string; label: string }[];
  nightlyRand: number;
};

/** One Booking line as a summary shows it: "1 × Standard Double  R 4 900,00". */
export type BookingLineView = {
  roomTypeId: string;
  name: string;
  quantity: number;
  /** Nightly price × Nights × quantity, whole rand (AD-9). */
  lineTotalRand: number;
};

/**
 * What Booking details (`/book`, FR-21) shows before the guest confirms:
 * priced from the catalog with the same code `createBooking` stores, so the
 * summary always equals the Booking. Lines are in the Hotel's Room type order.
 */
export type BookingQuote = {
  hotelId: string;
  hotelName: string;
  /** `HH:MM`, the base of the cancellation deadline and the arrival times. */
  checkInTime: string;
  cancellationPolicy: CancellationPolicy;
  stay: Stay;
  party: Party;
  lines: BookingLineView[];
  /** How many Rooms the lines add up to. */
  roomCount: number;
  totalRand: number;
};

/**
 * A Booking's status. `src/db/schema.ts` keeps its own copy, because the data
 * layer imports nothing from the domain (AD-1); `src/db/schema.test.ts` holds
 * the two equal.
 */
export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * A confirmed Booking as the confirmation shows it (FR-22). Read from the
 * Booking's snapshot only (AD-16): prices, the Stay, the Party and the
 * Cancellation policy are what the guest confirmed, never the catalog's
 * current values. Only the Hotel and Room type names come from the catalog.
 */
export type BookingView = {
  reference: string;
  hotelId: string;
  hotelName: string;
  status: BookingStatus;
  stay: Stay;
  party: Party;
  /** "Thandi Nkosi". */
  guestName: string;
  lines: BookingLineView[];
  roomCount: number;
  bookingTotalRand: number;
  cancellationPolicy: CancellationPolicy;
  /** An ISO UTC instant; null for Non-refundable. */
  cancellationDeadline: string | null;
  /** When it was cancelled, an ISO UTC instant; null while Confirmed. */
  cancelledAt: string | null;
};

/** Expected failures a server action returns instead of throwing (AD-11). */
export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "NOT_CANCELLABLE"
  | "DEADLINE_PASSED"
  | "ALREADY_CANCELLED"
  | "SERVER_ERROR";

/**
 * What a server action returns when it does not redirect (AD-11). Success
 * always ends in `redirect()`, so only the failure shape exists.
 */
export type ActionResult = {
  ok: false;
  code: ErrorCode;
  fieldErrors?: Record<string, string>;
  message: string;
};
