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
import { fromPrice } from "@/domain/pricing";
import { rankByBlend } from "@/domain/ranking";
import { heading, rank } from "@/domain/search";
import { normaliseText } from "@/domain/text";
import type {
  IsoDate,
  ListingCard,
  Party,
  SearchCriteria,
  SearchResult,
  SmartCriteria,
} from "@/domain/types";
import { interpretationCache, interpretationKey } from "@/features/search/cache";
import {
  type InterpretationContext,
  type Provider,
  ProviderError,
} from "@/features/search/provider/types";
import {
  searchCatalog,
  type SmartCandidate,
  smartCandidates,
} from "@/features/search/search.repo";

/** What interpretation needs from the catalog. */
export type InterpretationCatalog = {
  cities: { name: string; aliases: string[] }[];
  /** Every Hotel, for the Destination check and Rooms auto-raise (AD-22, AD-26). */
  hotels: InterpretationHotel[];
};

/**
 * `promise`, or a `ProviderError("TIMEOUT")` as soon as `signal` aborts, even
 * when whatever made `promise` ignores the signal.
 */
function raceSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new ProviderError("TIMEOUT"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new ProviderError("TIMEOUT"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

/**
 * Query interpretation (AD-22), the only caller of `Provider.interpret`:
 * normalises the Query, asks the Provider with today, the Cities and the
 * nickname map, then applies its untrusted output to the current criteria.
 *
 * The Provider's raw output comes through the interpretation cache (AD-28),
 * keyed by the normalised Query and today, so a repeated or concurrent
 * identical Query makes one call; `applyInterpretation` still runs every
 * time. When `signal` aborts it rejects with `ProviderError("TIMEOUT")`, even
 * if the Provider ignores the signal, and evicts that call from the cache
 * (unless a newer call has replaced it), so a call that never settles is
 * never pinned there. Provider failures throw `ProviderError`.
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
  // Out of time already: no cache lookup and no Provider call.
  if (signal.aborted) throw new ProviderError("TIMEOUT");
  const normalised = normaliseText(query);
  const key = interpretationKey(normalised, today);
  const call = interpretationCache.getOrCreate(key, () =>
    provider.interpret(normalised, context, signal),
  );
  let raw: Awaited<typeof call>;
  try {
    raw = await raceSignal(call, signal);
  } catch (error) {
    // A call that lost the race may never settle: never pin it in the cache.
    if (signal.aborted) interpretationCache.evict(key, call);
    throw error;
  }
  return applyInterpretation(raw, current, catalog, today);
}

/** The candidates that meet the Hard criteria (AD-23), each with its qualifying Room types. */
function qualifyingCandidates(
  candidates: readonly SmartCandidate[],
  party: Party,
  smart: SmartCriteria,
) {
  const found: { candidate: SmartCandidate; qualifying: SmartCandidate["roomTypes"] }[] = [];
  for (const candidate of candidates) {
    const qualifying = qualifyingRoomTypes(
      candidate.roomTypes,
      candidate.availability,
      party,
      smart.maxPriceRand,
    );
    if (hotelQualifies(candidate, qualifying, smart.policies)) found.push({ candidate, qualifying });
  }
  return found;
}

/**
 * Runs a search (AD-20), the one place its mode is decided:
 * - `mvp` with no Provider, no Smart search criteria, or a Query that is
 *   neither interpreted nor a fallback: the MVP `searchCatalog` result,
 *   unchanged, with no notices.
 * - `fallback` on a fallback URL: the Hard criteria the URL holds (AD-23:
 *   Party capacity and Availability always, Max price and Policy criteria if
 *   present), in MVP `rank` order, as MVP cards priced "from" the cheapest
 *   qualifying Room type, with no Best-fit room. The fallback notice comes
 *   first.
 * - `smart`: the MVP Destination and Stay match, narrowed by the Hard
 *   criteria (AD-23). Each card carries its Best-fit room and is priced from
 *   it, and the cards are in Ranking blend order (AD-26). Relevance is 0, and
 *   the Room-type meanings empty, until Relevance exists. With nothing found,
 *   `criteriaSummary` names the Hard criteria.
 *
 * With `debug` (the server's `CHECKINN_SEARCH_DEBUG`, AD-29), each `smart`
 * card also carries its Score breakdown (FR-20).
 *
 * `today` is for the stages still to come (Relevance). It never
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
  const mode = searchMode(provider !== null, smart);
  if (mode === "mvp" || !smart) {
    return { ...searchCatalog(db, criteria, now), mode: "mvp", criteriaSummary: null };
  }

  const notices = smartNotices(smart, q);
  if (!stay) return { heading: null, cards: [], notices, mode, criteriaSummary: null };
  const found = qualifyingCandidates(smartCandidates(db, criteria, now), party, smart);

  if (mode === "fallback") {
    const cards: ListingCard[] = [];
    for (const { candidate, qualifying } of found) {
      const price = fromPrice(
        qualifying.map((type) => type.nightlyRand),
        candidate.card.nights,
        party.rooms,
      );
      if (price) cards.push({ ...candidate.card, ...price });
    }
    const ranked = rank(cards);
    return {
      heading: heading(q, ranked),
      cards: ranked,
      notices,
      mode,
      criteriaSummary: ranked.length === 0 ? hardCriteriaSummary(q, smart) : null,
    };
  }

  const priced: { item: ListingCard; relevance: number }[] = [];
  for (const { candidate, qualifying } of found) {
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
