// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadSeed } from "@/db/seed";
import { smartCriteria } from "@/domain/criteria";
import {
  applyInterpretation,
  type InterpretationHotel,
  type SearchBarCriteria,
  smartNotices,
} from "./interpretation";

/** Thu 15 Oct 2026, the PRD's "today". */
const today = "2026-10-15";
const current: SearchBarCriteria = {
  q: "Cape Town",
  stay: { checkIn: "2026-10-16", checkOut: "2026-10-17" },
  party: { adults: 2, children: 0, rooms: 1 },
};

function seedCatalog(): { hotels: InterpretationHotel[] } {
  const seed = loadSeed();
  return {
    hotels: seed.hotels.map((hotel) => {
      const city = seed.cities.find((c) => c.id === hotel.cityId)!;
      return {
        name: hotel.name,
        area: hotel.area,
        cityName: city.name,
        cityAliases: city.aliases,
        province: city.province,
        roomTypes: hotel.roomTypes.map((type) => ({ maxGuests: type.maxGuests })),
      };
    }),
  };
}
const catalog = seedCatalog();

function apply(raw: unknown, from: SearchBarCriteria = current) {
  return applyInterpretation(raw, from, catalog, today);
}

/** The UJ-1 fixture: no absolute dates. */
const uj1 = {
  destination: "Stellenbosch",
  outOfCatalogPlace: null,
  relativeStay: "next-weekend",
  checkIn: null,
  checkOut: null,
  stayPhrase: "next weekend",
  adults: 4,
  children: null,
  rooms: null,
  partyPhrase: "for 4",
  maxPrice: 2000,
  petsAllowed: true,
  childrenAllowed: null,
  smokingAllowed: null,
  preferences: "pet friendly family place",
};

const nothing = {
  preferences: null,
  maxPriceRand: null,
  policies: [],
  place: null,
  ignored: null,
  ignoredKind: "dates",
};

