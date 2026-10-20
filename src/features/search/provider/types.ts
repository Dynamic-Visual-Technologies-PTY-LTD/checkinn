/**
 * The Provider port (AD-19): the one interface Smart search talks to. Each
 * method takes an `AbortSignal` and either returns its parsed result or
 * throws a `ProviderError`. The output is still untrusted: callers validate
 * it before use (AD-22, AD-27).
 *
 * Only `src/features/search` and `scripts/search-*.ts` import `provider/`.
 */
import type { Interpretation } from "@/domain/interpretation";
import type { IsoDate } from "@/domain/types";

/** Why a Provider call failed. Every code leads to the fallback. */
export const PROVIDER_ERROR_CODES = [
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "INVALID_OUTPUT",
] as const;
export type ProviderErrorCode = (typeof PROVIDER_ERROR_CODES)[number];

/** A failed Provider call. Logs carry only `code` and `status` (AD-29). */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  /** The HTTP status, when there was one. */
  readonly status?: number;

  constructor(code: ProviderErrorCode, options: { status?: number; cause?: unknown } = {}) {
    super(`Provider ${code}`, { cause: options.cause });
    this.name = "ProviderError";
    this.code = code;
    this.status = options.status;
  }
}

/** What Query interpretation is told besides the Query (AD-22). */
export type InterpretationContext = {
  /** Today in Africa/Johannesburg, for relative dates. */
  today: IsoDate;
  /** Every catalog City with its aliases. */
  cities: { name: string; aliases: string[] }[];
  /** Nickname → City name, e.g. "joburg" → "Johannesburg". Empty until story 1.3. */
  nicknames: Record<string, string>;
};

/** One chunk of a Hotel's Search knowledge, sent with its id. */
export type ReasonChunk = { id: string; text: string };

/** One batched Match reasons call: the Preferences and each Hotel's top chunks (AD-27). */
export type ReasonsInput = {
  preferences: string;
  hotels: { hotelId: string; chunks: ReasonChunk[] }[];
};

/** One Match reason as the Provider returns it, before `validateReason`. */
export type ReasonOutput = {
  hotelId: string;
  reason: string;
  citedChunkIds: string[];
};

/** A grounding judge call (FR-19): one reason and that Hotel's Search knowledge. */
export type JudgeInput = {
  reason: string;
  knowledge: string[];
};

export type JudgeVerdict = {
  grounded: boolean;
  explanation: string;
};

export interface Provider {
  /**
   * Interprets a normalised Query. The result follows the strict schema but
   * is untrusted; `applyInterpretation` validates it.
   */
  interpret(
    query: string,
    context: InterpretationContext,
    signal: AbortSignal,
  ): Promise<Interpretation>;
  /** One vector per text, in order. */
  embed(texts: string[], signal: AbortSignal): Promise<number[][]>;
  /** Match reasons for every Hotel sent, in one call (AD-27). */
  reasons(input: ReasonsInput, signal: AbortSignal): Promise<ReasonOutput[]>;
  /** The grounding verdict for one reason; eval only. */
  judge(input: JudgeInput, signal: AbortSignal): Promise<JudgeVerdict>;
}
