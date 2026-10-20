/**
 * The Smart search pipeline cores (AD-19, AD-22). No `server-only`, so the
 * eval scripts can share them; `actions.ts` and `queries.ts` are the thin
 * server wrappers.
 */
import {
  applyInterpretation,
  type InterpretationHotel,
  type InterpretedCriteria,
  type SearchBarCriteria,
} from "@/domain/interpretation";
import type { Db } from "@/db/client";
import { bestFit } from "@/domain/best-fit";
import {
  hardCriteriaSummary,
  hotelQualifies,
  qualifyingRoomTypes,
  searchMode,
} from "@/domain/hard-criteria";
import { smartNotices } from "@/domain/interpretation";
import { CITY_NICKNAMES } from "@/domain/nicknames";
import { rankByBlend } from "@/domain/ranking";
import { heading } from "@/domain/search";
import { normaliseText } from "@/domain/text";
import type { IsoDate, ListingCard, SearchCriteria, SearchResult } from "@/domain/types";
import type { InterpretationContext, Provider } from "@/features/search/provider/types";
import { searchCatalog, smartCandidates } from "@/features/search/search.repo";

/** What interpretation needs from the catalog. */
export type InterpretationCatalog = {
  cities: { name: string; aliases: string[] }[];
  /** Every Hotel, for the Destination check and Rooms auto-raise (AD-22, AD-26). */
  hotels: InterpretationHotel[];
};

/**
 * Query interpretation (AD-22), the only caller of `Provider.interpret`:
 * normalises the Query, asks the Provider with today, the Cities and the
 * nickname map, then applies its untrusted output to the current criteria.
 * Provider failures throw `ProviderError`.
 */
export async function interpretQuery(
  provider: Provider,
  query: string,
  current: SearchBarCriteria,
  catalog: InterpretationCatalog,
  today: IsoDate,
  signal: AbortSignal,
): Promise<InterpretedCriteria> {
  const context: InterpretationContext = {
    today,
    cities: catalog.cities,
    nicknames: { ...CITY_NICKNAMES },
  };
  const raw = await provider.interpret(normaliseText(query), context, signal);
  return applyInterpretation(raw, current, catalog, today);
}

/**
 * Runs a search (AD-20), the one place its mode is decided:
 * - `mvp` with no Provider, no Smart search criteria, or a Query that was not
 *   interpreted: the MVP `searchCatalog` result, unchanged, with no notices.
 * - `smart`: the MVP Destination and Stay match, narrowed by the Hard
 *   criteria (AD-23). Each card carries its Best-fit room and is priced from
 *   it, and the cards are in Ranking blend order (AD-26). Relevance is 0, and
 *   the Room-type meanings empty, until Relevance exists. With nothing found,
 *   `criteriaSummary` names the Hard criteria.
 *
 * With `debug` (the server's `CHECKINN_SEARCH_DEBUG`, AD-29), each `smart`
 * card also carries its Score breakdown (FR-20).
 *
 * `today` is for the stages that follow (Relevance and the fallback). It never
 * throws for Provider errors.
 */
export function runSmartSearch(
  db: Db,
  provider: Provider | null,
  criteria: SearchCriteria,
  today: IsoDate,
  now: string,
  { debug = false }: { debug?: boolean } = {},
): SearchResult {
  const { smart, stay, party, q } = criteria;
  if (searchMode(provider !== null, smart) === "mvp" || !smart) {
    return { ...searchCatalog(db, criteria, now), mode: "mvp", criteriaSummary: null };
  }

  const notices = smartNotices(smart, q);
  if (!stay) return { heading: null, cards: [], notices, mode: "smart", criteriaSummary: null };

  const priced: { item: ListingCard; relevance: number }[] = [];
  for (const candidate of smartCandidates(db, criteria, now)) {
    const qualifying = qualifyingRoomTypes(
      candidate.roomTypes,
      candidate.availability,
      party,
      smart.maxPriceRand,
    );
    if (!hotelQualifies(candidate, qualifying, smart.policies)) continue;
    // No Room-type meanings until Relevance exists, so the cheapest wins.
    const room = bestFit(qualifying, new Map(), party.rooms, candidate.card.nights);
    if (!room) continue;
    priced.push({
      item: {
        ...candidate.card,
        totalRand: room.totalRand,
        nightlyRand: room.nightlyRand,
        bestFit: room,
      },
      relevance: 0,
    });
  }

  const ranked = rankByBlend(priced).map(({ item, reviewSignal, priceSignal, score }) =>
    debug
      ? { ...item, breakdown: { meaning: 0, exact: 0, reviewSignal, priceSignal, score } }
      : item,
  );
  return {
    heading: heading(q, ranked),
    cards: ranked,
    notices,
    mode: "smart",
    criteriaSummary: ranked.length === 0 ? hardCriteriaSummary(q, smart) : null,
  };
}