describe("applyInterpretation", () => {
  it("applies UJ-1: Stellenbosch, next weekend, 4 adults in 1 Room, Max price, pets, Preferences", () => {
    expect(apply(uj1)).toEqual({
      q: "Stellenbosch",
      stay: { checkIn: "2026-10-23", checkOut: "2026-10-25" },
      party: { adults: 4, children: 0, rooms: 1 },
      preferences: "pet friendly family place",
      maxPriceRand: 2000,
      policies: ["pets"],
      place: null,
      ignored: null,
      ignoredKind: "dates",
    });
  });

  describe("Destination", () => {
    it("starts empty when none is stated", () => {
      expect(apply({ destination: null }).q).toBe("");
      expect(apply({ destination: "   " }).q).toBe("");
      expect(apply({}).q).toBe("");
    });

    it("is trimmed", () => {
      expect(apply({ destination: " Durban " }).q).toBe("Durban");
    });

    it.each([
      ["Joburg", "Johannesburg"],
      ["Jozi", "Johannesburg"],
      ["PE", "Gqeberha"],
      ["Cape", "Cape Town"],
      ["Durbs", "Durban"],
    ])("maps the nickname %j to %s", (nickname, city) => {
      expect(apply({ destination: nickname })).toMatchObject({ q: city, place: null });
    });

    it("keeps an area, a province or a Hotel name, with no place notice", () => {
      for (const destination of ["Sandton", "Gauteng", "Winelands", "Oak & Vine Manor"]) {
        expect(apply({ destination })).toMatchObject({ q: destination, place: null });
      }
    });

    it("leaves an out-of-catalog Destination empty, names the place and adds it to the Preferences", () => {
      expect(
        apply({ destination: "Kruger", preferences: "relaxed lodge with a pool" }),
      ).toMatchObject({ q: "", place: "Kruger", preferences: "relaxed lodge with a pool Kruger" });
    });

    it("uses outOfCatalogPlace the same way", () => {
      expect(
        apply({
          destination: null,
          outOfCatalogPlace: "Kruger",
          preferences: "relaxed lodge with a pool",
        }),
      ).toMatchObject({ q: "", place: "Kruger", preferences: "relaxed lodge with a pool Kruger" });
      expect(apply({ outOfCatalogPlace: "Kruger" })).toMatchObject({
        place: "Kruger",
        preferences: "Kruger",
      });
    });

    it("names no place when the Destination is in the catalog", () => {
      expect(apply({ destination: "Durban", outOfCatalogPlace: "Kruger" })).toMatchObject({
        q: "Durban",
        place: null,
      });
    });

    it("drops a place that is not plain notice text", () => {
      expect(apply({ destination: "<script>", preferences: "quiet" })).toMatchObject({
        q: "",
        place: null,
        preferences: "quiet",
      });
    });

    it("keeps the Preferences with the place at most 300 characters", () => {
      const result = apply({ destination: "Kruger", preferences: "a".repeat(297) });
      expect(result.preferences).toBe(`${"a".repeat(297)} Kr`);
      expect(apply({ preferences: "b".repeat(400) }).preferences).toHaveLength(300);
    });
  });

  describe("Stay", () => {
    it("replaces the Stay with valid absolute dates", () => {
      const stay = { checkIn: "2026-10-23", checkOut: "2026-10-25" };
      expect(apply(stay)).toMatchObject({ stay, ignored: null });
    });

    it.each([
      ["this-weekend", { checkIn: "2026-10-16", checkOut: "2026-10-18" }],
      ["next-weekend", { checkIn: "2026-10-23", checkOut: "2026-10-25" }],
      ["tonight", { checkIn: "2026-10-15", checkOut: "2026-10-16" }],
    ])("resolves %s against today", (relativeStay, stay) => {
      expect(apply({ relativeStay }).stay).toEqual(stay);
    });

    it("resolves this weekend on a Saturday and a Sunday", () => {
      expect(applyInterpretation({ relativeStay: "this-weekend" }, current, catalog, "2026-10-17").stay)
        .toEqual({ checkIn: "2026-10-17", checkOut: "2026-10-18" });
      expect(applyInterpretation({ relativeStay: "this-weekend" }, current, catalog, "2026-10-18").stay)
        .toEqual({ checkIn: "2026-10-18", checkOut: "2026-10-19" });
    });

    it("lets a relative Stay win over the model's dates", () => {
      expect(
        apply({ relativeStay: "tonight", checkIn: "2026-11-01", checkOut: "2026-11-03" }).stay,
      ).toEqual({ checkIn: "2026-10-15", checkOut: "2026-10-16" });
    });

    it("keeps the current Stay and names the phrase for unusable dates", () => {
      expect(
        apply({ checkIn: "2026-10-12", checkOut: "2026-10-13", stayPhrase: "last Tuesday" }),
      ).toMatchObject({ stay: current.stay, ignored: "last Tuesday", ignoredKind: "dates" });
    });

    it("keeps the current Stay for every kind of unusable date", () => {
      for (const stay of [
        { checkIn: "2026-10-10", checkOut: "2026-10-12" },
        { checkIn: "2026-10-25", checkOut: "2026-10-23" },
        { checkIn: "2026-02-30", checkOut: "2026-03-02" },
        { checkIn: "2026-10-23", checkOut: "2027-10-23" },
        { checkIn: "2026-10-23", checkOut: null },
        { checkIn: 20261023, checkOut: 20261025 },
        { relativeStay: "next-month" },
      ]) {
        expect(apply({ ...stay, stayPhrase: "then" })).toMatchObject({
          stay: current.stay,
          ignored: "then",
        });
      }
    });

    it("keeps the current Stay with no notice when no Stay is stated", () => {
      expect(apply({ stayPhrase: "whenever" })).toMatchObject({ stay: current.stay, ignored: null });
      expect(apply({}, { ...current, stay: null }).stay).toBeNull();
    });

    it("names nothing when the phrase cannot go in a notice", () => {
      expect(apply({ checkIn: "2026-10-12", checkOut: "2026-10-13", stayPhrase: "<b>" })).toMatchObject(
        { stay: current.stay, ignored: null },
      );
    });
  });

  describe("Party and Rooms", () => {
    it("replaces the whole Party when adults are stated, children defaulting to 0", () => {
      expect(apply({ adults: 3, children: null }, { ...current, party: { adults: 2, children: 1, rooms: 1 } }).party)
        .toEqual({ adults: 3, children: 0, rooms: 1 });
    });

    it("keeps the current adults when only children are stated", () => {
      expect(apply({ children: 2 }).party).toEqual({ adults: 2, children: 2, rooms: 1 });
    });

    it("keeps the current Party, Rooms included, when the Query states none", () => {
      const from = { ...current, party: { adults: 3, children: 1, rooms: 2 } };
      expect(apply({ adults: null, children: null }, from).party).toEqual(from.party);
    });

    it("keeps the current Party and names the phrase for an unusable Party", () => {
      expect(apply({ adults: 0, partyPhrase: "for 0" })).toMatchObject({
        party: current.party,
        ignored: "for 0",
        ignoredKind: "party",
      });
      for (const party of [{ adults: 11 }, { adults: 2, children: 7 }, { children: -1 }, { adults: "4" }, { children: 1.5 }]) {
        expect(apply(party).party).toEqual(current.party);
      }
    });

    it("names only the Stay when both the Stay and the Party are unusable", () => {
      expect(
        apply({
          checkIn: "2026-10-12",
          checkOut: "2026-10-13",
          stayPhrase: "last Tuesday",
          adults: 0,
          partyPhrase: "for 0",
        }),
      ).toMatchObject({ ignored: "last Tuesday", ignoredKind: "dates" });
    });

    it("uses stated Rooms, capped by the adults and the codec limit", () => {
      expect(apply({ adults: 4, rooms: 2 }).party).toEqual({ adults: 4, children: 0, rooms: 2 });
      expect(apply({ adults: 2, rooms: 4 }).party.rooms).toBe(2);
      expect(apply({ adults: 10, rooms: 8 }).party.rooms).toBe(5);
      expect(apply({ rooms: 2 }).party).toEqual({ adults: 2, children: 0, rooms: 2 });
    });

    it("ignores Rooms that are not a whole number of at least 1", () => {
      for (const rooms of [0, -1, 1.5, "2"]) {
        expect(apply({ adults: 4, rooms }).party.rooms).toBe(1);
      }
    });

    it("raises Rooms to fit a stated Party with the Destination's Room types", () => {
      expect(apply({ destination: "Durban", adults: 7 }).party).toEqual({
        adults: 7,
        children: 0,
        rooms: 2,
      });
      expect(apply({ adults: 2, children: 5 }).party.rooms).toBe(2);
    });

    it("lowers the current Rooms for a smaller stated Party", () => {
      const from = { ...current, party: { adults: 4, children: 0, rooms: 2 } };
      expect(apply({ adults: 2 }, from).party).toEqual({ adults: 2, children: 0, rooms: 1 });
    });

    it("keeps the current Rooms, capped by adults, when the catalog has no Room types", () => {
      const from = { ...current, party: { adults: 2, children: 0, rooms: 2 } };
      expect(applyInterpretation({ adults: 3 }, from, { hotels: [] }, today).party).toEqual({
        adults: 3,
        children: 0,
        rooms: 2,
      });
    });
  });

  describe("Max price, Policy criteria and Preferences", () => {
    it("keeps a positive whole Max price only", () => {
      expect(apply({ maxPrice: 2000 }).maxPriceRand).toBe(2000);
      for (const maxPrice of [0, -5, 1.5, "2000", null, Number.POSITIVE_INFINITY]) {
        expect(apply({ maxPrice }).maxPriceRand).toBeNull();
      }
    });

    it("sets each Policy criterion that is exactly true, in chip order", () => {
      expect(apply({ smokingAllowed: true, petsAllowed: true, childrenAllowed: true }).policies).toEqual(
        ["pets", "children", "smoking"],
      );
      expect(apply({ petsAllowed: false, childrenAllowed: "true", smokingAllowed: 1 }).policies).toEqual(
        [],
      );
    });

    it("trims the Preferences and leaves empty ones null", () => {
      expect(apply({ preferences: "  quiet   pool " }).preferences).toBe("quiet pool");
      expect(apply({ preferences: "  " }).preferences).toBeNull();
      expect(apply({ preferences: 42 }).preferences).toBeNull();
    });
  });

  it("never throws on output that is not an object", () => {
    for (const raw of [null, undefined, "Stellenbosch", 4, [uj1], true]) {
      expect(apply(raw)).toEqual({ ...current, q: "", ...nothing });
    }
  });
});

