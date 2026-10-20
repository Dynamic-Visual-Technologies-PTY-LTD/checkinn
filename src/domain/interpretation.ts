/**
 * Query interpretation, the pure step (AD-22). The Provider's output is
 * untrusted: `applyInterpretation` takes it as `unknown`, checks each field
 * against the codec's limits and ignores anything it cannot use. It never
 * throws.
 *
 * This first cut applies the Destination, an absolute Stay and the Party.
 * Relative dates, nicknames, the out-of-catalog place, ignored values, Max
 * price, Policy criteria and Rooms auto-raise come later.
 */
import { PARTY_LIMITS, validateStay } from "@/domain/criteria";
import type { IsoDate, Party, Stay } from "@/domain/types";

/** The relative Stays the Provider may name (FR-4). */
export const RELATIVE_STAYS = ["this-weekend", "next-weekend", "tonight"] as const;
export type RelativeStay = (typeof RELATIVE_STAYS)[number];

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

/** The Search bar criteria a Query interpretation reads and replaces. */
export type InterpretedCriteria = {
  q: string;
  stay: Stay | null;
  party: Party;
};

type RawFields = Record<string, unknown>;

function fields(raw: unknown): RawFields {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as RawFields) : {};
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function within(value: number, limits: { min: number; max: number }): boolean {
  return value >= limits.min && value <= limits.max;
}

/** An absolute Stay that passes the codec's rules, or null. */
function stayFrom(raw: RawFields, today: IsoDate): Stay | null {
  const checkIn = text(raw.checkIn);
  const checkOut = text(raw.checkOut);
  if (!checkIn || !checkOut) return null;
  const stay = { checkIn, checkOut };
  return validateStay(stay, today).length === 0 ? stay : null;
}

/**
 * The Query's Party, or null when it states neither adults nor children, or
 * states a value outside `PARTY_LIMITS`. A stated Party replaces the whole
 * Party: children default to 0, unstated adults stay as they are, and the
 * current Rooms are kept but never more than the adults.
 */
function partyFrom(raw: RawFields, current: Party): Party | null {
  const adults = integer(raw.adults);
  const children = integer(raw.children);
  if (adults === null && children === null) return null;
  const party = { adults: adults ?? current.adults, children: children ?? 0 };
  if (
    !within(party.adults, PARTY_LIMITS.adults) ||
    !within(party.children, PARTY_LIMITS.children)
  ) {
    return null;
  }
  return { ...party, rooms: Math.min(current.rooms, party.adults) };
}

/**
 * Applies a Provider interpretation to the current Search bar criteria
 * (AD-22):
 * - Destination is the interpreted `destination`, or empty: it starts empty
 *   for each new Query.
 * - A valid absolute Stay replaces the current one; otherwise the current
 *   Stay is kept.
 * - A stated, valid Party replaces the current one; otherwise the current
 *   Party, Rooms included, is kept.
 */
export function applyInterpretation(
  raw: unknown,
  current: InterpretedCriteria,
  today: IsoDate,
): InterpretedCriteria {
  const values = fields(raw);
  return {
    q: text(values.destination) ?? "",
    stay: stayFrom(values, today) ?? current.stay,
    party: partyFrom(values, current.party) ?? current.party,
  };
}
