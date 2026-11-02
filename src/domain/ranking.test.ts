// @vitest-environment node
import { describe, expect, it } from "vitest";
import { blendScore, priceSignal, RANKING_BLEND, rankByBlend, reviewSignal } from "./ranking";

type Hotel = { name: string; reviewScore: number; nightlyRand: number };

const names = (ranked: { item: Hotel }[]) => ranked.map(({ item }) => item.name);

describe("RANKING_BLEND", () => {
  it("is Best match: 0.7 Relevance, 0.15 Review score, 0.15 price", () => {
    expect(RANKING_BLEND).toEqual({ relevance: 0.7, reviewScore: 0.15, price: 0.15 });
  });
});

describe("reviewSignal", () => {
  it.each([
    [2.5, 0],
    [3.0, 0],
    [4.0, 0.5],
    [5.0, 1],
    [5.5, 1],
  ])("maps a Review score of %s to %s, clamped", (score, signal) => {
    expect(reviewSignal(score)).toBeCloseTo(signal, 10);
  });
});

describe("priceSignal", () => {
  it.each([
    [400, 1],
    [500, 1],
    [2000, 0.5],
    [3500, 0],
    [4000, 0],
  ])("maps a Nightly price of R %s to %s, clamped", (price, signal) => {
    expect(priceSignal(price)).toBeCloseTo(signal, 10);
  });
});

describe("blendScore", () => {
  it("weights Relevance, the Review score signal and the price signal", () => {
    // 0.7 × 1 + 0.15 × 0.5 + 0.15 × 0.5
    expect(blendScore({ relevance: 1, reviewScore: 4, nightlyRand: 2000 })).toBe(0.85);
    // Relevance 0: 0.15 × 0.75 + 0.15 × 0.5
    expect(blendScore({ relevance: 0, reviewScore: 4.5, nightlyRand: 2000 })).toBe(0.1875);
  });

  it("rounds to 4 decimals", () => {
    // 0.15 × 0.9 + 0.15 × (1000 / 3000) = 0.185, after float noise
    expect(blendScore({ relevance: 0, reviewScore: 4.8, nightlyRand: 2500 })).toBe(0.185);
    expect(blendScore({ relevance: 0.123456, reviewScore: 3, nightlyRand: 3500 })).toBe(0.0864);
  });
});

describe("rankByBlend", () => {
  it("orders by the blend score, highest first, with the signals for the breakdown", () => {
    const ranked = rankByBlend<Hotel>([
      { item: { name: "Oak & Vine Manor", reviewScore: 4.8, nightlyRand: 2500 }, relevance: 0 },
      { item: { name: "Winelands Family Lodge", reviewScore: 4.5, nightlyRand: 2000 }, relevance: 0 },
    ]);
    expect(names(ranked)).toEqual(["Winelands Family Lodge", "Oak & Vine Manor"]);
    expect(ranked[0]).toMatchObject({
      relevance: 0,
      reviewSignal: 0.75,
      priceSignal: 0.5,
      score: 0.1875,
    });
  });

  it("lets Relevance outweigh the Review score and price", () => {
    const ranked = rankByBlend<Hotel>([
      { item: { name: "A", reviewScore: 5, nightlyRand: 500 }, relevance: 0 },
      { item: { name: "B", reviewScore: 3, nightlyRand: 3500 }, relevance: 0.5 },
    ]);
    expect(names(ranked)).toEqual(["B", "A"]);
  });

  it("treats scores equal to 4 decimals as a tie, broken here by the Hotel name", () => {
    // B's unrounded score is higher, but only past the 4th decimal: rounded,
    // the scores tie, and with equal Review scores and prices the name decides.
    const ranked = rankByBlend<Hotel>([
      { item: { name: "B", reviewScore: 4, nightlyRand: 2000 }, relevance: 0.50001 },
      { item: { name: "A", reviewScore: 4, nightlyRand: 2000 }, relevance: 0.5 },
    ]);
    expect(ranked[0].score).toBe(ranked[1].score);
    expect(names(ranked)).toEqual(["A", "B"]);
  });

  it("breaks a tie by the higher Review score", () => {
    // Equal scores: 0.15 × 1 + 0.15 × 0 = 0.15 × 0 + 0.15 × 1.
    const ranked = rankByBlend<Hotel>([
      { item: { name: "Cheap", reviewScore: 3, nightlyRand: 500 }, relevance: 0 },
      { item: { name: "Loved", reviewScore: 5, nightlyRand: 3500 }, relevance: 0 },
    ]);
    expect(ranked[0].score).toBe(ranked[1].score);
    expect(names(ranked)).toEqual(["Loved", "Cheap"]);
  });

  it("then by the lower Best-fit Nightly price", () => {
    // Both prices clamp to signal 1, so the scores tie.
    const ranked = rankByBlend<Hotel>([
      { item: { name: "A", reviewScore: 4, nightlyRand: 450 }, relevance: 0 },
      { item: { name: "B", reviewScore: 4, nightlyRand: 300 }, relevance: 0 },
    ]);
    expect(names(ranked)).toEqual(["B", "A"]);
  });

  it("then by the Hotel name", () => {
    const ranked = rankByBlend<Hotel>([
      { item: { name: "Zebra Lodge", reviewScore: 4, nightlyRand: 2000 }, relevance: 0 },
      { item: { name: "Aloe House", reviewScore: 4, nightlyRand: 2000 }, relevance: 0 },
    ]);
    expect(names(ranked)).toEqual(["Aloe House", "Zebra Lodge"]);
  });

  it("is empty for no Hotels", () => {
    expect(rankByBlend([])).toEqual([]);
  });
});
