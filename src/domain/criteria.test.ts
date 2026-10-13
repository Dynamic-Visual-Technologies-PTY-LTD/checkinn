// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SearchCriteria } from "@/domain/types";
import {
  defaultCriteria,
  parseCriteria,
  parseSelection,
  problemMessage,
  searchHref,
  serializeCriteria,
  validateStay,
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
