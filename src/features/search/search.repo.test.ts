// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb, insertTestBooking } from "@/db/test-db";
import { defaultCriteria } from "@/domain/criteria";
import type { SearchCriteria } from "@/domain/types";
import { formatZar, stayPriceLine } from "@/lib/format";
import { searchCatalog } from "./search.repo";

let db: Db;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  db.$client.close();
});

const weekend = { checkIn: "2026-11-13", checkOut: "2026-11-15" };

/** Well before the weekend's free-cancellation deadline (2026-11-11T12:00Z). */
const NOW = "2026-10-13T08:00:00.000Z";

function criteria(overrides: Partial<SearchCriteria>): SearchCriteria {
  return { ...defaultCriteria("2026-10-13"), stay: weekend, ...overrides };
}

describe("searchCatalog", () => {
  it("finds the 2 Cape Town Hotels, Harbourlight first, priced for the Stay", () => {
    const result = searchCatalog(db, criteria({ q: "Cape Town" }), NOW);

    expect(result.heading).toBe("Cape Town: 2 properties found");
    expect(result.cards.map((card) => card.name)).toEqual([
      "Harbourlight Retreat",
      "Table View City Lodge",
    ]);
    const [first] = result.cards;
    expect(first).toEqual({
      hotelId: "hotel-001",
      name: "Harbourlight Retreat",
      category: "luxury",
      starRating: 5,
      area: "V&A Waterfront",
      cityName: "Cape Town",
      reviewScore: 4.8,
      reviewLabel: "Superb",
      reviewCount: 248,
      facilities: ["Swimming pool", "Spa", "Restaurant"],
      cancellation: { kind: "non-refundable", text: "Non-refundable. This booking can't be cancelled." },
      firstImage: { url: expect.any(String), alt: expect.any(String) },
      nights: 2,
      adults: 2,
      totalRand: 4900,
      nightlyRand: 2450,
    });
    expect(stayPriceLine(first.nights, first.adults, first.totalRand)).toBe(
      `2 nights, 2 adults: from ${formatZar(4900)}`,
    );
    expect(formatZar(first.nightlyRand)).toBe("R 2 450");
  });

  it("matches provinces, trims the Destination, and breaks a score tie on price", () => {
    const result = searchCatalog(db, criteria({ q: " cape " }), NOW);

    expect(result.heading).toBe("6 properties found");
    expect(result.cards).toHaveLength(6);
    const names = result.cards.map((card) => card.name);
    expect(names.slice(0, 2)).toEqual(["Oak & Vine Manor", "Harbourlight Retreat"]);
    expect(new Set(result.cards.map((card) => card.cityName))).toEqual(
      new Set(["Cape Town", "Stellenbosch", "Gqeberha"]),
    );
  });

  it("lists all 12 Hotels for an empty Destination, in rank order", () => {
    const result = searchCatalog(db, criteria({ q: "" }), NOW);

    expect(result.heading).toBe("All destinations: 12 properties found");
    expect(result.cards).toHaveLength(12);
    for (let i = 1; i < result.cards.length; i++) {
      const [a, b] = [result.cards[i - 1], result.cards[i]];
      expect(
        a.reviewScore > b.reviewScore ||
          (a.reviewScore === b.reviewScore && a.nightlyRand <= b.nightlyRand),
      ).toBe(true);
    }
  });

  it("reads 1 property found for a single result", () => {
    const result = searchCatalog(db, criteria({ q: "Waterfront" }), NOW);

    expect(result.cards.map((card) => card.hotelId)).toEqual(["hotel-001"]);
    expect(result.heading).toBe("1 property found");
  });

  it("returns no cards and no heading when nothing matches", () => {
    expect(searchCatalog(db, criteria({ q: "Bloemfontein" }), NOW)).toEqual({
      heading: null,
      cards: [],
      notices: [],
    });
  });

  it("runs no search when the Stay is null", () => {
    expect(searchCatalog(db, criteria({ q: "Cape Town", stay: null }), NOW)).toEqual({
      heading: null,
      cards: [],
      notices: [],
    });
  });

  it("prices the card for the Party's Rooms, and never hides a Hotel for Party size", () => {
    const party = { adults: 10, children: 6, rooms: 2 };
    const result = searchCatalog(db, criteria({ q: "Harbourlight", party }), NOW);

    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({ adults: 10, nightlyRand: 2450, totalRand: 9800 });
  });

  it("prices Table View from its Standard, since its Family Room has no inventory", () => {
    const [tableView] = searchCatalog(db, criteria({ q: "Table View" }), NOW).cards;

    expect(tableView).toMatchObject({
      nightlyRand: 950,
      totalRand: 1900,
      cancellation: { kind: "free", until: "until Wed 11 Nov 2026, 14:00" },
      facilities: ["Free parking", "Air conditioning"],
    });
  });

  it("says a Free cancellation Hotel's offer has ended once the deadline has passed", () => {
    const [tableView] = searchCatalog(
      db,
      criteria({ q: "Table View" }),
      "2026-11-11T12:00:00.000Z",
    ).cards;

    expect(tableView.cancellation).toEqual({
      kind: "ended",
      text: "Free cancellation ended on Wed 11 Nov 2026, 14:00.",
    });
  });

  it("excludes a Hotel whose Room types are all booked on one Night of the Stay", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: { checkIn: "2026-11-14", checkOut: "2026-11-15" },
      lines: [
        { roomTypeId: "hotel-001-standard", quantity: 10 },
        { roomTypeId: "hotel-001-family", quantity: 4 },
      ],
    });

    const result = searchCatalog(db, criteria({ q: "Cape Town" }), NOW);

    expect(result.cards.map((card) => card.name)).toEqual(["Table View City Lodge"]);
    expect(result.heading).toBe("1 property found");
  });

  it("excludes Table View once its Standard is full, as the empty Family Room never counts", () => {
    insertTestBooking(db, {
      hotelId: "hotel-002",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-002-standard", quantity: 11 }],
    });

    const names = searchCatalog(db, criteria({ q: "Cape Town" }), NOW).cards.map((card) => card.name);

    expect(names).toEqual(["Harbourlight Retreat"]);
  });

  it("prices from the next Room type when the cheapest is full", () => {
    insertTestBooking(db, {
      hotelId: "hotel-001",
      stay: weekend,
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 10 }],
    });

    const [card] = searchCatalog(db, criteria({ q: "Harbourlight" }), NOW).cards;

    expect(card).toMatchObject({ nightlyRand: 3000, totalRand: 6000 });
  });
});
