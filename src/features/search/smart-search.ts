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
import { CITY_NICKNAMES } from "@/domain/nicknames";
import { normaliseText } from "@/domain/text";
import type { IsoDate } from "@/domain/types";
import type { InterpretationContext, Provider } from "@/features/search/provider/types";

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
