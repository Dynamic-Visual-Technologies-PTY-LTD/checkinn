// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bestFit, type BestFitRoomType } from "./best-fit";

const standard: BestFitRoomType = {
  id: "hotel-010-standard",
  name: "Standard Double",
  maxGuests: 2,
  nightlyRand: 1450,
};
const family: BestFitRoomType = {
  id: "hotel-010-family",
  name: "Family Room",
  maxGuests: 4,
  nightlyRand: 2000,
};
const none = new Map<string, number>();

describe("bestFit", () => {
  it("UJ-1: the only qualifying Room type, priced for the Stay", () => {
    expect(bestFit([family], none, 1, 2)).toEqual({
      roomTypeId: "hotel-010-family",
      name: "Family Room",
      rooms: 1,
      sleeps: 4,
      nightlyRand: 2000,
      totalRand: 4000,
    });
  });

  it("with empty meanings, picks the lower Nightly price", () => {
    expect(bestFit([family, standard], none, 1, 2)?.roomTypeId).toBe("hotel-010-standard");
  });

  it("with equal prices and meanings, keeps seed order", () => {
    const twin = { ...standard, id: "hotel-010-twin", name: "Twin Room" };
    expect(bestFit([standard, twin], none, 1, 2)?.roomTypeId).toBe("hotel-010-standard");
    expect(bestFit([twin, standard], none, 1, 2)?.roomTypeId).toBe("hotel-010-twin");
  });

  it("lets the higher meaning win over a lower price", () => {
    const meanings = new Map([
      [family.id, 0.9],
      [standard.id, 0.1],
    ]);
    expect(bestFit([standard, family], meanings, 1, 2)?.roomTypeId).toBe("hotel-010-family");
  });

  it("breaks a meaning tie by the lower Nightly price", () => {
    const meanings = new Map([
      [family.id, 0.5],
      [standard.id, 0.5],
    ]);
    expect(bestFit([family, standard], meanings, 1, 2)?.roomTypeId).toBe("hotel-010-standard");
  });

  it("counts a missing meaning as 0", () => {
    expect(bestFit([standard, family], new Map([[family.id, 0.2]]), 1, 2)?.roomTypeId).toBe(
      "hotel-010-family",
    );
    expect(bestFit([family, standard], new Map([[family.id, 0]]), 1, 2)?.roomTypeId).toBe(
      "hotel-010-standard",
    );
  });

  it("never splits a Party: one Room type × the Rooms, sleeping maxGuests × rooms", () => {
    expect(bestFit([standard], none, 2, 2)).toEqual({
      roomTypeId: "hotel-010-standard",
      name: "Standard Double",
      rooms: 2,
      sleeps: 4,
      nightlyRand: 1450,
      totalRand: 1450 * 2 * 2,
    });
  });

  it("is null when nothing qualifies", () => {
    expect(bestFit([], none, 1, 2)).toBeNull();
  });
});
