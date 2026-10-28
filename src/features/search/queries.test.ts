// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { defaultCriteria, smartCriteria } from "@/domain/criteria";
import type { SearchCriteria } from "@/domain/types";
import { createFakeProvider } from "@/features/search/provider/fake";

const mocks = vi.hoisted(() => ({
  db: undefined as unknown,
  provider: null as unknown,
  env: {} as Record<string, string | undefined>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ io: async () => {} }));
vi.mock("@/db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db/client")>()),
  getDb: () => mocks.db,
}));
vi.mock("@/features/search/provider/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/search/provider/config")>();
  return {
    getProvider: () => mocks.provider,
    searchDebug: () => actual.searchDebug(mocks.env),
  };
});
vi.mock("@/domain/clock", () => ({
  todayIn: () => "2026-10-13",
  nowIso: () => "2026-10-13T08:00:00.000Z",
}));

import { searchHotels } from "./queries";

let db: Db;

beforeAll(() => {
  db = createTestDb();
  mocks.db = db;
});
beforeEach(() => {
  mocks.provider = createFakeProvider({ interpretations: {}, reasons: {} });
  mocks.env = {};
});
afterAll(() => {
  db.$client.close();
});

function criteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return {
    ...defaultCriteria("2026-10-13"),
    stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
    ...overrides,
  };
}

describe("searchHotels notices", () => {
  it("gives none for an MVP search", async () => {
    expect((await searchHotels(criteria())).notices).toEqual([]);
  });

  it("gives the place notice, then the ignored value, with all destinations", async () => {
    const result = await searchHotels(
      criteria({
        smart: smartCriteria("relaxed lodge near Kruger", true, {
          place: "Kruger",
          ignored: "for 0",
          ignoredKind: "party",
        }),
      }),
    );
    expect(result.heading).toBe("All destinations: 120 properties found");
    expect(result.notices).toEqual([
      { kind: "place", place: "Kruger" },
      { kind: "ignored", text: "for 0", about: "party" },
    ]);
  });

  it("gives no place notice for a crafted URL with a Destination", async () => {
    const result = await searchHotels(
      criteria({ q: "Durban", smart: smartCriteria("quiet", true, { place: "Kruger" }) }),
    );
    expect(result.notices).toEqual([]);
  });
});

describe("searchHotels goes through runSmartSearch (AD-20)", () => {
  const uj1 = () =>
    criteria({
      q: "Stellenbosch",
      party: { adults: 4, children: 0, rooms: 1 },
      smart: smartCriteria("pet friendly family place", true, {
        maxPriceRand: 2000,
        policies: ["pets"],
      }),
    });

  it("filters by the Hard criteria with a Provider", async () => {
    const result = await searchHotels(uj1());
    expect(result.mode).toBe("smart");
    expect(result.cards.map((card) => card.name)).toEqual(["Winelands Family Lodge"]);
  });

  it("adds no Score breakdown without CHECKINN_SEARCH_DEBUG=1", async () => {
    for (const value of [undefined, "0", "true", " 1"]) {
      mocks.env = { CHECKINN_SEARCH_DEBUG: value };
      const result = await searchHotels(uj1());
      expect(result.cards[0].breakdown).toBeUndefined();
    }
  });

  it("adds the Score breakdown with CHECKINN_SEARCH_DEBUG=1", async () => {
    mocks.env = { CHECKINN_SEARCH_DEBUG: "1" };
    const result = await searchHotels(uj1());
    expect(result.cards[0].breakdown).toMatchObject({ meaning: 0, exact: 0 });
  });

  it("is the MVP search without a Provider", async () => {
    mocks.provider = null;
    const result = await searchHotels(uj1());
    expect(result.mode).toBe("mvp");
    expect(result.cards).toHaveLength(6);
    expect(result.criteriaSummary).toBeNull();
  });
});
