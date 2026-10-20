// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyInterpretation, type InterpretedCriteria } from "./interpretation";

const today = "2026-10-15";
const current: InterpretedCriteria = {
  q: "Cape Town",
  stay: { checkIn: "2026-10-16", checkOut: "2026-10-17" },
  party: { adults: 2, children: 1, rooms: 2 },
};

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

describe("applyInterpretation", () => {
  it("applies the UJ-1 fixture: Stellenbosch, the current Stay, 4 adults", () => {
    expect(applyInterpretation(uj1, current, today)).toEqual({
      q: "Stellenbosch",
      stay: current.stay,
      party: { adults: 4, children: 0, rooms: 2 },
    });
  });

  it("starts the Destination empty when none is stated", () => {
    expect(applyInterpretation({ destination: null }, current, today).q).toBe("");
    expect(applyInterpretation({ destination: "   " }, current, today).q).toBe("");
    expect(applyInterpretation({}, current, today).q).toBe("");
  });

  it("trims the Destination", () => {
    expect(applyInterpretation({ destination: " Durban " }, current, today).q).toBe("Durban");
  });

  it("replaces the Stay with valid absolute dates", () => {
    const stay = { checkIn: "2026-10-23", checkOut: "2026-10-25" };
    expect(applyInterpretation(stay, current, today).stay).toEqual(stay);
  });

  it("keeps the current Stay for invalid dates", () => {
    for (const stay of [
      { checkIn: "2026-10-10", checkOut: "2026-10-12" },
      { checkIn: "2026-10-25", checkOut: "2026-10-23" },
      { checkIn: "2026-02-30", checkOut: "2026-03-02" },
      { checkIn: "2026-10-23", checkOut: "2027-10-23" },
      { checkIn: "2026-10-23", checkOut: null },
      { checkIn: 20261023, checkOut: 20261025 },
    ]) {
      expect(applyInterpretation(stay, current, today).stay).toEqual(current.stay);
    }
  });

  it("keeps a null current Stay when the Query states none", () => {
    expect(applyInterpretation({}, { ...current, stay: null }, today).stay).toBeNull();
  });

  it("replaces the whole Party when adults are stated, children defaulting to 0", () => {
    expect(applyInterpretation({ adults: 4, children: null }, current, today).party).toEqual({
      adults: 4,
      children: 0,
      rooms: 2,
    });
  });

  it("clamps the current Rooms to the adults", () => {
    expect(applyInterpretation({ adults: 1 }, current, today).party).toEqual({
      adults: 1,
      children: 0,
      rooms: 1,
    });
  });

  it("keeps the current adults when only children are stated", () => {
    expect(applyInterpretation({ children: 2 }, current, today).party).toEqual({
      adults: 2,
      children: 2,
      rooms: 2,
    });
  });

  it("keeps the current Party when the Query states none", () => {
    expect(applyInterpretation({ adults: null, children: null }, current, today).party).toEqual(
      current.party,
    );
  });

  it("keeps the current Party for values outside the limits", () => {
    for (const party of [
      { adults: 0 },
      { adults: 11 },
      { adults: 2, children: 7 },
      { children: -1 },
    ]) {
      expect(applyInterpretation(party, current, today).party).toEqual(current.party);
    }
  });

  it("ignores fields of the wrong type and applies the rest", () => {
    expect(
      applyInterpretation(
        {
          destination: 42,
          adults: "4",
          children: 1.5,
          checkIn: "2026-10-23",
          checkOut: "2026-10-25",
        },
        current,
        today,
      ),
    ).toEqual({
      q: "",
      stay: { checkIn: "2026-10-23", checkOut: "2026-10-25" },
      party: current.party,
    });
  });

  it("never throws on output that is not an object", () => {
    for (const raw of [null, undefined, "Stellenbosch", 4, [uj1], true]) {
      expect(applyInterpretation(raw, current, today)).toEqual({
        q: "",
        stay: current.stay,
        party: current.party,
      });
    }
  });
});
