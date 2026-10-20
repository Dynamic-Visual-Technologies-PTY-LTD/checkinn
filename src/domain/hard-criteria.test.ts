import { describe, expect, it } from "vitest";
import { smartCriteria } from "@/domain/criteria";
import {
  criteriaChips,
  criterionLabel,
  hardCriteriaSummary,
  hotelQualifies,
  qualifyingRoomTypes,
  searchMode,
} from "./hard-criteria";

const NBSP = " ";

const standard = { id: "standard", name: "Standard Double", maxGuests: 2, nightlyRand: 1450 };
const family = { id: "family", name: "Family Room", maxGuests: 4, nightlyRand: 2000 };
const types = [standard, family];
const plenty = new Map([
  ["standard", 10],
  ["family", 4],
]);

const allowed = { petsAllowed: true, childrenAllowed: true, smokingAllowed: false };

describe("qualifyingRoomTypes", () => {
  it("keeps only a Room type that sleeps the whole Party in one Room", () => {
    expect(
      qualifyingRoomTypes(types, plenty, { adults: 4, children: 0, rooms: 1 }, null),
    ).toEqual([family]);
  });

  it("counts children as guests", () => {
    expect(
      qualifyingRoomTypes(types, plenty, { adults: 2, children: 2, rooms: 1 }, null),
    ).toEqual([family]);
  });

  it("multiplies capacity by the Rooms", () => {
    expect(
      qualifyingRoomTypes(types, plenty, { adults: 4, children: 0, rooms: 2 }, null),
    ).toEqual([standard, family]);
  });

  it("needs an Availability count of at least the Rooms", () => {
    const short = new Map([
      ["standard", 1],
      ["family", 2],
    ]);
    expect(
      qualifyingRoomTypes(types, short, { adults: 4, children: 0, rooms: 2 }, null),
    ).toEqual([family]);
    expect(
      qualifyingRoomTypes(types, new Map(), { adults: 1, children: 0, rooms: 1 }, null),
    ).toEqual([]);
  });

  it("keeps a Nightly price at or under Max price, not over it", () => {
    const party = { adults: 4, children: 0, rooms: 1 };
    expect(qualifyingRoomTypes(types, plenty, party, 2000)).toEqual([family]);
    expect(qualifyingRoomTypes(types, plenty, party, 1999)).toEqual([]);
  });
});

describe("hotelQualifies", () => {
  it("needs a qualifying Room type", () => {
    expect(hotelQualifies({ policies: allowed }, [], [])).toBe(false);
    expect(hotelQualifies({ policies: allowed }, [family], [])).toBe(true);
  });

  it("needs every Policy criterion allowed", () => {
    expect(hotelQualifies({ policies: allowed }, [family], ["pets", "children"])).toBe(true);
    expect(hotelQualifies({ policies: allowed }, [family], ["pets", "smoking"])).toBe(false);
    expect(
      hotelQualifies({ policies: { ...allowed, petsAllowed: false } }, [family], ["pets"]),
    ).toBe(false);
  });
});

describe("searchMode", () => {
  const interpreted = smartCriteria("quiet", true);

  it("is mvp with no Provider, no Smart criteria, or a Query not interpreted", () => {
    expect(searchMode(false, interpreted)).toBe("mvp");
    expect(searchMode(true, null)).toBe("mvp");
    expect(searchMode(true, smartCriteria("quiet", false))).toBe("mvp");
  });

  it("is smart for an interpreted Query with a Provider", () => {
    expect(searchMode(true, interpreted)).toBe("smart");
  });
});

describe("Criteria chip copy", () => {
  it("writes Max price with non-breaking spaces only inside the amount", () => {
    expect(criterionLabel("maxPrice", 2000)).toBe(`Max R${NBSP}2${NBSP}000 per night`);
  });

  it("names each Policy criterion", () => {
    expect(criterionLabel("pets")).toBe("Pets allowed");
    expect(criterionLabel("children")).toBe("Children allowed");
    expect(criterionLabel("smoking")).toBe("Smoking allowed");
  });

  it("orders the chips Max price, then pets, children and smoking", () => {
    const smart = smartCriteria("q", true, {
      maxPriceRand: 500,
      policies: ["pets", "children", "smoking"],
    });
    expect(criteriaChips(smart).map((chip) => chip.key)).toEqual([
      "maxPrice",
      "pets",
      "children",
      "smoking",
    ]);
    expect(criteriaChips(smartCriteria("q", true))).toEqual([]);
    expect(criteriaChips(null)).toEqual([]);
  });
});

describe("hardCriteriaSummary", () => {
  it("names Policy criteria, then Max price, then the Destination", () => {
    const smart = smartCriteria("q", true, { maxPriceRand: 1999, policies: ["pets"] });
    expect(hardCriteriaSummary("Stellenbosch", smart)).toBe(
      `We looked for Pets allowed and Max R${NBSP}1${NBSP}999 per night in Stellenbosch. Remove a filter, or try other dates or another city.`,
    );
  });

  it("lists several criteria and leaves out an empty Destination", () => {
    const smart = smartCriteria("q", true, { maxPriceRand: 500, policies: ["pets", "smoking"] });
    expect(hardCriteriaSummary(" ", smart)).toBe(
      `We looked for Pets allowed, Smoking allowed and Max R${NBSP}500 per night. Remove a filter, or try other dates or another city.`,
    );
  });

  it("is null with nothing to name", () => {
    expect(hardCriteriaSummary("Durban", smartCriteria("q", true))).toBeNull();
    expect(hardCriteriaSummary("Durban", null)).toBeNull();
  });
});