describe("smartNotices", () => {
  it("gives none without Smart search criteria, or with no place or ignored value", () => {
    expect(smartNotices(null, "")).toEqual([]);
    expect(smartNotices(smartCriteria("quiet", true), "")).toEqual([]);
  });

  it("puts the place before the ignored value", () => {
    expect(
      smartNotices(
        smartCriteria("quiet", true, { place: "Kruger", ignored: "for 0", ignoredKind: "party" }),
        "",
      ),
    ).toEqual([
      { kind: "place", place: "Kruger" },
      { kind: "ignored", text: "for 0", about: "party" },
    ]);
    expect(smartNotices(smartCriteria("quiet", true, { ignored: "last Tuesday" }), "")).toEqual([
      { kind: "ignored", text: "last Tuesday", about: "dates" },
    ]);
  });

  it("puts the fallback notice first and keeps at most 2", () => {
    expect(smartNotices(smartCriteria("quiet", false, { fallback: true }), "")).toEqual([
      { kind: "fallback" },
    ]);
    expect(
      smartNotices(
        smartCriteria("quiet", false, { fallback: true, place: "Kruger", ignored: "for 0" }),
        "",
      ),
    ).toEqual([{ kind: "fallback" }, { kind: "place", place: "Kruger" }]);
    expect(
      smartNotices(smartCriteria("quiet", true, { fallback: true, ignored: "for 0" }), "Durban"),
    ).toEqual([{ kind: "fallback" }, { kind: "ignored", text: "for 0", about: "dates" }]);
  });

  it("gives no place notice when the URL has a Destination", () => {
    expect(
      smartNotices(smartCriteria("quiet", true, { place: "Kruger", ignored: "for 0" }), "Durban"),
    ).toEqual([{ kind: "ignored", text: "for 0", about: "dates" }]);
  });
});
