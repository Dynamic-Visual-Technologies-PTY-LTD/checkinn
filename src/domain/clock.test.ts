// @vitest-environment node
import { describe, expect, it } from "vitest";
import { nowIso, todayIn } from "./clock";

describe("todayIn", () => {
  it("gives the calendar date in Africa/Johannesburg", () => {
    expect(todayIn(new Date("2026-11-10T12:00:00Z"))).toBe("2026-11-10");
  });

  it("rolls over at midnight in Johannesburg, not UTC", () => {
    expect(todayIn(new Date("2026-11-10T21:59:59Z"))).toBe("2026-11-10");
    expect(todayIn(new Date("2026-11-10T22:30:00Z"))).toBe("2026-11-11");
  });

  it("crosses a year boundary", () => {
    expect(todayIn(new Date("2026-12-31T22:00:00Z"))).toBe("2027-01-01");
  });

  it("reads the real clock when no time is given", () => {
    expect(todayIn()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nowIso", () => {
  it("gives an ISO UTC timestamp", () => {
    expect(nowIso(new Date("2026-11-10T22:30:00Z"))).toBe("2026-11-10T22:30:00.000Z");
  });
});
