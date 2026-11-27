// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { defaultCriteria, smartCriteria } from "@/domain/criteria";
import type { Party, SearchCriteria, SmartCriteria } from "@/domain/types";
import { listCityNames, listInterpretationCatalog } from "@/features/hotels/catalog.repo";
import { interpretationCache } from "@/features/search/cache";
import { createFakeProvider } from "@/features/search/provider/fake";
import { type Provider, ProviderError } from "@/features/search/provider/types";
import { searchCatalog } from "@/features/search/search.repo";
import { interpretQuery, runSmartSearch } from "./smart-search";

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

  it("with debug, adds the Score breakdown, with keyword Relevance as exact words", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({ policies: [], maxPriceRand: null }),
      TODAY,
      NOW,
      { debug: true },
    );
    const winelands = result.cards.find((card) => card.name === "Winelands Family Lodge");
    // "family" is its category: Relevance 1. Review 4.5 → 0.75; Family Room
    // R 2 000 → 0.5; 0.7 × 1 + 0.15 × 0.75 + 0.15 × 0.5.
    expect(winelands?.breakdown).toEqual({
      meaning: 0,
      exact: 1,
      reviewSignal: 0.75,
      priceSignal: 0.5,
      score: 0.8875,
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
    expect(result.cards).toHaveLength(6);
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

  it("No pets: Everyday Suites joins Winelands, as Oak & Vine has nothing at R 2 000 for 4", () => {
    expect(names(uj1({ policies: [] }))).toEqual([
      "Winelands Family Lodge",
      "Stellenbosch Everyday Suites",
    ]);
  });

  it("No filters: every Stellenbosch Hotel with a Room type for 4", () => {
    expect(names(uj1({ policies: [], maxPriceRand: null })).sort()).toEqual([
      "Oak & Vine Manor",
      "Stellenbosch Everyday Suites",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
      "Winelands Family Lodge",
    ]);
  });

  it("orders by the Ranking blend, not the MVP rank", () => {
    // With Relevance 0: Winelands 0.15 × 0.75 + 0.15 × 0.5 = 0.1875 beats
    // Oak & Vine 0.15 × 0.9 + 0.15 × (1 000 / 3 000) = 0.185, though the MVP
    // rank puts Oak & Vine's higher Review score first.
    const criteria = uj1({ policies: [], maxPriceRand: null, preferences: null });
    expect(names(criteria)).toEqual([
      "Winelands Family Lodge",
      "Oak & Vine Manor",
      "Stellenbosch Everyday Suites",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
    ]);
    expect(searchCatalog(db, criteria, NOW).cards.map((card) => card.name).slice(0, 2)).toEqual([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
    ]);
  });

  it("puts Hotels that show the Preferences first: family lodges before Oak & Vine", () => {
    // Winelands is a family Hotel; Fieldstone and Meadow House are lodges
    // "for families". Oak & Vine and Everyday Suites show no family concept.
    expect(names(uj1({ policies: [], maxPriceRand: null }))).toEqual([
      "Winelands Family Lodge",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
      "Oak & Vine Manor",
      "Stellenbosch Everyday Suites",
    ]);
  });

  it("business with a gym and meeting rooms: Johannesburg's business Hotels first", () => {
    const criteria: SearchCriteria = {
      ...defaultCriteria(TODAY),
      q: "Johannesburg",
      stay: weekend,
      smart: smartCriteria("business hotel in Johannesburg", true, {
        preferences: "business hotel with a gym and meeting rooms",
      }),
    };
    expect(names(criteria).slice(0, 2)).toEqual([
      "Goldleaf Business Hotel",
      "Johannesburg Workday House",
    ]);
  });

  it("picks the Best-fit room the Preferences name, not the cheapest", () => {
    const criteria = uj1({ policies: [], maxPriceRand: null, preferences: "a twin room" }, {
      party: { adults: 2, children: 0, rooms: 1 },
    });
    const stillwater = runSmartSearch(db, provider, criteria, TODAY, NOW).cards.find(
      (card) => card.name === "Stellenbosch Stillwater Retreat",
    );
    expect(stillwater?.bestFit?.name).toBe("Retreat Twin");
  });

  it("Pets and smoking: no Hotel allows both, and the summary names them", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({ policies: ["pets", "smoking"], maxPriceRand: null }, { q: "" }),
      TODAY,
      NOW,
    );
    expect(result.cards).toEqual([]);
    expect(result.criteriaSummary).toBe(
      "We looked for Pets allowed and Smoking allowed. Remove a filter, or try other dates or another city.",
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
    // The MVP search ignores the Hard criteria and the Party.
    expect(result.cards.map((card) => card.name).sort()).toEqual([
      "Oak & Vine Manor",
      "Stellenbosch Everyday Suites",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
      "Stellenbosch Stillwater Retreat",
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

describe("runSmartSearch in fallback mode", () => {
  const twoAdults: Party = { adults: 2, children: 0, rooms: 1 };
  const unknown = (values: Partial<SmartCriteria> = {}) =>
    smartCriteria("a castle on the moon", false, { fallback: true, ...values });

  it("Unknown Query from Home: all 120 properties, as MVP cards, with the notice", () => {
    const criteria: SearchCriteria = {
      ...defaultCriteria(TODAY),
      stay: weekend,
      party: twoAdults,
      smart: unknown(),
    };
    const result = runSmartSearch(db, provider, criteria, TODAY, NOW, { debug: true });

    expect(result.mode).toBe("fallback");
    expect(result.heading).toBe("All destinations: 120 properties found");
    expect(result.notices).toEqual([{ kind: "fallback" }]);
    expect(result.criteriaSummary).toBeNull();
    // With no Hard criteria but the Party's, the MVP search's Hotels for 2
    // adults, each priced from a Room type that sleeps 2, not a single Room.
    const mvp = searchCatalog(db, { ...criteria, smart: null }, NOW).cards;
    const ids = (cards: { hotelId: string }[]) => cards.map((card) => card.hotelId).sort();
    expect(ids(result.cards)).toEqual(ids(mvp));
    for (const card of result.cards) {
      expect(card.bestFit).toBeUndefined();
      expect(card.breakdown).toBeUndefined();
    }
  });

  it("filters by the Hard criteria the URL holds, priced from the cheapest qualifying type", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({}, { smart: unknown({ maxPriceRand: 2000, policies: ["pets"] }) }),
      TODAY,
      NOW,
    );
    expect(result.mode).toBe("fallback");
    expect(result.cards.map((card) => card.name)).toEqual(["Winelands Family Lodge"]);
    expect(result.cards[0]).toMatchObject({ nightlyRand: 2000, totalRand: 4000 });
    expect(result.cards[0].bestFit).toBeUndefined();
  });

  it("orders by the MVP rank, not the Ranking blend", () => {
    expect(names(uj1({}, { smart: unknown() }))).toEqual([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
      "Stellenbosch Everyday Suites",
    ]);
  });

  it("filters by Party capacity, which the MVP search ignores", () => {
    const criteria = uj1({}, { party: { adults: 6, children: 0, rooms: 1 }, smart: unknown() });
    const fallback = runSmartSearch(db, provider, criteria, TODAY, NOW);
    const mvp = searchCatalog(db, { ...criteria, smart: null }, NOW);
    expect(fallback.cards.length).toBeLessThan(mvp.cards.length);
  });

  it("takes priority over interpreted", () => {
    const result = runSmartSearch(db, provider, uj1({ fallback: true }), TODAY, NOW);
    expect(result.mode).toBe("fallback");
    expect(result.notices[0]).toEqual({ kind: "fallback" });
    expect(result.cards.every((card) => card.bestFit === undefined)).toBe(true);
  });

  it("names the Hard criteria when nothing is found", () => {
    const result = runSmartSearch(
      db,
      provider,
      uj1({}, { q: "", smart: unknown({ policies: ["pets", "smoking"] }) }),
      TODAY,
      NOW,
    );
    expect(result.heading).toBeNull();
    expect(result.cards).toEqual([]);
    expect(result.criteriaSummary).toBe(
      "We looked for Pets allowed and Smoking allowed. Remove a filter, or try other dates or another city.",
    );
  });

  it("is mvp with no Provider", () => {
    const result = runSmartSearch(db, null, uj1({}, { smart: unknown() }), TODAY, NOW);
    expect(result.mode).toBe("mvp");
    expect(result.notices).toEqual([]);
  });
});

describe("interpretQuery (AD-22, AD-28)", () => {
  const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
  const current = { q: "", stay: weekend, party: { adults: 2, children: 0, rooms: 1 } };
  const catalog = () => ({ cities: listCityNames(db), hotels: listInterpretationCatalog(db) });
  const fake = createFakeProvider();
  const signal = () => new AbortController().signal;

  beforeEach(() => interpretationCache.clear());
  afterEach(() => interpretationCache.clear());

  function counting(interpret: Provider["interpret"]) {
    const spy = vi.fn(interpret);
    return { provider: { ...fake, interpret: spy } satisfies Provider, spy };
  }

  it("makes one Provider call for the same normalised Query on the same day", async () => {
    const { provider, spy } = counting(fake.interpret);
    const first = await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    const again = `  ${UJ1.toUpperCase()} `;
    const second = await interpretQuery(provider, again, current, catalog(), TODAY, signal());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(first.q).toBe("Stellenbosch");
  });

  it("still applies the interpretation to each submit's own criteria", async () => {
    const { provider, spy } = counting(fake.interpret);
    const query = "quiet business hotel in Gauteng with a gym and meeting rooms";
    await interpretQuery(provider, query, current, catalog(), TODAY, signal());
    const other = { ...current, party: { adults: 3, children: 0, rooms: 1 } };
    const second = await interpretQuery(provider, query, other, catalog(), TODAY, signal());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(second.party.adults).toBe(3);
  });

  it("shares one call between concurrent identical submits", async () => {
    const { provider, spy } = counting(fake.interpret);
    await Promise.all([
      interpretQuery(provider, UJ1, current, catalog(), TODAY, signal()),
      interpretQuery(provider, UJ1, current, catalog(), TODAY, signal()),
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("never caches a rejection", async () => {
    let calls = 0;
    const { provider, spy } = counting(async (...args) => {
      calls += 1;
      if (calls === 1) throw new ProviderError("RATE_LIMITED");
      return fake.interpret(...args);
    });
    await expect(
      interpretQuery(provider, UJ1, current, catalog(), TODAY, signal()),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("calls again on a different day", async () => {
    const { provider, spy } = counting(fake.interpret);
    await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    await interpretQuery(provider, UJ1, current, catalog(), "2026-10-14", signal());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("rejects with TIMEOUT when the signal aborts, even if the Provider ignores it", async () => {
    const { provider } = counting(() => new Promise(() => {}));
    const error = await interpretQuery(
      provider,
      UJ1,
      current,
      catalog(),
      TODAY,
      AbortSignal.timeout(20),
    ).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: "TIMEOUT" });
  });

  it("evicts a timed-out call, so the next submit calls again and caches its success", async () => {
    let calls = 0;
    const { provider, spy } = counting((...args) => {
      calls += 1;
      return calls === 1 ? new Promise(() => {}) : fake.interpret(...args);
    });
    await expect(
      interpretQuery(provider, UJ1, current, catalog(), TODAY, AbortSignal.timeout(20)),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(interpretationCache.size).toBe(0);

    const second = await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    expect(second.q).toBe("Stellenbosch");
    await interpretQuery(provider, UJ1, current, catalog(), TODAY, signal());
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("rejects with TIMEOUT at once for an aborted signal, with no Provider call", async () => {
    const controller = new AbortController();
    controller.abort();
    const { provider, spy } = counting(fake.interpret);
    await expect(
      interpretQuery(provider, UJ1, current, catalog(), TODAY, controller.signal),
    ).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(spy).not.toHaveBeenCalled();
    expect(interpretationCache.size).toBe(0);
  });
});
