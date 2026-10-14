// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bookingTotalRand, fromPrice, stayTotalRand } from "./pricing";

describe("stayTotalRand", () => {
  it("is Nightly price × Nights × Rooms", () => {
    expect(stayTotalRand(2450, 2, 1)).toBe(4900);
    expect(stayTotalRand(2450, 2, 2)).toBe(9800);
  });
});

describe("bookingTotalRand", () => {
  it("sums the Stay totals (FR-20 Coral Coast example)", () => {
    expect(bookingTotalRand([stayTotalRand(2750, 5, 1), stayTotalRand(2200, 5, 1)])).toBe(24750);
  });

  it("is 0 with no lines", () => {
    expect(bookingTotalRand([])).toBe(0);
  });
});

describe("fromPrice", () => {
  it("takes the lowest available Nightly price for the Party's Rooms", () => {
    expect(fromPrice([3000, 2450], 2, 2)).toEqual({ nightlyRand: 2450, totalRand: 9800 });
  });

  it("is null when no Room type is available", () => {
    expect(fromPrice([], 2, 1)).toBeNull();
  });
});
