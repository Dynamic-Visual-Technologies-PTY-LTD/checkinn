// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SearchCriteria } from "@/domain/types";
import {
  defaultCriteria,
  hotelHref,
  parseCriteria,
  parseNotice,
  parseSelection,
  problemMessage,
  searchBarSearch,
  searchHref,
  serializeCriteria,
  serializeNotice,
  smartCriteria,
  validateStay,
  withoutCriterion,
} from "./criteria";

const today = "2026-11-10";

function parse(params: Record<string, string>, options?: { defaultStay?: boolean }) {
  return parseCriteria(new URLSearchParams(params), today, options);
}

describe("parseCriteria defaults", () => {
  it("gives an empty query, tomorrow for 1 night and 2/0/1 with no problems", () => {
    expect(parseCriteria({}, today)).toEqual({
      criteria: {
        q: "",
        stay: { checkIn: "2026-11-11", checkOut: "2026-11-12" },
        party: { adults: 2, children: 0, rooms: 1 },
        hotel: null,
        sel: null,
        k: null,
        notice: null,
        smart: null,
      },
      problems: [],
    });
  });

  it("matches defaultCriteria", () => {
    expect(parseCriteria({}, today).criteria).toEqual(defaultCriteria(today));
  });

  it("keeps absent dates null on the Hotel page, with no problem", () => {
    const { criteria, problems } = parse({ hotel: "hotel-001" }, { defaultStay: false });
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual([]);
  });

  it("reads a Next.js searchParams object, taking the first of repeated values", () => {
    const { criteria } = parseCriteria(
      { q: ["Durban", "Cape Town"], checkIn: "2026-11-13", checkOut: "2026-11-15" },
      today,
    );
    expect(criteria.q).toBe("Durban");
    expect(criteria.stay).toEqual({ checkIn: "2026-11-13", checkOut: "2026-11-15" });
  });

  it("trims the query", () => {
    expect(parse({ q: "  Cape Town " }).criteria.q).toBe("Cape Town");
  });
});

describe("parseCriteria Stay rules", () => {
  it("accepts a Stay from today", () => {
    const { criteria, problems } = parse({ checkIn: "2026-11-10", checkOut: "2026-11-11" });
    expect(criteria.stay).toEqual({ checkIn: "2026-11-10", checkOut: "2026-11-11" });
    expect(problems).toEqual([]);
  });

  it("rejects a past check-in", () => {
    const { criteria, problems } = parse({ checkIn: "2026-11-09", checkOut: "2026-11-11" });
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["stay-past"]);
  });

  it("accepts 30 nights and rejects 31", () => {
    expect(parse({ checkIn: "2026-11-11", checkOut: "2026-12-11" }).problems).toEqual([]);
    const { criteria, problems } = parse({ checkIn: "2026-11-11", checkOut: "2026-12-12" });
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["stay-too-long"]);
  });

  it("rejects check-out on or before check-in", () => {
    expect(parse({ checkIn: "2026-11-13", checkOut: "2026-11-13" }).problems).toEqual([
      "stay-order",
    ]);
    const { criteria, problems } = parse({ checkIn: "2026-11-13", checkOut: "2026-11-12" });
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["stay-order"]);
  });

  it.each([
    ["an impossible month", { checkIn: "2026-13-01", checkOut: "2026-13-02" }],
    ["an impossible day", { checkIn: "2026-02-30", checkOut: "2026-03-01" }],
    ["a non-date", { checkIn: "soon", checkOut: "2026-11-12" }],
    ["a missing check-out", { checkIn: "2026-11-13" }],
    ["a missing check-in", { checkOut: "2026-11-13" }],
  ])("rejects %s as malformed", (_, params) => {
    const { criteria, problems } = parse(params);
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["stay-malformed"]);
  });
});

