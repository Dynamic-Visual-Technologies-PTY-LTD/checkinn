/**
 * Query interpretation, the pure step (AD-22). The Provider's output is
 * untrusted: `applyInterpretation` takes it as `unknown`, checks each field
 * against the codec's limits and ignores anything it cannot use. It never
 * throws.
 */
import {
  isMaxPrice,
  isNoticeText,
  MAX_PREFERENCES_LENGTH,
  PARTY_LIMITS,
  validateStay,
} from "@/domain/criteria";
import { RELATIVE_STAYS, relativeStay, type RelativeStay } from "@/domain/dates";
import { cityFromNickname } from "@/domain/nicknames";
import { fewestRooms } from "@/domain/rooms";
import { matches, type SearchableHotel } from "@/domain/search";
import type {
  IgnoredKind,
  IsoDate,
  Party,
  PolicyCriterion,
  SmartCriteria,
  SmartNotice,
  Stay,
} from "@/domain/types";

export { RELATIVE_STAYS, type RelativeStay };

/**
 * Every field of the Provider's strict JSON schema (AD-22). A `…Phrase`
 * field is the Guest's own words for that value, used only to name an
 * ignored value.
 */
export type Interpretation = {
  destination: string | null;
  outOfCatalogPlace: string | null;
  relativeStay: RelativeStay | null;
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
  stayPhrase: string | null;
  adults: number | null;
  children: number | null;
  rooms: number | null;
  partyPhrase: string | null;
  maxPrice: number | null;
  petsAllowed: boolean | null;
  childrenAllowed: boolean | null;
  smokingAllowed: boolean | null;
  preferences: string | null;
};

/** The Search bar criteria a Query interpretation starts from and replaces. */
export type SearchBarCriteria = {
  q: string;
  stay: Stay | null;
  party: Party;
};

/** A catalog Hotel as interpretation sees it: its Destination text and Room type sizes. */
export type InterpretationHotel = SearchableHotel & {
  roomTypes: readonly { maxGuests: number }[];
};

/** What a Query interpretation gives: the Search bar criteria and the Smart search values. */
export type InterpretedCriteria = SearchBarCriteria &
  Pick<
    SmartCriteria,
    "preferences" | "maxPriceRand" | "policies" | "place" | "ignored" | "ignoredKind"
  >;

/** At most this many notices show, in priority order (EXPERIENCE.md Notices). */
export const MAX_NOTICES = 2;

type RawFields = Record<string, unknown>;

