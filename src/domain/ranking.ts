/**
 * The Ranking blend (AD-26, FR-11 to FR-13): the one order Smart search
 * results are shown in. Pure, with fixed scales, so no score depends on the
 * candidate set.
 */

/**
 * The Ranking blend weights: Best match. Provisional until the workshop
 * chooses the blend (2.8); it is the only blend in the app (FR-12).
 */
export const RANKING_BLEND = { relevance: 0.7, reviewScore: 0.15, price: 0.15 } as const;

/** The Review score scale: 3.0 → 0, 5.0 → 1. */
export const REVIEW_SCALE = { low: 3, high: 5 } as const;

/** The Best-fit Nightly price scale, in rand: R 500 → 1, R 3 500 → 0. */
export const PRICE_SCALE = { cheap: 500, dear: 3500 } as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Rounds to 4 decimals, so near-equal scores order as ties (AD-26). */
function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** The Review score signal, 0–1: 3.0 and below → 0, 5.0 and above → 1. */
export function reviewSignal(reviewScore: number): number {
  return clamp01((reviewScore - REVIEW_SCALE.low) / (REVIEW_SCALE.high - REVIEW_SCALE.low));
}

/** The price signal, 0–1, from the Best-fit Nightly price: R 500 → 1, R 3 500 → 0. */
export function priceSignal(nightlyRand: number): number {
  return clamp01((PRICE_SCALE.dear - nightlyRand) / (PRICE_SCALE.dear - PRICE_SCALE.cheap));
}

/** What the blend needs to know about a Hotel. */
export type BlendInput = {
  /** 0–1 (AD-26). */
  relevance: number;
  /** Out of 5. */
  reviewScore: number;
  /** The Best-fit room's Nightly price. */
  nightlyRand: number;
};

/** The Ranking blend score, 0–1, rounded to 4 decimals. */
export function blendScore({ relevance, reviewScore, nightlyRand }: BlendInput): number {
  const w = RANKING_BLEND;
  return round4(
    w.relevance * relevance +
      w.reviewScore * reviewSignal(reviewScore) +
      w.price * priceSignal(nightlyRand),
  );
}

/** A ranked Hotel with the signals behind its place, for the Score breakdown. */
export type Ranked<T> = {
  item: T;
  relevance: number;
  reviewSignal: number;
  priceSignal: number;
  score: number;
};

/**
 * Orders Hotels by the Ranking blend score, highest first. Ties (equal to 4
 * decimals) break by the higher Review score, then the lower Best-fit Nightly
 * price, then the Hotel name.
 */
export function rankByBlend<T extends { name: string; reviewScore: number; nightlyRand: number }>(
  entries: readonly { item: T; relevance: number }[],
): Ranked<T>[] {
  return entries
    .map(({ item, relevance }) => ({
      item,
      relevance,
      reviewSignal: reviewSignal(item.reviewScore),
      priceSignal: priceSignal(item.nightlyRand),
      score: blendScore({ relevance, reviewScore: item.reviewScore, nightlyRand: item.nightlyRand }),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.item.reviewScore - a.item.reviewScore ||
        a.item.nightlyRand - b.item.nightlyRand ||
        (a.item.name < b.item.name ? -1 : a.item.name > b.item.name ? 1 : 0),
    );
}
