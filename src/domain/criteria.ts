/**
 * The criteria codec (AD-8): the only code that turns URL parameters into
 * `SearchCriteria` and back. Parsing never throws. It returns the criteria
 * with `stay: Stay | null` and a list of problems.
 *
 * Nothing here reads the clock: callers pass `today` (AD-9).
 */
import { addDays, MAX_NIGHTS, nightsBetween } from "@/domain/dates";
import type {
  CriteriaNotice,
  CriteriaProblem,
  IsoDate,
  Party,
  RoomSelection,
  SearchCriteria,
  Stay,
} from "@/domain/types";

/** Party limits (EXPERIENCE.md Occupancy picker). Rooms never exceed adults. */
export const PARTY_LIMITS = {
  adults: { min: 1, max: 10 },
  children: { min: 0, max: 6 },
  rooms: { min: 1, max: 5 },
} as const satisfies Record<keyof Party, { min: number; max: number }>;

export const DEFAULT_PARTY: Party = { adults: 2, children: 0, rooms: 1 };

/** Shown when a link's dates or Party were rejected (EXPERIENCE.md stale link). */
export const STALE_LINK_MESSAGE = "Those dates have passed. Pick new ones.";

/** Guest-facing messages, in one place (EXPERIENCE.md L120-121). */
const PROBLEM_MESSAGES: Record<Exclude<CriteriaProblem, "sel-invalid">, string> = {
  "stay-order": "Check-out must be after check-in.",
  "stay-past": "Check-in can't be in the past.",
  "stay-too-long": `Stays can be up to ${MAX_NIGHTS} nights.`,
  "stay-malformed": STALE_LINK_MESSAGE,
  "party-invalid": STALE_LINK_MESSAGE,
};

/** The message for a problem. A bad `sel` is never shown: `/book` redirects. */
export function problemMessage(problem: Exclude<CriteriaProblem, "sel-invalid">): string {
  return PROBLEM_MESSAGES[problem];
}

/** URL parameters as `URLSearchParams` or a Next.js `searchParams` object. */
export type CriteriaParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

type ParseOptions = {
  /**
   * Absent dates become tomorrow for 1 night (Home and `/search`). Turn it
   * off on the Hotel page, where absent dates stay `null` (FR-16).
   */
  defaultStay?: boolean;
};

/** The problems a Stay alone can have. */
export type StayProblem = Extract<CriteriaProblem, `stay-${string}`>;

export type ParsedCriteria = {
  criteria: SearchCriteria;
  problems: CriteriaProblem[];
};