function fields(raw: unknown): RawFields {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as RawFields) : {};
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function stated(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function within(value: number, limits: { min: number; max: number }): boolean {
  return value >= limits.min && value <= limits.max;
}

/** A value the Query stated: usable, unusable, or not stated at all. */
type Outcome<T> = { kind: "none" } | { kind: "valid"; value: T } | { kind: "invalid" };

function isRelativeStay(value: unknown): value is RelativeStay {
  return (RELATIVE_STAYS as readonly unknown[]).includes(value);
}

/**
 * The Query's Stay. A relative Stay resolves with the FR-4 rules and wins
 * over the model's dates; otherwise absolute dates must pass the codec's
 * rules. A Stay that is stated but unusable is `invalid`.
 */
function stayFrom(raw: RawFields, today: IsoDate): Outcome<Stay> {
  if (isRelativeStay(raw.relativeStay)) {
    return { kind: "valid", value: relativeStay(raw.relativeStay, today) };
  }
  if (!stated(raw.relativeStay) && !stated(raw.checkIn) && !stated(raw.checkOut)) {
    return { kind: "none" };
  }
  const checkIn = text(raw.checkIn);
  const checkOut = text(raw.checkOut);
  if (!checkIn || !checkOut) return { kind: "invalid" };
  const stay = { checkIn, checkOut };
  return validateStay(stay, today).length === 0 ? { kind: "valid", value: stay } : { kind: "invalid" };
}

/**
 * The Query's adults and children. A stated Party replaces the whole Party:
 * children default to 0 and unstated adults stay as they are. A value of
 * the wrong type or outside `PARTY_LIMITS` makes it `invalid`.
 */
function partyFrom(raw: RawFields, current: Party): Outcome<Omit<Party, "rooms">> {
  if (!stated(raw.adults) && !stated(raw.children)) return { kind: "none" };
  const adults = stated(raw.adults) ? integer(raw.adults) : current.adults;
  const children = stated(raw.children) ? integer(raw.children) : 0;
  if (
    adults === null ||
    children === null ||
    !within(adults, PARTY_LIMITS.adults) ||
    !within(children, PARTY_LIMITS.children)
  ) {
    return { kind: "invalid" };
  }
  return { kind: "valid", value: { adults, children } };
}

/** The Query's Rooms, when stated as a whole number of at least 1. */
function statedRooms(raw: RawFields): number | null {
  const rooms = integer(raw.rooms);
  return rooms !== null && rooms >= PARTY_LIMITS.rooms.min ? rooms : null;
}

/**
 * The Destination and the out-of-catalog place. Nicknames map to their City
 * first, then the Destination must match the catalog with the MVP `matches`.
 * A Destination that matches nothing, or the model's `outOfCatalogPlace`,
 * becomes the place, as long as the place is plain notice text.
 */
function destinationFrom(
  raw: RawFields,
  hotels: readonly InterpretationHotel[],
): { q: string; place: string | null } {
  const inCatalog = (name: string) => hotels.some((hotel) => matches(name, hotel));
  const destination = text(raw.destination);
  if (destination) {
    const name = cityFromNickname(destination);
    if (inCatalog(name)) return { q: name, place: null };
  }
  const outside = text(raw.outOfCatalogPlace);
  const place = [destination, outside].find(
    (candidate): candidate is string =>
      candidate !== null && !inCatalog(candidate) && isNoticeText(candidate),
  );
  return { q: "", place: place ?? null };
}

/** The Preferences, plus an unknown place's words, trimmed to 300 characters. */
function preferencesFrom(raw: RawFields, place: string | null): string | null {
  const joined = [text(raw.preferences), place].filter(Boolean).join(" ");
  const preferences = joined.slice(0, MAX_PREFERENCES_LENGTH).trim();
  return preferences ? preferences : null;
}

function policiesFrom(raw: RawFields): PolicyCriterion[] {
  const policies: PolicyCriterion[] = [];
  if (raw.petsAllowed === true) policies.push("pets");
  if (raw.childrenAllowed === true) policies.push("children");
  if (raw.smokingAllowed === true) policies.push("smoking");
  return policies;
}

/** A Guest phrase that can name an ignored value in its notice, or null. */
function phrase(value: unknown): string | null {
  const words = text(value);
  return words && isNoticeText(words) ? words : null;
}

/**
 * Applies a Provider interpretation to the current Search bar criteria
 * (AD-22, FR-4):
 * - Destination, Max price and Policy criteria start empty for each Query.
 *   Nicknames map to their City; a place the catalog does not have leaves
 *   Destination empty, fills `place` and adds its words to the Preferences.
 * - A relative Stay beats the model's dates. A Stay that is not stated keeps
 *   the current Stay; one that is unusable keeps it too and is `ignored`.
 * - A stated, usable Party replaces the current one; an unusable one keeps
 *   it and is `ignored` (when the Stay was not). A Party not stated keeps
 *   the current Party, Rooms included.
 * - Rooms are the Query's when stated, capped by adults and the codec
 *   limit. Otherwise, only when the Party came from the Query, they are
 *   `fewestRooms` over the Room types of Hotels matching the Destination
 *   (AD-26).
 */
export function applyInterpretation(
  raw: unknown,
  current: SearchBarCriteria,
  catalog: { hotels: readonly InterpretationHotel[] },
  today: IsoDate,
): InterpretedCriteria {
  const values = fields(raw);
  const { q, place } = destinationFrom(values, catalog.hotels);
  const stay = stayFrom(values, today);
  const queryParty = partyFrom(values, current.party);
  const rooms = statedRooms(values);

  let party: Party;
  if (queryParty.kind === "valid") {
    const { adults, children } = queryParty.value;
    const base = { adults, children, rooms: Math.min(current.party.rooms, adults) };
    const roomTypes = catalog.hotels
      .filter((hotel) => matches(q, hotel))
      .flatMap((hotel) => hotel.roomTypes);
    party = { ...base, rooms: rooms ?? fewestRooms(base, roomTypes) };
  } else {
    party = { ...current.party, rooms: rooms ?? current.party.rooms };
  }
  party.rooms = Math.min(party.rooms, party.adults, PARTY_LIMITS.rooms.max);

  // Only one unusable value is named: the Stay before the Party. A value
  // with no usable phrase cannot be named, so the next one is.
  const stayPhrase = stay.kind === "invalid" ? phrase(values.stayPhrase) : null;
  const partyPhrase = queryParty.kind === "invalid" ? phrase(values.partyPhrase) : null;
  const ignored: { phrase: string; kind: IgnoredKind } | null = stayPhrase
    ? { phrase: stayPhrase, kind: "dates" }
    : partyPhrase
      ? { phrase: partyPhrase, kind: "party" }
      : null;

  return {
    q,
    stay: stay.kind === "valid" ? stay.value : current.stay,
    party,
    preferences: preferencesFrom(values, place),
    maxPriceRand: isMaxPrice(values.maxPrice) ? values.maxPrice : null,
    policies: policiesFrom(values),
    place,
    ignored: ignored?.phrase ?? null,
    ignoredKind: ignored?.kind ?? "dates",
  };
}

/**
 * The notices for Smart search criteria (AD-20, EXPERIENCE.md Notices): the
 * unknown place, then the ignored value, at most 2. None without `smart`.
 * The place notice says all cities are shown, so it needs an empty
 * Destination `q`.
 */
export function smartNotices(smart: SmartCriteria | null, q: string): SmartNotice[] {
  if (!smart) return [];
  const notices: SmartNotice[] = [];
  if (smart.place && !q.trim()) notices.push({ kind: "place", place: smart.place });
  if (smart.ignored) notices.push({ kind: "ignored", text: smart.ignored, about: smart.ignoredKind });
  return notices.slice(0, MAX_NOTICES);
}
