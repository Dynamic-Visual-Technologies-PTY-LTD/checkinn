/**
 * The only place that reads the current time (AD-9). "Today" is the calendar
 * date in Africa/Johannesburg, wherever the code runs.
 *
 * On the server, call these only after `await io()`, inside `<Suspense>`
 * (AD-2), and never inside `"use cache"`. Tests pass `now`.
 */
import type { IsoDate } from "@/domain/types";

export const TIME_ZONE = "Africa/Johannesburg";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Africa/Johannesburg, as `YYYY-MM-DD`. */
export function todayIn(now: Date = new Date()): IsoDate {
  const parts = Object.fromEntries(
    dateFormat.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** The current instant as an ISO UTC timestamp, for stored times (AD-9). */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}
