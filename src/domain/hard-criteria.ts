/**
 * The Hard-criteria check (AD-23, FR-6, FR-10): which Room types and Hotels
 * meet a Party, a Max price and Policy criteria, the Criteria chip copy, and
 * the no-results sentence that names the Hard criteria. Pure: Availability
 * comes from `availabilityFor` (AD-4) through the search repo.
 */
import { formatZar } from "@/lib/format";
import {
  POLICY_CRITERIA,
  type Party,
  type PolicyCriterion,
  type SearchMode,
  type SmartCriteria,
} from "@/domain/types";

/** What the check needs to know about a Room type. */
export type HardCriteriaRoomType = {
  id: string;
  /** Shown on the Best-fit room line (FR-14). */
  name: string;
  maxGuests: number;
  nightlyRand: number;
};

/** A Hotel's seed policies, as the Policy criteria are checked against them. */
export type HotelPolicies = {
  petsAllowed: boolean;
  childrenAllowed: boolean;
  smokingAllowed: boolean;
};

/** A Criteria chip's key (EXPERIENCE.md Criteria chip), in chip order. */
export type CriterionKey = "maxPrice" | PolicyCriterion;

/**
 * The Room types that meet the Hard criteria (AD-23), in the given order. A
 * Room type qualifies when its Availability count is at least the Party's
 * Rooms, its `maxGuests × rooms` holds every guest, and, with a Max price,
 * its Nightly price is at most that price. A Party is never split across Room
 * types.
 */
export function qualifyingRoomTypes<T extends HardCriteriaRoomType>(
  roomTypes: readonly T[],
  availability: ReadonlyMap<string, number>,
  party: Party,
  maxPriceRand: number | null,
): T[] {
  const guests = party.adults + party.children;
  return roomTypes.filter(
    (type) =>
      (availability.get(type.id) ?? 0) >= party.rooms &&
      type.maxGuests * party.rooms >= guests &&
      (maxPriceRand === null || type.nightlyRand <= maxPriceRand),
  );
}

const POLICY_FLAGS: Record<PolicyCriterion, keyof HotelPolicies> = {
  pets: "petsAllowed",
  children: "childrenAllowed",
  smoking: "smokingAllowed",
};

/**
 * Whether a Hotel meets the Hard criteria (AD-23): at least one qualifying
 * Room type, and every Policy criterion allowed by its seed policies.
 */
export function hotelQualifies(
  hotel: { policies: HotelPolicies },
  qualifying: readonly unknown[],
  policies: readonly PolicyCriterion[],
): boolean {
  return (
    qualifying.length > 0 && policies.every((policy) => hotel.policies[POLICY_FLAGS[policy]])
  );
}

/**
 * How a search runs (AD-20): `mvp` with no Provider, no Smart search criteria
 * or a Query that was not interpreted; otherwise `smart`. `runSmartSearch`
 * decides the mode with this, and the page shows the Criteria chips only
 * outside `mvp`.
 */
export function searchMode(hasProvider: boolean, smart: SmartCriteria | null): SearchMode {
  if (!hasProvider || !smart || !smart.interpreted) return "mvp";
  return "smart";
}

const POLICY_LABELS: Record<PolicyCriterion, string> = {
  pets: "Pets allowed",
  children: "Children allowed",
  smoking: "Smoking allowed",
};

/**
 * A Criteria chip's copy (EXPERIENCE.md Voice and Tone): "Max R 2 000 per
 * night", with non-breaking spaces only inside the amount, or "Pets allowed".
 */
export function criterionLabel(key: CriterionKey, maxPriceRand: number | null = null): string {
  if (key === "maxPrice") return `Max ${formatZar(maxPriceRand ?? 0)} per night`;
  return POLICY_LABELS[key];
}

/**
 * The Criteria chips for Smart search criteria, in chip order: Max price,
 * then pets, children and smoking.
 */
export function criteriaChips(
  smart: SmartCriteria | null,
): { key: CriterionKey; label: string }[] {
  if (!smart) return [];
  const chips: { key: CriterionKey; label: string }[] = [];
  if (smart.maxPriceRand !== null) {
    chips.push({ key: "maxPrice", label: criterionLabel("maxPrice", smart.maxPriceRand) });
  }
  for (const policy of POLICY_CRITERIA) {
    if (smart.policies.includes(policy)) chips.push({ key: policy, label: criterionLabel(policy) });
  }
  return chips;
}

/** "a", "a and b", "a, b and c". */
function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * The no-results sentence that names the Hard criteria (FR-10, EXPERIENCE.md
 * No results): "We looked for Pets allowed and Max R 2 000 per night in
 * Stellenbosch. Remove a filter, or try other dates or another city." Policy
 * criteria come first, then Max price, then the Destination when set. Null
 * when there is no Max price or Policy criterion to name.
 */
export function hardCriteriaSummary(q: string, smart: SmartCriteria | null): string | null {
  if (!smart) return null;
  const named = [
    ...POLICY_CRITERIA.filter((policy) => smart.policies.includes(policy)).map(
      (policy) => POLICY_LABELS[policy],
    ),
    ...(smart.maxPriceRand !== null ? [criterionLabel("maxPrice", smart.maxPriceRand)] : []),
  ];
  if (named.length === 0) return null;
  const destination = q.trim();
  const where = destination ? ` in ${destination}` : "";
  return `We looked for ${listOf(named)}${where}. Remove a filter, or try other dates or another city.`;
}