describe("parseCriteria Party rules", () => {
  it("reads a valid Party", () => {
    const { criteria, problems } = parse({ adults: "2", children: "3", rooms: "2" });
    expect(criteria.party).toEqual({ adults: 2, children: 3, rooms: 2 });
    expect(criteria.stay).not.toBeNull();
    expect(problems).toEqual([]);
  });

  it("accepts the limits", () => {
    expect(parse({ adults: "10", children: "6", rooms: "5" }).problems).toEqual([]);
    expect(parse({ adults: "1", children: "0", rooms: "1" }).problems).toEqual([]);
  });

  it("defaults too many adults and clears the Stay", () => {
    const { criteria, problems } = parse({ adults: "11", children: "1", rooms: "1" });
    expect(criteria.party).toEqual({ adults: 2, children: 1, rooms: 1 });
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["party-invalid"]);
  });

  it("defaults more rooms than adults", () => {
    const { criteria, problems } = parse({ adults: "2", rooms: "3" });
    expect(criteria.party).toEqual({ adults: 2, children: 0, rooms: 1 });
    expect(problems).toEqual(["party-invalid"]);
  });

  it.each([["x"], ["-1"], ["1.5"], ["7"]])("defaults children %s", (children) => {
    const { criteria, problems } = parse({ children });
    expect(criteria.party.children).toBe(0);
    expect(criteria.stay).toBeNull();
    expect(problems).toEqual(["party-invalid"]);
  });

  it("defaults zero adults and six rooms", () => {
    const { criteria, problems } = parse({ adults: "0", rooms: "6" });
    expect(criteria.party).toEqual({ adults: 2, children: 0, rooms: 1 });
    expect(problems).toEqual(["party-invalid"]);
  });

  it("reports both a bad Party and bad dates", () => {
    const { problems } = parse({ checkIn: "2026-11-09", checkOut: "2026-11-10", adults: "x" });
    expect(problems).toEqual(["party-invalid", "stay-past"]);
  });
});

describe("sel", () => {
  it.each([
    ["rt-1:1", [{ roomTypeId: "rt-1", quantity: 1 }]],
    [
      "hotel-001-standard:2,hotel-001-family:1",
      [
        { roomTypeId: "hotel-001-standard", quantity: 2 },
        { roomTypeId: "hotel-001-family", quantity: 1 },
      ],
    ],
  ])("accepts %s", (value, expected) => {
    expect(parseSelection(value)).toEqual(expected);
  });

  it.each([
    ["rt-1:2,rt-2:0"],
    ["rt-1:1.5"],
    ["rt-1:-1"],
    ["rt-1:01"],
    ["rt-1"],
    [":1"],
    ["rt-1:1:2"],
    ["rt-1:1,"],
    ["rt-1:1,rt-1:2"],
  ])("rejects %s", (value) => {
    expect(parseSelection(value)).toBeNull();
  });

  it("reports an invalid sel without touching the Stay", () => {
    const { criteria, problems } = parse({ hotel: "hotel-001", sel: "rt-1:0" });
    expect(criteria.sel).toBeNull();
    expect(criteria.stay).not.toBeNull();
    expect(problems).toEqual(["sel-invalid"]);
  });
});

describe("notice", () => {
  it("reads room-unavailable with the Room types that ran out", () => {
    expect(parse({ notice: "room-unavailable", rt: "rt-1,rt-2" }).criteria.notice).toEqual({
      type: "room-unavailable",
      roomTypeIds: ["rt-1", "rt-2"],
    });
  });

  it("reads cancelled and ignores an unknown notice", () => {
    expect(parse({ notice: "cancelled" }).criteria.notice).toEqual({ type: "cancelled" });
    expect(parse({ notice: "surprise" }).criteria.notice).toBeNull();
  });
});

describe("serializeCriteria", () => {
  const full: SearchCriteria = {
    q: "Cape Town",
    stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
    party: { adults: 2, children: 3, rooms: 2 },
    hotel: "hotel-001",
    sel: [
      { roomTypeId: "hotel-001-standard", quantity: 1 },
      { roomTypeId: "hotel-001-family", quantity: 1 },
    ],
    k: "0b6f0c8e-6f43-4b5f-9a59-6b1f1e3b1b9a",
    notice: { type: "room-unavailable", roomTypeIds: ["hotel-001-family"] },
    smart: null,
  };

  it("writes parameters in a fixed order", () => {
    const keys = [...new URLSearchParams(serializeCriteria(full)).keys()];
    expect(keys).toEqual([
      "q",
      "checkIn",
      "checkOut",
      "adults",
      "children",
      "rooms",
      "hotel",
      "sel",
      "k",
      "notice",
      "rt",
    ]);
  });

  it("round-trips with parse", () => {
    const { criteria, problems } = parseCriteria(
      new URLSearchParams(serializeCriteria(full)),
      today,
    );
    expect(problems).toEqual([]);
    expect(criteria).toEqual(full);
  });

  it("round-trips the defaults", () => {
    const defaults = defaultCriteria(today);
    const parsed = parseCriteria(new URLSearchParams(serializeCriteria(defaults)), today);
    expect(parsed.criteria).toEqual(defaults);
  });

  it("omits empty optional values but always writes dates and Party", () => {
    expect(serializeCriteria(defaultCriteria(today))).toBe(
      "checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=0&rooms=1",
    );
  });

  it("builds the Search results URL", () => {
    expect(searchHref({ ...defaultCriteria(today), q: "Cape Town" })).toBe(
      "/search?q=Cape+Town&checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=0&rooms=1",
    );
  });
});

