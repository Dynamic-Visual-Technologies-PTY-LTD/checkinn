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
  it("UJ-1: only Winelands, priced from its Best-fit Family Room at R 2 000 a night", () => {
    const result = runSmartSearch(db, provider, uj1(), TODAY, NOW);

    expect(result.mode).toBe("smart");
    expect(result.heading).toBe("1 property found");
    expect(result.cards.map((card) => card.name)).toEqual(["Winelands Family Lodge"]);
    expect(result.cards[0]).toMatchObject({ nightlyRand: 2000, totalRand: 4000, nights: 2 });
    expect(result.cards[0].bestFit).toEqual({
      roomTypeId: "hotel-010-family",
      name: "Family Room",
      rooms: 1,
      sleeps: 4,
      nightlyRand: 2000,
      totalRand: 4000,
    });
    expect(result.cards[0].breakdown).toBeUndefined();
    expect(result.criteriaSummary).toBeNull();
    expect(result.notices).toEqual([]);
  });

  it("gives every card a Best-fit room whose prices are the card's", () => {
    const result = runSmartSearch(db, provider, uj1({ policies: [], maxPriceRand: null }), TODAY, NOW);
    expect(result.cards).not.toHaveLength(0);
    for (const card of result.cards) {
      expect(card.bestFit).toBeDefined();
      expect(card.nightlyRand).toBe(card.bestFit?.nightlyRand);
      expect(card.totalRand).toBe(card.bestFit?.totalRand);
    }
  });

  it("with debug, adds the Score breakdown, with meaning and exact words at 0", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({ policies: [], maxPriceRand: null }),
      TODAY,
      NOW,
      { debug: true },
    );
    const winelands = result.cards.find((card) => card.name === "Winelands Family Lodge");
    // Review 4.5 → 0.75; Family Room R 2 000 → 0.5; 0.15 × 0.75 + 0.15 × 0.5.
    expect(winelands?.breakdown).toEqual({
      meaning: 0,
      exact: 0,
      reviewSignal: 0.75,
      priceSignal: 0.5,
      score: 0.1875,
    });
    for (const card of result.cards) expect(card.breakdown).toBeDefined();
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
    expect(winelands?.bestFit).toMatchObject({
      name: "Standard Double",
      rooms: 2,
      sleeps: 4,
      totalRand: 1450 * 2 * 2,
    });
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

  it("orders by the Ranking blend, not the MVP rank", () => {
    // With Relevance 0: Winelands 0.15 × 0.75 + 0.15 × 0.5 = 0.1875 beats
    // Oak & Vine 0.15 × 0.9 + 0.15 × (1 000 / 3 000) = 0.185, though the MVP
    // rank puts Oak & Vine's higher Review score first.
    const criteria = uj1({ policies: [], maxPriceRand: null });
    expect(names(criteria)).toEqual(["Winelands Family Lodge", "Oak & Vine Manor"]);
    expect(searchCatalog(db, criteria, NOW).cards.map((card) => card.name)).toEqual([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
    ]);
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
    const result = runSmartSearch(db, given, criteria, TODAY, NOW, { debug: true });
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
    // No Best-fit room and no Score breakdown, even with debug.
    for (const card of result.cards) {
      expect(card.bestFit).toBeUndefined();
      expect(card.breakdown).toBeUndefined();
    }
  });
});
