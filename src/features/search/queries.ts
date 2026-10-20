import "server-only";
import { io } from "next/cache";
import { getDb } from "@/db/client";
import type { CityTile, SearchCriteria, SearchResult } from "@/domain/types";
import { nowIso } from "@/domain/clock";
import { smartNotices } from "@/domain/interpretation";
import { cityNamed } from "@/domain/search";
import { listCityNames, listCityTiles } from "@/features/hotels/catalog.repo";
import { getProvider } from "@/features/search/provider/config";
import { searchCatalog } from "@/features/search/search.repo";

/** Home's City tiles, read at request time (AD-2). */
export async function getCityTiles(): Promise<CityTile[]> {
  await io();
  return listCityTiles(getDb());
}

/**
 * The City a Destination names exactly, for the page title, or null. Read at
 * request time (AD-2).
 */
export async function getCityNamed(query: string): Promise<string | null> {
  await io();
  return cityNamed(query, listCityNames(getDb()));
}

/**
 * The only entry point for listing Hotels (AD-7), read at request time
 * (AD-2). It matches the Destination, keeps Hotels with a Room type available
 * for every Night of the Stay, and ranks them (FR-2, FR-3, FR-5–FR-7). With
 * `criteria.stay` null it runs no query and returns an empty result.
 *
 * This is the seam for intelligent search: a replacement with the same
 * signature, taking `SearchCriteria` and returning `SearchResult` with
 * `ListingCard`s (all in `src/domain/types.ts`), needs no change in any
 * caller.
 *
 * With Smart search criteria it adds their notices (AD-20): the unknown
 * place, then the ignored value, at most 2. An MVP search has none.
 */
export async function searchHotels(
  criteria: SearchCriteria,
): Promise<SearchResult> {
  await io();
  const result = searchCatalog(getDb(), criteria, nowIso());
  return { ...result, notices: smartNotices(criteria.smart, criteria.q) };
}

/**
 * Whether Smart search is configured (AD-29), read at request time (AD-2).
 * Pages pass it down as a boolean: without a Provider the Smart search box
 * is not rendered and the page is the MVP page (FR-2).
 */
export async function getSmartSearchConfig(): Promise<boolean> {
  await io();
  return getProvider() !== null;
}