describe("validateStay", () => {
  it("passes a valid Stay", () => {
    expect(validateStay({ checkIn: "2026-11-13", checkOut: "2026-11-15" }, today)).toEqual([]);
  });

  it("flags a past Stay with its message", () => {
    const problems = validateStay({ checkIn: "2026-11-09", checkOut: "2026-11-10" }, today);
    expect(problems).toEqual(["stay-past"]);
    expect(problemMessage("stay-past")).toBe("Check-in can't be in the past.");
  });

  it("maps every Stay problem to its EXPERIENCE.md message", () => {
    expect(problemMessage("stay-order")).toBe("Check-out must be after check-in.");
    expect(problemMessage("stay-too-long")).toBe("Stays can be up to 30 nights.");
    expect(problemMessage("stay-malformed")).toBe("Those dates have passed. Pick new ones.");
  });

  it("treats no Stay as malformed", () => {
    expect(validateStay(null, today)).toEqual(["stay-malformed"]);
  });
});

describe("hotelHref", () => {
  it("links to the Hotel page with the search criteria kept", () => {
    expect(
      hotelHref("hotel-001", {
        q: "Cape Town",
        stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
        party: { adults: 2, children: 0, rooms: 1 },
      }),
    ).toBe(
      "/hotels/hotel-001?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1",
    );
  });
});