function read(params: CriteriaParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** A non-empty, trimmed value, or `undefined`. */
function readText(params: CriteriaParams, key: string): string | undefined {
  const value = read(params, key)?.trim();
  return value ? value : undefined;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in `YYYY-MM-DD` form (not 2026-13-01 or 2026-02-30). */
export function isIsoDate(value: string): boolean {
  return ISO_DATE.test(value) && addDays(value, 0) === value;
}

/** Tomorrow to the day after: 1 night (EXPERIENCE.md Search bar). */
export function defaultStay(today: IsoDate): Stay {
  const checkIn = addDays(today, 1);
  return { checkIn, checkOut: addDays(checkIn, 1) };
}

/** Home's criteria: empty Destination, the default Stay and Party. */
export function defaultCriteria(today: IsoDate): SearchCriteria {
  return {
    q: "",
    stay: defaultStay(today),
    party: { ...DEFAULT_PARTY },
    hotel: null,
    sel: null,
    k: null,
    notice: null,
  };
}

/**
 * The problems with a Stay, in the order the guest should fix them. Empty when
 * the Stay is valid.
 */
export function validateStay(stay: Stay | null, today: IsoDate): StayProblem[] {
  if (!stay || !isIsoDate(stay.checkIn) || !isIsoDate(stay.checkOut)) {
    return ["stay-malformed"];
  }
  const problems: StayProblem[] = [];
  if (stay.checkIn < today) problems.push("stay-past");
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  if (nights < 1) problems.push("stay-order");
  else if (nights > MAX_NIGHTS) problems.push("stay-too-long");
  return problems;
}

/** A strict non-negative integer: digits only. */
function readInteger(params: CriteriaParams, key: string): number | undefined | null {
  const value = readText(params, key);
  if (value === undefined) return undefined;
  return /^\d+$/.test(value) ? Number(value) : null;
}

function parseParty(params: CriteriaParams): { party: Party; valid: boolean } {
  let valid = true;
  const field = (key: keyof Party, max: number): number => {
    const value = readInteger(params, key);
    if (value === undefined) return DEFAULT_PARTY[key];
    if (value === null || value < PARTY_LIMITS[key].min || value > max) {
      valid = false;
      return DEFAULT_PARTY[key];
    }
    return value;
  };

  const adults = field("adults", PARTY_LIMITS.adults.max);
  const children = field("children", PARTY_LIMITS.children.max);
  const rooms = field("rooms", Math.min(PARTY_LIMITS.rooms.max, adults));
  return { party: { adults, children, rooms }, valid };
}

const QUANTITY = /^[1-9]\d*$/;

/**
 * `roomTypeId:qty,…`. Every quantity must be a positive integer and every
 * Room type listed once. Whether the Room types belong to `hotel` is checked
 * against the catalog by the caller (AD-8).
 */
export function parseSelection(value: string): RoomSelection[] | null {
  const lines: RoomSelection[] = [];
  for (const entry of value.split(",")) {
    const parts = entry.split(":");
    if (parts.length !== 2) return null;
    const [roomTypeId, quantity] = parts.map((part) => part.trim());
    if (!roomTypeId || !QUANTITY.test(quantity)) return null;
    if (lines.some((line) => line.roomTypeId === roomTypeId)) return null;
    lines.push({ roomTypeId, quantity: Number(quantity) });
  }
  return lines;
}

function serializeSelection(sel: RoomSelection[]): string {
  return sel.map((line) => `${line.roomTypeId}:${line.quantity}`).join(",");
}

function parseNotice(params: CriteriaParams): CriteriaNotice | null {
  const notice = readText(params, "notice");
  if (notice === "cancelled") return { type: "cancelled" };
  if (notice === "room-unavailable") {
    const roomTypeIds = (readText(params, "rt") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return { type: "room-unavailable", roomTypeIds };
  }
  return null;
}

/** Turns URL parameters into criteria. Never throws. */
export function parseCriteria(
  params: CriteriaParams,
  today: IsoDate,
  { defaultStay: useDefault = true }: ParseOptions = {},
): ParsedCriteria {
  const problems: CriteriaProblem[] = [];

  const { party, valid: partyValid } = parseParty(params);
  if (!partyValid) problems.push("party-invalid");

  const checkIn = readText(params, "checkIn");
  const checkOut = readText(params, "checkOut");
  let stay: Stay | null = null;
  if (checkIn === undefined && checkOut === undefined) {
    stay = useDefault ? defaultStay(today) : null;
  } else {
    const candidate = { checkIn: checkIn ?? "", checkOut: checkOut ?? "" };
    const stayProblems = validateStay(candidate, today);
    if (stayProblems.length > 0) problems.push(...stayProblems);
    else stay = candidate;
  }
  // An invalid Party clears the Stay too, so no search runs on it (AD-8).
  if (!partyValid) stay = null;

  const selValue = readText(params, "sel");
  let sel: RoomSelection[] | null = null;
  if (selValue !== undefined) {
    sel = parseSelection(selValue);
    if (!sel) problems.push("sel-invalid");
  }

  return {
    criteria: {
      q: readText(params, "q") ?? "",
      stay,
      party,
      hotel: readText(params, "hotel") ?? null,
      sel,
      k: readText(params, "k") ?? null,
      notice: parseNotice(params),
    },
    problems,
  };
}

/**
 * Turns criteria into a query string, without the leading `?`. The order is
 * fixed and empty optional values are left out. The Party is always written,
 * so a shared link never shifts with "today".
 */
export function serializeCriteria(criteria: Partial<SearchCriteria>): string {
  const params = new URLSearchParams();
  const q = criteria.q?.trim();
  if (q) params.set("q", q);
  if (criteria.stay) {
    params.set("checkIn", criteria.stay.checkIn);
    params.set("checkOut", criteria.stay.checkOut);
  }
  const party = criteria.party ?? DEFAULT_PARTY;
  params.set("adults", String(party.adults));
  params.set("children", String(party.children));
  params.set("rooms", String(party.rooms));
  if (criteria.hotel) params.set("hotel", criteria.hotel);
  if (criteria.sel && criteria.sel.length > 0) {
    params.set("sel", serializeSelection(criteria.sel));
  }
  if (criteria.k) params.set("k", criteria.k);
  if (criteria.notice) {
    params.set("notice", criteria.notice.type);
    if (criteria.notice.type === "room-unavailable" && criteria.notice.roomTypeIds.length > 0) {
      params.set("rt", criteria.notice.roomTypeIds.join(","));
    }
  }
  return params.toString();
}

/** The Search results URL for criteria. */
export function searchHref(criteria: Partial<SearchCriteria>): string {
  return `/search?${serializeCriteria(criteria)}`;
}

/** A Hotel page URL that keeps the search criteria (FR-6). */
export function hotelHref(hotelId: string, criteria: Partial<SearchCriteria>): string {
  return `/hotels/${encodeURIComponent(hotelId)}?${serializeCriteria(criteria)}`;
}
