import "server-only";
import { io } from "next/cache";
import { getDb } from "@/db/client";
import type { CityTile, SearchCriteria, SearchResult } from "@/domain/types";
import { listCityTiles } from "@/features/hotels/catalog.repo";
import { searchCatalog } from "@/features/search/search.repo";

/** Home's City tiles, read at request time (AD-2). */
export async function getCityTiles(): Promise<CityTile[]> {
  await io();
  return listCityTiles(getDb());
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
 */
export async function searchHotels(
  criteria: SearchCriteria,
): Promise<SearchResult> {
  await io();
  return searchCatalog(getDb(), criteria);
}