describe("Smart search parameters", () => {
  const smartParams = { q: "Stellenbosch", adults: "4", children: "0", rooms: "1" };

  it("parses sq, trimmed, with smart=1 as interpreted", () => {
    expect(parse({ ...smartParams, sq: "  pet friendly place ", smart: "1" }).criteria.smart).toEqual(
      smartCriteria("pet friendly place", true),
    );
  });

  it("is not interpreted without smart=1, and ignores any other smart value", () => {
    expect(parse({ sq: "quiet hotel" }).criteria.smart).toEqual(smartCriteria("quiet hotel", false));
    for (const smart of ["true", "0", "yes", "11"]) {
      expect(parse({ sq: "quiet hotel", smart }).criteria.smart).toEqual(
        smartCriteria("quiet hotel", false),
      );
    }
  });

  it("is null without sq, with an empty sq, or with an sq over 300 characters", () => {
    expect(parse({ smart: "1" }).criteria.smart).toBeNull();
    expect(parse({ sq: "   ", smart: "1" }).criteria.smart).toBeNull();
    expect(parse({ sq: "a".repeat(301), smart: "1" }).criteria.smart).toBeNull();
    expect(parse({ sq: "a".repeat(300) }).criteria.smart?.query).toHaveLength(300);
  });

  it("ignores every other Smart parameter without sq", () => {
    expect(
      parse({ prefs: "quiet", maxPrice: "2000", policy: "pets", place: "Kruger" }).criteria.smart,
    ).toBeNull();
  });

  it("parses prefs, maxPrice, policy, place, ignored and ignoredKind", () => {
    expect(
      parse({
        sq: "pet friendly place",
        smart: "1",
        prefs: " pet friendly family place ",
        maxPrice: "2000",
        policy: "smoking,pets",
        place: "Kruger",
        ignored: "for 0",
        ignoredKind: "party",
      }).criteria.smart,
    ).toEqual(
      smartCriteria("pet friendly place", true, {
        preferences: "pet friendly family place",
        maxPriceRand: 2000,
        policies: ["pets", "smoking"],
        place: "Kruger",
        ignored: "for 0",
        ignoredKind: "party",
      }),
    );
  });

  it("drops a maxPrice that is not a positive whole number", () => {
    for (const maxPrice of ["abc", "0", "-5", "1.5", "2 000", "R2000", "99999999999999999999"]) {
      expect(parse({ sq: "quiet", maxPrice }).criteria.smart?.maxPriceRand).toBeNull();
    }
  });

  it("drops unknown policy entries and repeats", () => {
    expect(parse({ sq: "quiet", policy: "pets,wifi" }).criteria.smart?.policies).toEqual(["pets"]);
    expect(parse({ sq: "quiet", policy: " children , pets,pets" }).criteria.smart?.policies).toEqual(
      ["pets", "children"],
    );
    expect(parse({ sq: "quiet", policy: "wifi" }).criteria.smart?.policies).toEqual([]);
  });

  it("drops prefs over 300 characters", () => {
    expect(parse({ sq: "quiet", prefs: "a".repeat(301) }).criteria.smart?.preferences).toBeNull();
    expect(parse({ sq: "quiet", prefs: "a".repeat(300) }).criteria.smart?.preferences).toHaveLength(
      300,
    );
  });

  it("drops a place or ignored over 60 characters or with other characters", () => {
    for (const value of ["a".repeat(61), "<b>Kruger</b>", "Kruger!", "Kruger\nPark", 'say "hi"']) {
      const smart = parse({ sq: "quiet", place: value, ignored: value }).criteria.smart;
      expect(smart?.place).toBeNull();
      expect(smart?.ignored).toBeNull();
    }
    const smart = parse({ sq: "quiet", place: "Hluhluwe-iMfolozi", ignored: "Sat, 3 o'clock." })
      .criteria.smart;
    expect(smart?.place).toBe("Hluhluwe-iMfolozi");
    expect(smart?.ignored).toBe("Sat, 3 o'clock.");
    expect(parse({ sq: "quiet", place: "a".repeat(60) }).criteria.smart?.place).toHaveLength(60);
  });

  it("reads ignoredKind as dates unless it is party", () => {
    for (const ignoredKind of [undefined, "dates", "Party", "people"]) {
      const params: Record<string, string> = { sq: "quiet", ignored: "last Tuesday" };
      if (ignoredKind) params.ignoredKind = ignoredKind;
      expect(parse(params).criteria.smart?.ignoredKind).toBe("dates");
    }
    expect(
      parse({ sq: "quiet", ignored: "for 0", ignoredKind: "party" }).criteria.smart?.ignoredKind,
    ).toBe("party");
  });

  it("keeps the Query and the valid values of a stale link", () => {
    expect(
      parse({
        sq: "pet friendly place",
        smart: "1",
        maxPrice: "abc",
        policy: "pets,wifi",
        place: "a".repeat(61),
        prefs: "a".repeat(301),
      }).criteria.smart,
    ).toEqual(smartCriteria("pet friendly place", true, { policies: ["pets"] }));
  });

  it("writes sq and smart after the MVP parameters", () => {
    expect(
      searchHref({
        q: "Stellenbosch",
        stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
        party: { adults: 4, children: 0, rooms: 1 },
        smart: smartCriteria("pet friendly place for 4", true),
      }),
    ).toBe(
      "/search?q=Stellenbosch&checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1" +
        "&sq=pet+friendly+place+for+4&smart=1",
    );
  });

  it("writes every Smart parameter in AD-21 order", () => {
    expect(
      searchHref({
        smart: smartCriteria("quiet place", true, {
          preferences: "quiet place Kruger",
          maxPriceRand: 2000,
          policies: ["smoking", "pets"],
          place: "Kruger",
          ignored: "for 0",
          ignoredKind: "party",
        }),
      }),
    ).toBe(
      "/search?adults=2&children=0&rooms=1&sq=quiet+place&smart=1&prefs=quiet+place+Kruger" +
        "&maxPrice=2000&policy=pets%2Csmoking&place=Kruger&ignored=for+0&ignoredKind=party",
    );
  });

  it("leaves ignoredKind out for dates, the default", () => {
    expect(
      serializeCriteria({ smart: smartCriteria("quiet", true, { ignored: "last Tuesday" }) }),
    ).toBe("adults=2&children=0&rooms=1&sq=quiet&smart=1&ignored=last+Tuesday");
    expect(serializeCriteria({ smart: smartCriteria("quiet", true, { ignoredKind: "party" }) })).toBe(
      "adults=2&children=0&rooms=1&sq=quiet&smart=1",
    );
  });

  it("writes no value that parsing would drop", () => {
    expect(
      serializeCriteria({
        smart: smartCriteria("quiet", true, {
          preferences: "a".repeat(301),
          maxPriceRand: 1.5,
          place: "<Kruger>",
          ignored: "a".repeat(61),
        }),
      }),
    ).toBe("adults=2&children=0&rooms=1&sq=quiet&smart=1");
  });

  it("writes sq without smart when the Query was not interpreted", () => {
    expect(searchHref({ smart: smartCriteria("quiet hotel", false) })).toBe(
      "/search?adults=2&children=0&rooms=1&sq=quiet+hotel",
    );
  });

  it("writes nothing for an empty or over-long Query", () => {
    expect(
      serializeCriteria({ smart: smartCriteria("  ", true, { preferences: "quiet" }) }),
    ).toBe("adults=2&children=0&rooms=1");
    expect(serializeCriteria({ smart: smartCriteria("a".repeat(301), true) })).toBe(
      "adults=2&children=0&rooms=1",
    );
  });

  it("round-trips through parseCriteria", () => {
    const smart = smartCriteria("pet friendly place", true, {
      preferences: "pet friendly family place",
      maxPriceRand: 2000,
      policies: ["pets"],
      place: "Kruger",
      ignored: "for 0",
      ignoredKind: "party",
    });
    const href = searchHref({ q: "Stellenbosch", smart });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(parseCriteria(params, today).criteria.smart).toEqual(smart);
  });

  it("never puts a Smart parameter on a Hotel page URL", () => {
    const href = hotelHref("hotel-001", {
      q: "Stellenbosch",
      smart: smartCriteria("pet friendly place", true, {
        preferences: "pet friendly",
        maxPriceRand: 2000,
        policies: ["pets"],
        place: "Kruger",
        ignored: "for 0",
        ignoredKind: "party",
      }),
    });
    const params = new URLSearchParams(href.split("?")[1]);
    for (const key of [
      "sq",
      "smart",
      "prefs",
      "maxPrice",
      "policy",
      "fallback",
      "place",
      "ignored",
      "ignoredKind",
    ]) {
      expect(params.has(key)).toBe(false);
    }
    expect(href).toBe("/hotels/hotel-001?q=Stellenbosch&adults=2&children=0&rooms=1");
  });
});

