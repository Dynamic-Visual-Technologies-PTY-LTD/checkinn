// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { defaultCriteria, smartCriteria } from "@/domain/criteria";
import type { Party, SearchCriteria, SmartCriteria } from "@/domain/types";
import { createFakeProvider } from "@/features/search/provider/fake";
import { searchCatalog } from "@/features/search/search.repo";
import { runSmartSearch } from "./smart-search";

const NBSP = " ";
const TODAY = "2026-10-13";
const NOW = "2026-10-13T08:00:00.000Z";
const weekend = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const provider = createFakeProvider({ interpretations: {}, reasons: {} });

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.$client.close();
});

const fourAdults: Party = { adults: 4, children: 0, rooms: 1 };

/** The UJ-1 criteria: Stellenbosch, 4 adults, 1 Room, Max R 2 000, pets. */
function uj1(
  smart: Partial<SmartCriteria> = {},
  overrides: Partial<SearchCriteria> = {},
): SearchCriteria {
  return {
    ...defaultCriteria(TODAY),
    q: "Stellenbosch",
    stay: weekend,
    party: fourAdults,
    smart: smartCriteria("pet friendly family place in Stellenbosch for 4", true, {
      preferences: "pet friendly family place",
      maxPriceRand: 2000,
      policies: ["pets"],
      ...smart,
    }),
    ...overrides,
  };
}

const names = (criteria: SearchCriteria) =>
  runSmartSearch(db, provider, criteria, TODAY, NOW).cards.map((card) => card.name);

describe("runSmartSearch in smart mode", () => {
  it("UJ-1: only Winelands, priced from its Family Room at R 2 000 a night", () => {
    const result = runSmartSearch(db, provider, uj1(), TODAY, NOW);

    expect(result.mode).toBe("smart");
    expect(result.heading).toBe("1 property found");
    expect(result.cards.map((card) => card.name)).toEqual(["Winelands Family Lodge"]);
    expect(result.cards[0]).toMatchObject({ nightlyRand: 2000, totalRand: 4000, nights: 2 });
    expect(result.criteriaSummary).toBeNull();
    expect(result.notices).toEqual([]);
  });

  it("Price edge: Max R 1 999 finds nothing and names the Hard criteria", () => {
    const result = runSmartSearch(db, provider, uj1({ maxPriceRand: 1999 }), TODAY, NOW);

    expect(result.cards).toEqual([]);
    expect(result.heading).toBeNull();
    expect(result.criteriaSummary).toBe(
      `We looked for Pets allowed and Max R${NBSP}1${NBSP}999 per night in Stellenbosch. Remove a filter, or try other dates or another city.`,
    );
  });

  it("Capacity across Rooms: a Standard Room × 2 sleeps 4", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1(
        { maxPriceRand: null, policies: [] },
        { party: { adults: 4, children: 0, rooms: 2 } },
      ),
      TODAY,
      NOW,
    );
    const winelands = result.cards.find((card) => card.name === "Winelands Family Lodge");
    expect(result.cards).toHaveLength(2);
    // Priced from the Standard Double, the cheapest qualifying Room type.
    expect(winelands).toMatchObject({ nightlyRand: 1450, totalRand: 1450 * 2 * 2 });
  });

  it("Availability: a Room type with fewer free Rooms than asked for does not qualify", () => {
    insertTestBooking(db, {
      hotelId: "hotel-010",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-010-family", quantity: 4 }],
    });
    expect(names(uj1())).toEqual([]);
  });

  it("No pets: Winelands stays alone, as Oak & Vine has nothing at R 2 000 for 4", () => {
    expect(names(uj1({ policies: [] }))).toEqual(["Winelands Family Lodge"]);
  });

  it("No filters: Oak & Vine and Winelands", () => {
    expect(names(uj1({ policies: [], maxPriceRand: null })).sort()).toEqual([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
    ]);
  });

  it("orders with the MVP rank", () => {
    const criteria = uj1({ policies: [], maxPriceRand: null });
    const result = runSmartSearch(db, provider, criteria, TODAY, NOW);
    const scores = result.cards.map((card) => card.reviewScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it("Smoking: no Hotel allows it, and the summary names it", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({ policies: ["smoking"], maxPriceRand: null }, { q: "" }),
      TODAY,
      NOW,
    );
    expect(result.cards).toEqual([]);
    expect(result.criteriaSummary).toBe(
      "We looked for Smoking allowed. Remove a filter, or try other dates or another city.",
    );
  });

  it("keeps the Smart search notices", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({ place: "Kruger", policies: [], maxPriceRand: null }, { q: "" }),
      TODAY,
      NOW,
    );
    expect(result.notices).toEqual([{ kind: "place", place: "Kruger" }]);
  });
});

describe("runSmartSearch in mvp mode", () => {
  const cases: [string, Parameters<typeof runSmartSearch>[1], SearchCriteria][] = [
    ["no Provider", null, uj1()],
    ["no Smart criteria", provider, uj1({}, { smart: null })],
    ["a Query not interpreted", provider, uj1({ interpreted: false })],
  ];

  it.each(cases)("is the MVP search, unchanged, with %s", (_, given, criteria) => {
    const result = runSmartSearch(db, given, criteria, TODAY, NOW);
    expect(result).toEqual({
      ...searchCatalog(db, criteria, NOW),
      mode: "mvp",
      criteriaSummary: null,
    });
    // The MVP search ignores the Hard criteria.
    expect(result.cards.map((card) => card.name).sort()).toEqual([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
    ]);
    expect(result.notices).toEqual([]);
  });
});
