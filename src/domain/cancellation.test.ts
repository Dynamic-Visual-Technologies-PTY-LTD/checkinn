// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cancellationDeadline,
  cancellationDeadlineInstant,
  cancellationLine,
  deadlineFromInstant,
  deadlineLabel,
  deadlinePassed,
  NON_REFUNDABLE_LINE,
  snapshotCancellationLine,
} from "./cancellation";

const FREE = "free_until_48_hours_before_check_in";
const BEFORE = "2026-11-10T08:00:00.000Z";

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

describe("cancellationDeadlineInstant", () => {
  it("is the Johannesburg deadline as an ISO UTC instant", () => {
    expect(cancellationDeadlineInstant("2026-11-13", "14:00")).toBe("2026-11-11T12:00:00.000Z");
  });

  it("crosses midnight UTC for an early check-in time", () => {
    expect(cancellationDeadlineInstant("2027-01-01", "01:30")).toBe("2026-12-29T23:30:00.000Z");
  });
});

describe("deadlinePassed", () => {
  it("is false before the deadline and true from it", () => {
    expect(deadlinePassed("2026-11-13", "14:00", "2026-11-11T11:59:59.999Z")).toBe(false);
    expect(deadlinePassed("2026-11-13", "14:00", "2026-11-11T12:00:00.000Z")).toBe(true);
  });
});

describe("deadlineLabel", () => {
  it("reads like Wed 11 Nov 2026, 14:00", () => {
    expect(deadlineLabel({ date: "2026-11-11", time: "14:00" })).toBe("Wed 11 Nov 2026, 14:00");
  });
});

describe("cancellationLine", () => {
  it("gives the free policy its deadline while it is open", () => {
    expect(cancellationLine(FREE, "2026-11-13", "14:00", BEFORE)).toEqual({
      kind: "free",
      until: "until Wed 11 Nov 2026, 14:00",
      text: "Free cancellation until Wed 11 Nov 2026, 14:00",
    });
  });

  it("says when free cancellation ended once the deadline has passed", () => {
    expect(cancellationLine(FREE, "2026-11-13", "14:00", "2026-11-12T08:00:00.000Z")).toEqual({
      kind: "ended",
      text: "Free cancellation ended on Wed 11 Nov 2026, 14:00.",
    });
  });

  it("words a non-refundable policy as the house rule does", () => {
    expect(cancellationLine("non_refundable", "2026-11-13", "14:00", BEFORE)).toEqual({
      kind: "non-refundable",
      text: NON_REFUNDABLE_LINE,
    });
  });
});

describe("deadlineFromInstant", () => {
  it("reads a stored instant back as the Johannesburg date and time", () => {
    expect(deadlineFromInstant("2026-11-11T12:00:00.000Z")).toEqual({
      date: "2026-11-11",
      time: "14:00",
    });
    expect(deadlineFromInstant("2026-12-29T23:30:00.000Z")).toEqual({
      date: "2026-12-30",
      time: "01:30",
    });
  });
});

describe("snapshotCancellationLine", () => {
  const deadline = "2026-11-11T12:00:00.000Z";

  it("words a stored deadline that is still open", () => {
    expect(snapshotCancellationLine(FREE, deadline, BEFORE)).toEqual({
      kind: "free",
      until: "until Wed 11 Nov 2026, 14:00",
      text: "Free cancellation until Wed 11 Nov 2026, 14:00",
    });
  });

  it("says the stored deadline ended once now reaches it", () => {
    expect(snapshotCancellationLine(FREE, deadline, deadline)).toEqual({
      kind: "ended",
      text: "Free cancellation ended on Wed 11 Nov 2026, 14:00.",
    });
  });

  it("is non-refundable without a deadline", () => {
    expect(snapshotCancellationLine("non_refundable", null, BEFORE).text).toBe(NON_REFUNDABLE_LINE);
  });

  it("agrees with the line computed before the Booking existed", () => {
    for (const now of [BEFORE, "2026-11-12T08:00:00.000Z"]) {
      expect(snapshotCancellationLine(FREE, cancellationDeadlineInstant("2026-11-13", "14:00"), now)).toEqual(
        cancellationLine(FREE, "2026-11-13", "14:00", now),
      );
    }
  });
});
