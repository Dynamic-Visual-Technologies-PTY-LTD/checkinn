/**
 * The fake Provider (AD-30): answers from committed fixtures, for the e2e
 * Smart server and for unit tests. It never touches the network.
 *
 * `data/eval/fake-provider.json` maps a normalised Query to an
 * interpretation and normalised Preferences to a reason text. Anything it
 * does not know throws `ProviderError("UNAVAILABLE")`, which the fallback
 * specs use. `embed` and `judge` have no fixtures yet, so they always throw.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Interpretation } from "@/domain/interpretation";
import { normaliseText } from "@/domain/text";
import {
  type InterpretationContext,
  type JudgeInput,
  type JudgeVerdict,
  type Provider,
  ProviderError,
  type ReasonOutput,
  type ReasonsInput,
} from "@/features/search/provider/types";

export type FakeFixtures = {
  /** Normalised Query → interpretation. */
  interpretations: Record<string, Interpretation>;
  /** Normalised Preferences → reason text. */
  reasons: Record<string, string>;
};

/** Reads `data/eval/fake-provider.json`. */
export function loadFakeFixtures(): FakeFixtures {
  const file = path.join(process.cwd(), "data", "eval", "fake-provider.json");
  return JSON.parse(readFileSync(file, "utf8")) as FakeFixtures;
}

function checkSignal(signal: AbortSignal) {
  if (signal.aborted) throw new ProviderError("TIMEOUT");
}

/** A Provider that answers only from `fixtures`. */
export function createFakeProvider(fixtures: FakeFixtures = loadFakeFixtures()): Provider {
  return {
    async interpret(query: string, _context: InterpretationContext, signal: AbortSignal) {
      checkSignal(signal);
      const found = fixtures.interpretations[normaliseText(query)];
      if (!found) throw new ProviderError("UNAVAILABLE");
      return structuredClone(found);
    },

    async embed(_texts: string[], signal: AbortSignal): Promise<number[][]> {
      checkSignal(signal);
      throw new ProviderError("UNAVAILABLE");
    },

    async reasons(input: ReasonsInput, signal: AbortSignal): Promise<ReasonOutput[]> {
      checkSignal(signal);
      const reason = fixtures.reasons[normaliseText(input.preferences)];
      if (!reason) throw new ProviderError("UNAVAILABLE");
      // Fake reasons cite the first chunk sent for each Hotel (AD-30).
      return input.hotels
        .filter((hotel) => hotel.chunks.length > 0)
        .map((hotel) => ({ hotelId: hotel.hotelId, reason, citedChunkIds: [hotel.chunks[0].id] }));
    },

    async judge(_input: JudgeInput, signal: AbortSignal): Promise<JudgeVerdict> {
      checkSignal(signal);
      throw new ProviderError("UNAVAILABLE");
    },
  };
}
