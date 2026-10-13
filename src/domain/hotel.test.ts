import { describe, expect, it } from "vitest";
import { cancellationRule, houseRules } from "./hotel";

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
