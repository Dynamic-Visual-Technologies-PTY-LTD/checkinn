// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cancellationDeadline,
  cancellationLine,
  deadlineLabel,
  NON_REFUNDABLE_LINE,
} from "./cancellation";

describe("cancellationDeadline", () => {
  it("is check-in minus 2 days at the check-in time", () => {
    expect(cancellationDeadline("2026-11-13", "14:00")).toEqual({
      date: "2026-11-11",
      time: "14:00",
    });
  });

  it("crosses a month and a year end", () => {
    expect(cancellationDeadline("2026-12-01", "15:30").date).toBe("2026-11-29");
    expect(cancellationDeadline("2027-01-01", "14:00").date).toBe("2026-12-30");
  });
});

describe("deadlineLabel", () => {
  it("reads like Wed 11 Nov 2026, 14:00", () => {
    expect(deadlineLabel({ date: "2026-11-11", time: "14:00" })).toBe("Wed 11 Nov 2026, 14:00");
  });
});

describe("cancellationLine", () => {
  it("gives the free policy its deadline", () => {
    expect(
      cancellationLine("free_until_48_hours_before_check_in", "2026-11-13", "14:00"),
    ).toEqual({
      kind: "free",
      until: "until Wed 11 Nov 2026, 14:00",
      text: "Free cancellation until Wed 11 Nov 2026, 14:00",
    });
  });

  it("words a non-refundable policy as the house rule does", () => {
    expect(cancellationLine("non_refundable", "2026-11-13", "14:00")).toEqual({
      kind: "non-refundable",
      text: NON_REFUNDABLE_LINE,
    });
  });
});
