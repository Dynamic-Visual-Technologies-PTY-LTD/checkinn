import { randomBytes, randomUUID } from "node:crypto";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import Database from "better-sqlite3";
import { openDb } from "@/db/client";
import { bookingLines, bookings } from "@/db/schema";
import { todayIn } from "@/domain/clock";
import { serializeCriteria } from "@/domain/criteria";
import { addDays, dayLabel } from "@/domain/dates";
import type { Party, RoomSelection, Stay } from "@/domain/types";
import { E2E_DB_PATH } from "./db";

/**
 * Helpers for the booking specs in `e2e/booking/` (AD-18). They create
 * Bookings, so each test books its own dates: never the read-only specs'
 * days +3 to +5, and never another project's or retry's.
 */

// Seed photos are the only remote requests (AD-17); they are aborted, as at
// the stand without internet.
const SEED_PHOTO_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

export async function blockSeedPhotos(page: Page) {
  await page.route(
    (url) => SEED_PHOTO_HOSTS.has(url.hostname),
    (route) => route.abort(),
  );
}

/** Days in each project and retry's window; 10 slots of 5 days. */
const WINDOW_DAYS = 50;
const SLOT_DAYS = 5;
const FIRST_DAY = 20;

/**
 * A Stay from day +20 onwards that no other test, project or retry books:
 * each (project, retry) pair gets a 50-day window, and each test a numbered
 * 5-day slot in it (0 to 9). Stays up to 5 nights fit a slot. Windows stay
 * within the phone calendar's 12 months.
 */
export function bookingStay(testInfo: TestInfo, slot: number, nights = 2): Stay {
  if (slot < 0 || slot >= WINDOW_DAYS / SLOT_DAYS || nights > SLOT_DAYS) {
    throw new Error(`No room for slot ${slot} with ${nights} nights`);
  }
  const project = testInfo.project.name === "booking-mobile" ? 1 : 0;
  const window = project + 2 * testInfo.retry;
  const checkIn = addDays(todayIn(), FIRST_DAY + window * WINDOW_DAYS + slot * SLOT_DAYS);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

export const COUPLE: Party = { adults: 2, children: 0, rooms: 1 };

/** A `/book` URL as `startBooking` builds it, with a fresh idempotency key. */
export function bookHref({
  hotel,
  stay,
  party = COUPLE,
  sel,
  q = "",
  k = randomUUID(),
}: {
  hotel: string;
  stay: Stay | null;
  party?: Party;
  sel: RoomSelection[] | null;
  q?: string;
  k?: string | null;
}): string {
  return `/book?${serializeCriteria({ q, stay, party, hotel, sel, k })}`;
}

/** The control visible at this width: the summary panel's from 768px, else the bar's. */
export function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

export function confirmButton(page: Page): Locator {
  return visible(page.getByRole("button", { name: /^(Confirm booking|Confirming…)$/ }));
}

export function bookingSummary(page: Page): Locator {
  return page.getByRole("complementary", { name: "Booking summary" });
}

export async function fillGuest(
  page: Page,
  guest: { firstName: string; lastName: string; email: string },
) {
  await page.getByRole("textbox", { name: "First name" }).fill(guest.firstName);
  await page.getByRole("textbox", { name: "Last name" }).fill(guest.lastName);
  await page.getByRole("textbox", { name: "Email" }).fill(guest.email);
}

/** The reference shown on the confirmation, e.g. "CI-7K3P9Q". */
export async function shownReference(page: Page): Promise<string> {
  const button = page.getByRole("button", { name: /^Copy booking reference CI-/ });
  await expect(button).toBeVisible();
  const name = (await button.getAttribute("aria-label")) ?? "";
  const reference = name.replace("Copy booking reference ", "");
  expect(reference).toMatch(/^CI-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  return reference;
}

/** Picks a Stay in the open range calendar, moving month by month on desktop. */
export async function pickStay(page: Page, stay: Stay) {
  const calendar = page.getByRole("dialog");
  for (const date of [stay.checkIn, stay.checkOut]) {
    const day = calendar.locator(`[aria-label^="${dayLabel(date)}"]`);
    const next = calendar.getByRole("button", { name: "Next month" });
    // Desktop shows two months with Next month; a phone sheet lists 12.
    for (let i = 0; i < 13 && (await day.count()) === 0 && (await next.count()) > 0; i += 1) {
      await next.click();
    }
    await day.click();
  }
  await calendar.getByRole("button", { name: "Done" }).click();
  await expect(calendar).toBeHidden();
}

/** How many Bookings a guest email has, read straight from the e2e database. */
export function bookingCount(email: string): number {
  const db = new Database(E2E_DB_PATH, { readonly: true, fileMustExist: true });
  try {
    const row = db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE email = ?").get(email) as {
      count: number;
    };
    return row.count;
  } finally {
    db.close();
  }
}

/**
 * Books Rooms outside the browser, straight into the e2e database, as another
 * visitor would. Only for setting up the room-ran-out case.
 */
export function bookRoomsElsewhere(booking: {
  hotelId: string;
  stay: Stay;
  lines: RoomSelection[];
}) {
  const db = openDb(E2E_DB_PATH);
  try {
    const code = randomBytes(8).toString("hex");
    db.transaction((tx) => {
      const row = tx
        .insert(bookings)
        .values({
          reference: `CI-E2E${code.slice(0, 6).toUpperCase()}`,
          idempotencyKey: `e2e-${code}`,
          accessToken: `e2e-${code}`,
          hotelId: booking.hotelId,
          status: "confirmed",
          checkIn: booking.stay.checkIn,
          checkOut: booking.stay.checkOut,
          adults: 2,
          children: 0,
          rooms: booking.lines.reduce((sum, line) => sum + line.quantity, 0),
          firstName: "Other",
          lastName: "Visitor",
          email: `other-${code}@checkinn.test`,
          bookingTotalRand: 0,
          cancellationPolicy: "non_refundable",
          createdAt: new Date().toISOString(),
        })
        .returning({ id: bookings.id })
        .get();
      tx.insert(bookingLines)
        .values(
          booking.lines.map((line) => ({
            bookingId: row.id,
            roomTypeId: line.roomTypeId,
            quantity: line.quantity,
            unitPriceRand: 0,
            lineTotalRand: 0,
          })),
        )
        .run();
    });
  } finally {
    db.$client.close();
  }
}
