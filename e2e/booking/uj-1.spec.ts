import { expect, test } from "@playwright/test";
import {
  blockSeedPhotos,
  bookingStay,
  bookingSummary,
  confirmButton,
  fillGuest,
  pickStay,
  shownReference,
  visible,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";

const TOTAL = /R\s4\s900,00/;

test.beforeEach(async ({ page }) => {
  await blockSeedPhotos(page);
});

// PRD UJ-1, EXPERIENCE.md Flow 1: Thandi books a weekend in Cape Town.
test("UJ-1: a 2-night Cape Town Stay at Harbourlight Retreat, booked from Home", async ({
  page,
}, testInfo) => {
  const stay = bookingStay(testInfo, 0, 2);
  const email = uniqueGuestEmail("thandi");

  await page.goto("/");
  const bar = page.getByRole("search", { name: "Search hotels" });
  await bar.getByRole("textbox", { name: "Destination" }).fill("Cape Town");
  await bar.getByRole("button", { name: /^Dates/ }).click();
  await pickStay(page, stay);
  await bar.getByRole("button", { name: "Search" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Cape Town: 2 properties found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Harbourlight Retreat" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Harbourlight Retreat" })).toBeVisible();
  await page.getByRole("combobox", { name: "Rooms of Standard Double" }).selectOption("1");
  await visible(page.getByRole("button", { name: "Reserve" })).click();

  // Step 2: the summary and the Non-refundable line.
  const details = page.getByRole("heading", { level: 1, name: "Your details" });
  await expect(details).toBeVisible();
  const summary = bookingSummary(page);
  await expect(summary).toContainText(TOTAL);
  await expect(summary).toContainText("Non-refundable. This booking can't be cancelled.");

  await fillGuest(page, { firstName: "Thandi", lastName: "Nkosi", email });
  await confirmButton(page).click();

  // Step 3: the confirmation with a reference and the same total.
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  const reference = await shownReference(page);
  await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));
  await expect(bookingSummary(page)).toContainText("1 × Standard Double");
  await expect(bookingSummary(page)).toContainText(TOTAL);
  await expect(bookingSummary(page)).toContainText("Guest: Thandi Nkosi");
});
