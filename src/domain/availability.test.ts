// @vitest-environment node
import { describe, expect, it } from "vitest";
import { countAvailable, isAvailable, nightsOf } from "./availability";

describe("nightsOf", () => {
  it("lists check-in up to, not including, check-out", () => {
    expect(nightsOf({ checkIn: "2026-11-13", checkOut: "2026-11-15" })).toEqual([
      "2026-11-13",
      "2026-11-14",
    ]);
  });

  it("crosses a month end", () => {
    expect(nightsOf({ checkIn: "2026-11-30", checkOut: "2026-12-02" })).toEqual([
      "2026-11-30",
      "2026-12-01",
    ]);
  });

  it("is empty when check-out is not after check-in", () => {
    expect(nightsOf({ checkIn: "2026-11-13", checkOut: "2026-11-13" })).toEqual([]);
  });
});

describe("countAvailable", () => {
  const booked = { checkIn: "2026-11-13", checkOut: "2026-11-15", quantity: 3 };

  it("is the inventory when nothing is booked", () => {
    expect(countAvailable(10, [], { checkIn: "2026-11-13", checkOut: "2026-11-15" })).toBe(10);
  });

  it("does not count a Booking that checks out on the Stay's check-in", () => {
    expect(countAvailable(10, [booked], { checkIn: "2026-11-15", checkOut: "2026-11-16" })).toBe(10);
  });

  it("does not count a Booking that checks in on the Stay's check-out", () => {
    expect(countAvailable(10, [booked], { checkIn: "2026-11-12", checkOut: "2026-11-13" })).toBe(10);
  });

  it("counts a Booking that covers a Night of the Stay", () => {
    expect(countAvailable(10, [booked], { checkIn: "2026-11-14", checkOut: "2026-11-15" })).toBe(7);
  });

  it("subtracts the busiest Night, not the sum over the Stay", () => {
    const lines = [
      { checkIn: "2026-11-13", checkOut: "2026-11-14", quantity: 2 },
      { checkIn: "2026-11-14", checkOut: "2026-11-15", quantity: 3 },
      { checkIn: "2026-11-14", checkOut: "2026-11-16", quantity: 1 },
    ];
    expect(countAvailable(10, lines, { checkIn: "2026-11-13", checkOut: "2026-11-16" })).toBe(6);
  });

  it("never goes below 0", () => {
    expect(countAvailable(2, [booked], { checkIn: "2026-11-13", checkOut: "2026-11-14" })).toBe(0);
  });

  it("gives 0 for a Room type with no inventory", () => {
    expect(countAvailable(0, [], { checkIn: "2026-11-13", checkOut: "2026-11-14" })).toBe(0);
  });
});

describe("isAvailable", () => {
  it("needs at least 1 Room", () => {
    expect(isAvailable(0)).toBe(false);
    expect(isAvailable(1)).toBe(true);
  });
});