describe("serializeNotice", () => {
  it("writes the notice alone, with no criteria", () => {
    expect(serializeNotice({ type: "cancelled" })).toBe("notice=cancelled");
    expect(
      serializeNotice({ type: "room-unavailable", roomTypeIds: ["hotel-001-standard"] }),
    ).toBe("notice=room-unavailable&rt=hotel-001-standard");
  });

  it("round-trips through parseNotice", () => {
    expect(parseNotice(new URLSearchParams(serializeNotice({ type: "cancelled" })))).toEqual({
      type: "cancelled",
    });
    expect(parseNotice({ notice: "unknown" })).toBeNull();
  });
});

describe("Smart search URL changes (AD-21)", () => {
  const base = {
    q: "Stellenbosch",
    stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
    party: { adults: 4, children: 0, rooms: 1 },
  };
  const smart = smartCriteria("pet friendly place for 4", true, {
    preferences: "pet friendly place",
    maxPriceRand: 2000,
    policies: ["pets", "children"],
    place: "Kruger",
    ignored: "for 0",
    ignoredKind: "party",
  });
  const mvp =
    "/search?q=Stellenbosch&checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1";
  const smartPart = "sq=pet+friendly+place+for+4&smart=1&prefs=pet+friendly+place";

  it("removes one chip's criterion and keeps every other Smart parameter", () => {
    expect(withoutCriterion({ ...base, smart }, "maxPrice")).toBe(
      `${mvp}&${smartPart}&policy=pets%2Cchildren&place=Kruger&ignored=for+0&ignoredKind=party`,
    );
    expect(withoutCriterion({ ...base, smart }, "pets")).toBe(
      `${mvp}&${smartPart}&maxPrice=2000&policy=children&place=Kruger&ignored=for+0&ignoredKind=party`,
    );
  });

  it("removes the last Policy criterion, leaving no policy parameter", () => {
    const one = { ...smart, policies: ["smoking" as const], maxPriceRand: null };
    expect(withoutCriterion({ ...base, smart: one }, "smoking")).not.toContain("policy=");
  });

  it("round-trips a chip removal through the codec", () => {
    const href = withoutCriterion({ ...base, smart }, "children");
    const parsed = parseCriteria(new URLSearchParams(href.split("?")[1]), today).criteria;
    expect(parsed.smart).toEqual({ ...smart, policies: ["pets"] });
  });

  it("keeps sq, smart, prefs, maxPrice and policy on a Search bar Search", () => {
    expect(searchBarSearch({ ...base, smart }, { boxIsEmpty: false })).toBe(
      `${mvp}&${smartPart}&maxPrice=2000&policy=pets%2Cchildren`,
    );
  });

  it("drops every Smart parameter when the box is empty at Search time", () => {
    expect(searchBarSearch({ ...base, smart }, { boxIsEmpty: true })).toBe(mvp);
  });

  it("is the MVP URL without a Query", () => {
    expect(searchBarSearch({ ...base, smart: null }, { boxIsEmpty: false })).toBe(mvp);
    expect(searchBarSearch({ ...base, smart: null }, { boxIsEmpty: false })).toBe(
      searchHref(base),
    );
  });
});
