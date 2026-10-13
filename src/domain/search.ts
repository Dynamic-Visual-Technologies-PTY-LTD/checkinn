/**
 * The search rules (AD-7): Destination matching (FR-3), ranking and the
 * result heading (FR-7), and Listing card labels (FR-6, FR-12). Pure: the
 * catalog and Availability are loaded by `src/features/search/search.repo.ts`.
 */
import type { CancellationPolicy, ListingCard } from "@/domain/types";

/** The text of a Hotel that a Destination is matched against (FR-3). */
export type SearchableHotel = {
  name: string;
  area: string;
  cityName: string;
  cityAliases: readonly string[];
  province: string;
};

/**
 * Whether a Destination matches a Hotel: a trimmed, case-insensitive partial
 * match on City name, City aliases, province, Hotel area and Hotel name. An
 * empty Destination matches every Hotel.
 */
export function matches(query: string, hotel: SearchableHotel): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    hotel.cityName,
    ...hotel.cityAliases,
    hotel.province,
    hotel.area,
    hotel.name,
  ].some((field) => field.toLowerCase().includes(needle));
}

/**
 * The City a Destination names exactly (trimmed, any case, by name or alias),
 * as its display name, or null. Used for the "Cape Town hotels" page title.
 */
export function cityNamed(
  query: string,
  cities: readonly { name: string; aliases: readonly string[] }[],
): string | null {
  const needle = query.trim().toLowerCase();
  if (!needle) return null;
  const city = cities.find((c) =>
    [c.name, ...c.aliases].some((name) => name.toLowerCase() === needle),
  );
  return city?.name ?? null;
}

/**
 * Search results order (FR-7): Review score highest first, then lowest
 * Nightly price. Returns a new array; remaining ties keep their order.
 */
export function rank(cards: readonly ListingCard[]): ListingCard[] {
  return [...cards].sort(
    (a, b) => b.reviewScore - a.reviewScore || a.nightlyRand - b.nightlyRand,
  );
}

/**
 * The result heading (FR-7), or null when nothing was found.
 * - Empty Destination: "All destinations: 12 properties found".
 * - Every result in one City: "Cape Town: 2 properties found".
 * - Several Cities: "6 properties found".
 * - One result: "property", singular.
 */
export function heading(
  query: string,
  cards: readonly Pick<ListingCard, "cityName">[],
): string | null {
  if (cards.length === 0) return null;
  // FR-7: one result always reads "1 property found", with no City or
  // "All destinations" prefix.
  if (cards.length === 1) return "1 property found";
  const found = `${cards.length} properties found`;
  if (!query.trim()) return `All destinations: ${found}`;
  const cities = new Set(cards.map((card) => card.cityName));
  return cities.size === 1 ? `${cards[0].cityName}: ${found}` : found;
}

/**
 * The Review score label (FR-12): 4.5 and above "Superb", 4.0–4.4 "Very
 * good", 3.5–3.9 "Good", 3.0–3.4 "Pleasant". Null below 3.0.
 */
export function reviewLabel(score: number): string | null {
  if (score >= 4.5) return "Superb";
  if (score >= 4.0) return "Very good";
  if (score >= 3.5) return "Good";
  if (score >= 3.0) return "Pleasant";
  return null;
}

/** How many Facilities a Listing card shows (FR-6). */
export const CARD_FACILITY_COUNT = 3;

/**
 * A Listing card's Facilities: the first 3 of the Hotel's seed amenities,
 * skipping `wifi`, labelled from the seed's `amenityLabels`. Keys with no
 * label are skipped.
 */
export function cardFacilities(
  amenities: readonly string[],
  labels: Readonly<Record<string, string>>,
): string[] {
  return amenities
    .filter((key) => key !== "wifi" && Boolean(labels[key]))
    .slice(0, CARD_FACILITY_COUNT)
    .map((key) => labels[key]);
}

const CANCELLATION_LABELS: Record<CancellationPolicy, string> = {
  free_until_48_hours_before_check_in: "Free cancellation",
  non_refundable: "Non-refundable",
};

/** "Free cancellation" or "Non-refundable" (FR-6). */
export function cancellationLabel(policy: CancellationPolicy): string {
  return CANCELLATION_LABELS[policy];
}
