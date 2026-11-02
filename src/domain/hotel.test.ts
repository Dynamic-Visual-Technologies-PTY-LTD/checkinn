import { describe, expect, it } from "vitest";
import { availabilitySectionId, cancellationRule, houseRules, roomTableHref } from "./hotel";

const harbourlight = {
  checkInTime: "14:00",
  checkOutTime: "10:00",
  policies: {
    childrenAllowed: true,
    petsAllowed: false,
    smokingAllowed: false,
    cancellation: { type: "non_refundable" as const },
  },
};

describe("cancellationRule", () => {
  it("words each Cancellation policy", () => {
    expect(cancellationRule("free_until_48_hours_before_check_in")).toBe(
      "Free cancellation until 48 hours before check-in.",
    );
    expect(cancellationRule("non_refundable")).toBe(
      "Non-refundable. This booking can't be cancelled.",
    );
  });
});

describe("houseRules", () => {
  it("lists the six rules in order with their wording", () => {
    expect(houseRules(harbourlight)).toEqual([
      { term: "Check-in", value: "From 14:00" },
      { term: "Check-out", value: "Until 10:00" },
      { term: "Children", value: "Children are welcome" },
      { term: "Pets", value: "Pets are not allowed" },
      { term: "Smoking", value: "Smoking is not allowed" },
      { term: "Cancellation", value: "Non-refundable. This booking can't be cancelled." },
    ]);
  });

  it("words the opposite of each policy", () => {
    const values = houseRules({
      checkInTime: "15:00",
      checkOutTime: "11:00",
      policies: {
        childrenAllowed: false,
        petsAllowed: true,
        smokingAllowed: true,
        cancellation: { type: "free_until_48_hours_before_check_in" },
      },
    }).map((rule) => rule.value);

    expect(values).toEqual([
      "From 15:00",
      "Until 11:00",
      "Children are not allowed",
      "Pets are welcome",
      "Smoking is allowed",
      "Free cancellation until 48 hours before check-in.",
    ]);
  });
});

describe("roomTableHref", () => {
  it("is the Hotel page with the criteria, scrolled to the Availability section", () => {
    expect(availabilitySectionId("hotel-001")).toBe("availability-hotel-001");
    expect(
      roomTableHref("hotel-001", {
        q: "Cape Town",
        stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
        party: { adults: 2, children: 0, rooms: 1 },
        sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
      }),
    ).toBe(
      "/hotels/hotel-001?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1&sel=hotel-001-standard%3A1#availability-hotel-001",
    );
  });

  it("carries no bestFit when the criteria have none, as /book passes them (AD-21)", () => {
    const href = roomTableHref("hotel-010", {
      stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
      party: { adults: 4, children: 0, rooms: 1 },
      sel: [{ roomTypeId: "hotel-010-family", quantity: 1 }],
    });
    expect(href).not.toContain("bestFit");
    expect(roomTableHref("hotel-010", { bestFit: null })).not.toContain("bestFit");
  });
});
