import type { CancellationPolicy, HouseRule } from "@/domain/types";

const BED_NOUNS: Record<string, string> = {
  double: "double bed",
  single: "single bed",
  queen: "queen bed",
  king: "king bed",
  twin: "twin bed",
  sofa_bed: "sofa bed",
};

const CANCELLATION_RULES: Record<CancellationPolicy, string> = {
  free_until_48_hours_before_check_in: "Free cancellation until 48 hours before check-in.",
  non_refundable: "Non-refundable. This booking can't be cancelled.",
};

/** The house-rules wording for a Cancellation policy (FR-14). */
export function cancellationRule(policy: CancellationPolicy): string {
  return CANCELLATION_RULES[policy];
}

type HouseRuleInput = {
  checkInTime: string;
  checkOutTime: string;
  policies: {
    childrenAllowed: boolean;
    petsAllowed: boolean;
    smokingAllowed: boolean;
    cancellation: { type: CancellationPolicy };
  };
};

/**
 * A Hotel's house rules (FR-14, DESIGN.md House rules): Check-in, Check-out,
 * Children, Pets, Smoking and Cancellation, in that order.
 */
export function houseRules({ checkInTime, checkOutTime, policies }: HouseRuleInput): HouseRule[] {
  return [
    { term: "Check-in", value: `From ${checkInTime}` },
    { term: "Check-out", value: `Until ${checkOutTime}` },
    {
      term: "Children",
      value: policies.childrenAllowed ? "Children are welcome" : "Children are not allowed",
    },
    {
      term: "Pets",
      value: policies.petsAllowed ? "Pets are welcome" : "Pets are not allowed",
    },
    {
      term: "Smoking",
      value: policies.smokingAllowed ? "Smoking is allowed" : "Smoking is not allowed",
    },
    { term: "Cancellation", value: cancellationRule(policies.cancellation.type) },
  ];
}

/**
 * The id of a Hotel's Availability heading, which See rooms focuses. It
 * carries the Hotel id, because Next can keep a previous Hotel page hidden in
 * the DOM. It lives here, not in the client actions file, because the server
 * page calls it too.
 */
export function availabilityHeadingId(hotelId: string): string {
  return `availability-heading-${hotelId}`;
}

/**
 * A Room type's beds as one phrase: "1 double bed", "1 double bed, 2 single
 * beds". Unknown bed types fall back to "<type> bed".
 */
export function bedsLabel(beds: readonly { type: string; count: number }[]): string {
  return beds
    .map(({ type, count }) => {
      const noun = BED_NOUNS[type] ?? `${type.replace(/_/g, " ")} bed`;
      return `${count} ${count === 1 ? noun : `${noun}s`}`;
    })
    .join(", ");
}
