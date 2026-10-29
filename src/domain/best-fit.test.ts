// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bestFit, hotelBestFit, type BestFitRoomType } from "./best-fit";

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

describe("hotelBestFit (AD-26)", () => {
  // Winelands Family Lodge: Standard 1 450, sleeps 2; Family 2 000, sleeps 4.
  const rooms = [standard, family];
  const open = new Map([
    [standard.id, 5],
    [family.id, 3],
  ]);
  const fourAdults = { adults: 4, children: 0, rooms: 1 };

  it("UJ-1 arrival: chips and pre-selects the Family Room × 1", () => {
    expect(hotelBestFit(family.id, rooms, open, fourAdults, false, true)).toEqual({
      chipRoomTypeId: family.id,
      preselect: [{ roomTypeId: family.id, quantity: 1 }],
    });
  });

  it("pre-selects at the URL's Rooms", () => {
    expect(
      hotelBestFit(standard.id, rooms, open, { adults: 4, children: 0, rooms: 2 }, false, true),
    ).toEqual({
      chipRoomTypeId: standard.id,
      preselect: [{ roomTypeId: standard.id, quantity: 2 }],
    });
  });

  it("with sel in the URL, only places the chip", () => {
    expect(hotelBestFit(family.id, rooms, open, fourAdults, true, true)).toEqual({
      chipRoomTypeId: family.id,
      preselect: null,
    });
  });

  it("does nothing with no Provider", () => {
    expect(hotelBestFit(family.id, rooms, open, fourAdults, false, false)).toEqual({
      chipRoomTypeId: null,
      preselect: null,
    });
  });

  it("does nothing for an unknown or absent id", () => {
    const nothing = { chipRoomTypeId: null, preselect: null };
    expect(hotelBestFit("nope", rooms, open, fourAdults, false, true)).toEqual(nothing);
    expect(hotelBestFit(null, rooms, open, fourAdults, false, true)).toEqual(nothing);
  });

  it("does nothing when the Room type no longer qualifies", () => {
    const nothing = { chipRoomTypeId: null, preselect: null };
    // Too small: sleeps 2 < 4 adults in 1 Room.
    expect(hotelBestFit(standard.id, rooms, open, fourAdults, false, true)).toEqual(nothing);
    // Availability below the Rooms.
    const scarce = new Map([[family.id, 1]]);
    expect(
      hotelBestFit(family.id, rooms, scarce, { adults: 4, children: 0, rooms: 2 }, false, true),
    ).toEqual(nothing);
    // Sold out.
    expect(hotelBestFit(family.id, rooms, new Map(), fourAdults, false, true)).toEqual(nothing);
  });

  it("ignores Max price: a dear Room type still qualifies", () => {
    const dear = { ...family, nightlyRand: 9000 };
    expect(hotelBestFit(dear.id, [standard, dear], open, fourAdults, false, true).preselect).toEqual(
      [{ roomTypeId: dear.id, quantity: 1 }],
    );
  });
});
