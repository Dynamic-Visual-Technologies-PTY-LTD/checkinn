// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatZar, spokenZar, stayPriceLine } from "./format";

const NBSP = " ";

describe("formatZar", () => {
  it("shows whole rand by default", () => {
    expect(formatZar(4900)).toBe(`R${NBSP}4${NBSP}900`);
  });

  it("shows cents with a decimal comma when asked", () => {
    expect(formatZar(4900, { cents: true })).toBe(`R${NBSP}4${NBSP}900,00`);
  });

  it("groups larger amounts and leaves small ones ungrouped", () => {
    expect(formatZar(24750)).toBe(`R${NBSP}24${NBSP}750`);
    expect(formatZar(690)).toBe(`R${NBSP}690`);
  });
});

describe("stayPriceLine", () => {
  it("reads like the PRD example", () => {
    expect(stayPriceLine(2, 2, 4900)).toBe(`2 nights, 2 adults: from R${NBSP}4${NBSP}900`);
  });

  it("uses the singular for 1", () => {
    expect(stayPriceLine(1, 1, 950)).toBe(`1 night, 1 adult: from R${NBSP}950`);
  });
});

describe("spokenZar", () => {
  it("names the amount in rand, without the symbol", () => {
    expect(spokenZar(4900)).toBe(`4${NBSP}900 rand`);
    expect(spokenZar(690)).toBe("690 rand");
  });
});
