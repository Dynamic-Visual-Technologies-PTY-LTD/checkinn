import { exec } from "node:child_process";
import { promisify } from "node:util";
import { expect, type Page, test } from "@playwright/test";
import Database from "better-sqlite3";
import { hotelHref } from "@/domain/criteria";
import type { Stay } from "@/domain/types";
import { loadSeed } from "@/db/seed";
import {
  bookHref,
  blockSeedPhotos,
  bookingStay,
  confirmButton,
  COUPLE,
  fillGuest,
  shownReference,
} from "../support/booking";
import { E2E_DB_PATH } from "../support/db";
import { uniqueGuestEmail } from "../support/guest";

// Epic "Done when" 4: `npm run db:reset` while the app runs restores
// fresh-clone results with no Bookings.
//
// The reset empties every Booking in the e2e database, so this spec must not
// break the specs around it. That holds because:
// - the booking projects run one test at a time (`workers: 1`) and only after
//   the read-only projects finish, so nothing else is mid-flow during a reset;
// - every booking spec makes the Bookings it checks inside its own test, in
//   its own slot, and never reads one made by another test or by global setup
//   (which adds none). A reset between two tests leaves the next one the same
//   fresh catalog global setup gave the first.

const execAsync = promisify(exec);

const HOTEL = "hotel-001";
const ROOM_TYPE = "hotel-001-standard";
const NOT_FOUND = "We couldn't find that booking. Check the reference and email.";

test.beforeEach(async ({ page }) => {
  await blockSeedPhotos(page);
});

/** How many Standard Doubles the room table offers for the Stay: its highest quantity. */
async function standardDoublesLeft(page: Page, stay: Stay): Promise<number> {
  await page.goto(hotelHref(HOTEL, { stay, party: COUPLE }));
  const select = page.getByRole("combobox", { name: "Rooms of Standard Double" });
  await expect(select).toBeVisible();
  return Number(await select.getByRole("option").last().getAttribute("value"));
}

function bookingRows(): number {
  const db = new Database(E2E_DB_PATH, { readonly: true, fileMustExist: true });
  try {
    return (db.prepare("SELECT COUNT(*) AS count FROM bookings").get() as { count: number }).count;
  } finally {
    db.close();
  }
}

test("npm run db:reset while the server runs restores the seed and removes every Booking", async ({
  page,
}, testInfo) => {
  // The reset is a separate tsx process; give it room on a slow machine.
  test.setTimeout(120_000);
  const stay = bookingStay(testInfo, 14, 2);
  const email = uniqueGuestEmail("reset");
  const seeded = loadSeed()
    .hotels.find((hotel) => hotel.id === HOTEL)
    ?.roomTypes.find((roomType) => roomType.id === ROOM_TYPE)?.totalRooms;
  expect(seeded).toBeGreaterThan(1);
  expect(await standardDoublesLeft(page, stay)).toBe(seeded);

  // A Booking lowers the Standard Double's Availability.
  await page.goto(bookHref({ hotel: HOTEL, stay, sel: [{ roomTypeId: ROOM_TYPE, quantity: 1 }] }));
  await fillGuest(page, { firstName: "Reset", lastName: "Check", email });
  await confirmButton(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  const reference = await shownReference(page);
  expect(await standardDoublesLeft(page, stay)).toBe(seeded! - 1);
  expect(bookingRows()).toBeGreaterThan(0);

  // The real command, against the e2e database, with the server still up.
  const { stdout } = await execAsync("npm run db:reset", {
    env: { ...process.env, CHECKINN_DB_PATH: E2E_DB_PATH },
  });
  expect(stdout).toContain(`Reset ${E2E_DB_PATH}: 20 cities, 120 hotels`);
  expect(bookingRows()).toBe(0);

  // The running server shows the seed on its next request.
  await page.reload();
  const select = page.getByRole("combobox", { name: "Rooms of Standard Double" });
  await expect(select.getByRole("option").last()).toHaveAttribute("value", String(seeded));

  // The Booking's reference no longer resolves.
  await page.goto("/manage");
  await page.getByRole("textbox", { name: "Booking reference" }).fill(reference);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page.getByRole("group", { name: NOT_FOUND })).toBeFocused();

  // A default search shows the whole catalog.
  await page.goto("/search");
  await expect(
    page.getByRole("heading", { level: 1, name: "All destinations: 120 properties found" }),
  ).toBeVisible();
});
