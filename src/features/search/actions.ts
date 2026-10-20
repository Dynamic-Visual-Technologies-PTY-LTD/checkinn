"use server";
import "server-only";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { todayIn } from "@/domain/clock";
import {
  MAX_QUERY_LENGTH,
  parseCriteria,
  searchHref,
  serializeCriteria,
  smartCriteria,
} from "@/domain/criteria";
import type { SearchBarCriteria } from "@/domain/interpretation";
import type { ActionResult } from "@/domain/types";
import { listCityNames, listInterpretationCatalog } from "@/features/hotels/catalog.repo";
import { getProvider } from "@/features/search/provider/config";
import { ProviderError } from "@/features/search/provider/types";
import { interpretQuery } from "@/features/search/smart-search";

export type SubmitQueryInput = {
  /** The Query as typed in the Smart search box. */
  query: string;
  /** The Search bar's Destination, Stay and Party before the submit. */
  current: SearchBarCriteria;
};

/** Query interpretation's time budget (AD-22). */
const INTERPRETATION_TIMEOUT_MS = 2_500;

const SERVER_ERROR: ActionResult = {
  ok: false,
  code: "SERVER_ERROR",
  message: "Something went wrong on our side. Try again.",
};

function invalid(message: string): ActionResult {
  return { ok: false, code: "VALIDATION", message };
}

/** Logs an unexpected error by name only: never the Query (AD-29). */
function logFailure(action: string, error: unknown) {
  const name = error instanceof Error ? error.name : "unknown";
  console.error(`${action} failed`, name);
}

/** A Provider failure, including a timeout the adapter did not map (AD-19). */
function providerFailure(error: unknown): string | null {
  if (error instanceof ProviderError) return error.code;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "TIMEOUT";
  }
  return null;
}

/**
 * Re-parses the client's criteria through the codec (AD-8): client values
 * are never trusted as they are.
 */
function reparse(current: SearchBarCriteria | undefined): SearchBarCriteria {
  const params = new URLSearchParams(
    serializeCriteria({ q: current?.q, stay: current?.stay, party: current?.party }),
  );
  const { criteria } = parseCriteria(params, todayIn(), { defaultStay: false });
  return { q: criteria.q, stay: criteria.stay, party: criteria.party };
}

/** Where a submitted Query leads. */
async function queryTarget(query: string, current: SearchBarCriteria): Promise<string> {
  const provider = getProvider();
  // No Provider configured (a crafted call): the MVP URL, and no request (AD-31).
  if (!provider) return searchHref(current);

  try {
    const db = getDb();
    const { q, stay, party, ...values } = await interpretQuery(
      provider,
      query,
      current,
      { cities: listCityNames(db), hotels: listInterpretationCatalog(db) },
      todayIn(),
      AbortSignal.timeout(INTERPRETATION_TIMEOUT_MS),
    );
    return searchHref({ q, stay, party, smart: smartCriteria(query, true, values) });
  } catch (error) {
    const code = providerFailure(error);
    if (!code) throw error;
    console.error("submitQuery interpretation failed", code);
    // Until story 1.7: the pre-submit criteria with the Query kept for the box.
    return searchHref({ ...current, smart: smartCriteria(query, false) });
  }
}

/**
 * Submit a Query from the Smart search box (AD-22). Interprets it once and
 * redirects to `/search` with `sq`, `smart=1`, the interpreted Destination,
 * Stay and Party, and the Smart search parameters: Preferences, Max price,
 * Policy criteria, and the place and ignored value for their notices. An empty Query, or one over 300 characters,
 * returns `VALIDATION`. A Provider failure keeps the current criteria and
 * the Query; no Provider gives the MVP URL.
 */
export async function submitQuery(input: SubmitQueryInput): Promise<ActionResult> {
  let target: string;
  try {
    const query = typeof input?.query === "string" ? input.query.trim() : "";
    if (!query) return invalid("Describe your stay to search.");
    if (query.length > MAX_QUERY_LENGTH) {
      return invalid(`Descriptions can be up to ${MAX_QUERY_LENGTH} characters.`);
    }
    target = await queryTarget(query, reparse(input.current));
  } catch (error) {
    logFailure("submitQuery", error);
    return SERVER_ERROR;
  }
  // Outside the try: redirect() works by throwing.
  redirect(target);
}
