/**
 * Pure date arithmetic on ISO `YYYY-MM-DD` strings. Every calculation runs in
 * UTC, so the result never depends on the machine's time zone. Nothing here
 * reads the clock: callers pass `today`.
 *
 * Labels use fixed English names, never `Intl`, so the server and the client
 * render the same text.
 */
import type { IsoDate, Stay } from "@/domain/types";

/** The longest Stay a Guest can pick (EXPERIENCE.md Range calendar). */
export const MAX_NIGHTS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday first, matching the calendar's week. */
export const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** A range being picked: check-in first, then check-out. */
export type DateRange = {
  checkIn: IsoDate | null;
  checkOut: IsoDate | null;
};

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function parts(date: IsoDate): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function toUtc(date: IsoDate): number {
  const { year, month, day } = parts(date);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): IsoDate {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Nights from check-in to check-out. Negative if check-out comes first. */
export function nightsBetween(checkIn: IsoDate, checkOut: IsoDate): number {
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / DAY_MS);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

/** 0 for Monday through 6 for Sunday. */
export function weekdayIndex(date: IsoDate): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date));
}

export function endOfWeek(date: IsoDate): IsoDate {
  return addDays(date, 6 - weekdayIndex(date));
}

/** The first day of the date's month. */
export function startOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parts(date);
  return `${pad(year, 4)}-${pad(month)}-01`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function endOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parts(date);
  return `${pad(year, 4)}-${pad(month)}-${pad(daysInMonth(year, month))}`;
}

/** Moves by whole months, keeping the day where it exists (31 Jan + 1 → 28 Feb). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const { year, month, day } = parts(date);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${pad(y, 4)}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

/**
 * The month's days as Monday-first weeks. Days outside the month are `null`,
 * so every week has seven cells.
 */
export function monthGrid(month: IsoDate): (IsoDate | null)[][] {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const weeks: (IsoDate | null)[][] = [];
  let week: (IsoDate | null)[] = Array.from({ length: weekdayIndex(first) }, () => null);

  for (let day = first; day <= last; day = addDays(day, 1)) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    weeks.push([...week, ...Array.from({ length: 7 - week.length }, () => null)]);
  }
  return weeks;
}

/** "November 2026" */
export function monthLabel(month: IsoDate): string {
  const { year, month: m } = parts(month);
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

/** "Friday 13 November 2026" */
export function dayLabel(date: IsoDate): string {
  const { year, month, day } = parts(date);
  return `${WEEKDAY_NAMES[weekdayIndex(date)]} ${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** "Fri 13 Nov" */
export function shortDayLabel(date: IsoDate): string {
  const { month, day } = parts(date);
  return `${WEEKDAY_NAMES[weekdayIndex(date)].slice(0, 3)} ${day} ${MONTH_NAMES[month - 1].slice(0, 3)}`;
}

/** "2 nights" */
export function nightsLabel(nights: number): string {
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

/** The calendar footer: "2 nights · Fri 13 Nov – Sun 15 Nov". */
export function rangeLabel(stay: Stay): string {
  return `${nightsLabel(nightsBetween(stay.checkIn, stay.checkOut))} · ${shortDayLabel(stay.checkIn)} – ${shortDayLabel(stay.checkOut)}`;
}

/**
 * A short range for summaries and the Dates field (EXPERIENCE.md Formats):
 * "Fri 13 – Sun 15 Nov 2026", "Mon 30 Nov – Wed 2 Dec 2026",
 * "Thu 31 Dec 2026 – Sat 2 Jan 2027".
 */
export function stayLabel(stay: Stay): string {
  const a = parts(stay.checkIn);
  const b = parts(stay.checkOut);
  const start = shortDayLabel(stay.checkIn);
  const end = `${shortDayLabel(stay.checkOut)} ${b.year}`;
  if (a.year !== b.year) return `${start} ${a.year} – ${end}`;
  if (a.month !== b.month) return `${start} – ${end}`;
  return `${start.slice(0, start.lastIndexOf(" "))} – ${end}`;
}

/**
 * The shortest range, for the collapsed search bar on phones: "13–15 Nov",
 * "30 Nov – 2 Dec". Years are left out.
 */
export function compactStayLabel(stay: Stay): string {
  const a = parts(stay.checkIn);
  const b = parts(stay.checkOut);
  const monthB = MONTH_NAMES[b.month - 1].slice(0, 3);
  if (a.year === b.year && a.month === b.month) return `${a.day}–${b.day} ${monthB}`;
  return `${a.day} ${MONTH_NAMES[a.month - 1].slice(0, 3)} – ${b.day} ${monthB}`;
}

/**
 * Applies one pick to a range. The first pick sets check-in and the second
 * sets check-out. A pick on or before check-in, or after a complete range,
 * starts again from check-in.
 */
export function pickDate(range: DateRange, date: IsoDate): DateRange {
  if (!range.checkIn || range.checkOut || !isBefore(range.checkIn, date)) {
    return { checkIn: date, checkOut: null };
  }
  return { checkIn: range.checkIn, checkOut: date };
}

/**
 * Whether a day can't be picked: it is in the past, or check-in is set and
 * the day is more than `MAX_NIGHTS` nights after it.
 */
export function isUnavailable(date: IsoDate, today: IsoDate, range: DateRange): boolean {
  if (isBefore(date, today)) return true;
  if (range.checkIn && !range.checkOut) {
    return nightsBetween(range.checkIn, date) > MAX_NIGHTS;
  }
  return false;
}
