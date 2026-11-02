import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addDays,
  addMonths,
  compactStayLabel,
  dayLabel,
  endOfMonth,
  endOfWeek,
  isBefore,
  isUnavailable,
  monthGrid,
  monthLabel,
  nightsBetween,
  pickDate,
  relativeStay,
  rangeLabel,
  shortDayLabel,
  startOfMonth,
  startOfWeek,
  stayLabel,
  weekdayIndex,
} from "./dates";

describe("date arithmetic", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("ignores daylight-saving changes", () => {
    // Europe/London moves its clocks on 29 March 2026.
    vi.stubEnv("TZ", "Europe/London");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(nightsBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("counts nights and compares dates", () => {
    expect(nightsBetween("2026-11-13", "2026-11-15")).toBe(2);
    expect(nightsBetween("2026-11-13", "2026-12-13")).toBe(30);
    expect(isBefore("2026-11-09", "2026-11-10")).toBe(true);
    expect(isBefore("2026-11-10", "2026-11-10")).toBe(false);
  });

  it("starts weeks on Monday", () => {
    expect(weekdayIndex("2026-11-16")).toBe(0);
    expect(weekdayIndex("2026-11-15")).toBe(6);
    expect(startOfWeek("2026-11-13")).toBe("2026-11-09");
    expect(endOfWeek("2026-11-13")).toBe("2026-11-15");
  });

  it("moves by months and clamps the day", () => {
    expect(startOfMonth("2026-11-13")).toBe("2026-11-01");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
  });

  it("builds a Monday-first month grid", () => {
    const grid = monthGrid("2026-11-01");
    expect(grid).toHaveLength(6);
    expect(grid[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(grid[5]).toEqual(["2026-11-30", null, null, null, null, null, null]);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });
});

describe("date labels", () => {
  it("names days, months and ranges in fixed English", () => {
    expect(dayLabel("2026-11-13")).toBe("Friday 13 November 2026");
    expect(shortDayLabel("2026-11-13")).toBe("Fri 13 Nov");
    expect(monthLabel("2026-11-01")).toBe("November 2026");
    expect(rangeLabel({ checkIn: "2026-11-13", checkOut: "2026-11-15" })).toBe(
      "2 nights · Fri 13 Nov – Sun 15 Nov",
    );
    expect(rangeLabel({ checkIn: "2026-11-13", checkOut: "2026-11-14" })).toBe(
      "1 night · Fri 13 Nov – Sat 14 Nov",
    );
  });

  it("shortens a Stay the way summaries show it", () => {
    expect(stayLabel({ checkIn: "2026-11-13", checkOut: "2026-11-15" })).toBe(
      "Fri 13 – Sun 15 Nov 2026",
    );
    expect(stayLabel({ checkIn: "2026-11-30", checkOut: "2026-12-02" })).toBe(
      "Mon 30 Nov – Wed 2 Dec 2026",
    );
    expect(stayLabel({ checkIn: "2026-12-31", checkOut: "2027-01-02" })).toBe(
      "Thu 31 Dec 2026 – Sat 2 Jan 2027",
    );
  });
});

describe("pickDate", () => {
  it("sets check-in, then check-out", () => {
    const first = pickDate({ checkIn: null, checkOut: null }, "2026-11-13");
    expect(first).toEqual({ checkIn: "2026-11-13", checkOut: null });
    expect(pickDate(first, "2026-11-15")).toEqual({
      checkIn: "2026-11-13",
      checkOut: "2026-11-15",
    });
  });

  it("restarts on a pick on or before check-in", () => {
    const range = { checkIn: "2026-11-15", checkOut: null };
    expect(pickDate(range, "2026-11-12")).toEqual({ checkIn: "2026-11-12", checkOut: null });
    expect(pickDate(range, "2026-11-15")).toEqual({ checkIn: "2026-11-15", checkOut: null });
  });

  it("starts a new range after a complete one", () => {
    expect(
      pickDate({ checkIn: "2026-11-13", checkOut: "2026-11-15" }, "2026-11-20"),
    ).toEqual({ checkIn: "2026-11-20", checkOut: null });
  });
});

describe("isUnavailable", () => {
  const today = "2026-11-10";

  it("disables past days", () => {
    const none = { checkIn: null, checkOut: null };
    expect(isUnavailable("2026-11-09", today, none)).toBe(true);
    expect(isUnavailable("2026-11-10", today, none)).toBe(false);
  });

  it("disables days beyond 30 nights once check-in is set", () => {
    const range = { checkIn: "2026-11-13", checkOut: null };
    expect(isUnavailable("2026-12-13", today, range)).toBe(false);
    expect(isUnavailable("2026-12-14", today, range)).toBe(true);
  });
});

describe("compactStayLabel", () => {
  it("joins days in one month with an en dash", () => {
    expect(compactStayLabel({ checkIn: "2026-11-13", checkOut: "2026-11-15" })).toBe("13–15 Nov");
  });

  it("names both months across a month or a year", () => {
    expect(compactStayLabel({ checkIn: "2026-11-30", checkOut: "2026-12-02" })).toBe(
      "30 Nov – 2 Dec",
    );
    expect(compactStayLabel({ checkIn: "2026-12-31", checkOut: "2027-01-02" })).toBe(
      "31 Dec – 2 Jan",
    );
  });
});

describe("relativeStay", () => {
  // Mon 12 to Sun 18 Oct 2026; Thu 15 Oct is the PRD's "today".
  const stay = (checkIn: string, checkOut: string) => ({ checkIn, checkOut });

  it("resolves tonight to today until tomorrow", () => {
    expect(relativeStay("tonight", "2026-10-15")).toEqual(stay("2026-10-15", "2026-10-16"));
    expect(relativeStay("tonight", "2026-12-31")).toEqual(stay("2026-12-31", "2027-01-01"));
  });

  it("resolves this weekend to the coming Friday to Sunday on a weekday", () => {
    for (const today of ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]) {
      expect(relativeStay("this-weekend", today)).toEqual(stay("2026-10-16", "2026-10-18"));
    }
  });

  it("starts this weekend today on a Friday or a Saturday", () => {
    expect(relativeStay("this-weekend", "2026-10-16")).toEqual(stay("2026-10-16", "2026-10-18"));
    expect(relativeStay("this-weekend", "2026-10-17")).toEqual(stay("2026-10-17", "2026-10-18"));
  });

  it("makes this weekend Sunday to Monday on a Sunday (user decision)", () => {
    expect(relativeStay("this-weekend", "2026-10-18")).toEqual(stay("2026-10-18", "2026-10-19"));
  });

  it("resolves next weekend to the Friday to Sunday after this weekend's Friday", () => {
    expect(relativeStay("next-weekend", "2026-10-15")).toEqual(stay("2026-10-23", "2026-10-25"));
    expect(relativeStay("next-weekend", "2026-10-12")).toEqual(stay("2026-10-23", "2026-10-25"));
    expect(relativeStay("next-weekend", "2026-10-16")).toEqual(stay("2026-10-23", "2026-10-25"));
    expect(relativeStay("next-weekend", "2026-10-17")).toEqual(stay("2026-10-23", "2026-10-25"));
    expect(relativeStay("next-weekend", "2026-10-18")).toEqual(stay("2026-10-23", "2026-10-25"));
    expect(relativeStay("next-weekend", "2026-10-19")).toEqual(stay("2026-10-30", "2026-11-01"));
  });
});
