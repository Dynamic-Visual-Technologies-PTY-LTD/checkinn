import { expect, test } from "@playwright/test";
import {
  bookingStay,
  bookingSummary,
  confirmButton,
  fillGuest,
  pickStay,
  shownReference,
  visible,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";
import { blockNetwork, expectNoHorizontalScroll } from "../support/network";

// Epic "Done when" 3: with the network blocked, booking (UJ-1) and managing
// the Booking complete. Browsing with the network blocked is in
// e2e/offline.spec.ts; on a phone, booking and cancelling with the network
// blocked is e2e/booking/phone-journey.spec.ts, in the same slot.

const TOTAL = /R\s4\s900,00/;

test("UJ-1 and the Booking lookup complete with the network blocked", async ({
  page,
  baseURL,
}, testInfo) => {
  const network = await blockNetwork(page, baseURL);
  const stay = bookingStay(testInfo, 10, 2);
  const email = uniqueGuestEmail("offline");

  await page.goto("/");
  const bar = page.getByRole("search", { name: "Search hotels" });
  await bar.getByRole("textbox", { name: "Destination" }).fill("Cape Town");
  await bar.getByRole("button", { name: /^Dates/ }).click();
  await pickStay(page, stay);
  await bar.getByRole("button", { name: "Search" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Cape Town: 6 properties found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Harbourlight Retreat" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Harbourlight Retreat" })).toBeVisible();
  await page.getByRole("combobox", { name: "Rooms of Standard Double" }).selectOption("1");
  await visible(page.getByRole("button", { name: "Reserve" })).click();

  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
  await expect(bookingSummary(page)).toContainText(TOTAL);
  await fillGuest(page, { firstName: "Thandi", lastName: "Nkosi", email });
  await confirmButton(page).click();

  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  const reference = await shownReference(page);
  await expect(bookingSummary(page)).toContainText(TOTAL);
  await expectNoHorizontalScroll(page);

  // Manage: look the Booking up and view it.
  await page.getByRole("banner").getByRole("link", { name: "Manage booking" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manage booking" })).toBeVisible();
  await page.getByRole("textbox", { name: "Booking reference" }).fill(reference);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Your booking" })).toBeVisible();
  await expect(page.getByText("Non-refundable. This booking can't be cancelled.")).toBeVisible();
  await expectNoHorizontalScroll(page);

  network.expectClean();
});
