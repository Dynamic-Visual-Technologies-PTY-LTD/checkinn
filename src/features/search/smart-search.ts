/**
 * The Smart search pipeline cores (AD-19, AD-22). No `server-only`, so the
 * eval scripts can share them; `actions.ts` and `queries.ts` are the thin
 * server wrappers.
 */
import {
  applyInterpretation,
  type InterpretedCriteria,
} from "@/domain/interpretation";
import { normaliseText } from "@/domain/text";
import type { IsoDate } from "@/domain/types";
import type { InterpretationContext, Provider } from "@/features/search/provider/types";

/** What interpretation needs from the catalog. */
export type InterpretationCatalog = {
  cities: { name: string; aliases: string[] }[];
};

/**
 * Query interpretation (AD-22), the only caller of `Provider.interpret`:
 * normalises the Query, asks the Provider, then applies its untrusted output
 * to the current criteria. Provider failures throw `ProviderError`.
 */
export async function interpretQuery(
  provider: Provider,
  query: string,
  current: InterpretedCriteria,
  catalog: InterpretationCatalog,
  today: IsoDate,
  signal: AbortSignal,
): Promise<InterpretedCriteria> {
  const context: InterpretationContext = {
    today,
    cities: catalog.cities,
    // Filled from the domain nickname table in story 1.3.
    nicknames: {},
  };
  const raw = await provider.interpret(normaliseText(query), context, signal);
  return applyInterpretation(raw, current, today);
}
