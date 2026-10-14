import { expect, type Page, test } from "@playwright/test";
import { cancellationDeadline, deadlineLabel, instantDateLabel } from "@/domain/cancellation";
import { hotelHref } from "@/domain/criteria";
import type { RoomSelection, Stay } from "@/domain/types";
import {
  blockSeedPhotos,
  bookHref,
  bookingStay,
  bookRoomsElsewhere,
  confirmButton,
  COUPLE,
  fillGuest,
  shownReference,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";

const NOT_FOUND = "We couldn't find that booking. Check the reference and email.";
const NON_REFUNDABLE = "Non-refundable. This booking can't be cancelled.";

test.beforeEach(async ({ page }) => {
  await blockSeedPhotos(page);
});

/** How many Standard Doubles the room table offers for the Stay: its highest quantity. */
async function standardDoublesLeft(page: Page, hotelId: string, stay: Stay): Promise<number> {
  await page.goto(hotelHref(hotelId, { stay, party: COUPLE }));
  const select = page.getByRole("combobox", { name: "Rooms of Standard Double" });
  await expect(select).toBeVisible();
  return Number(await select.locator("option").last().getAttribute("value"));
}

/** Books straight from a `/book` URL and returns the reference on the confirmation. */
async function book(
  page: Page,
  booking: { hotel: string; stay: Stay; sel: RoomSelection[]; email: string; firstName: string },
): Promise<string> {
  await page.goto(bookHref({ hotel: booking.hotel, stay: booking.stay, sel: booking.sel }));
  await fillGuest(page, { firstName: booking.firstName, lastName: "Dlamini", email: booking.email });
  await confirmButton(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  return shownReference(page);
}

/** Fills in the Manage booking form and presses Find booking. */
async function lookUp(page: Page, reference: string, email: string) {
  await page.getByRole("textbox", { name: "Booking reference" }).fill(reference);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Find booking" }).click();
}

// PRD UJ-3, EXPERIENCE.md Flow 3: Sipho cancels.
test("UJ-3: look up a Free cancellation Booking from the header and cancel it", async ({
  page,
}, testInfo) => {
  const stay = bookingStay(testInfo, 10, 2);
  const email = uniqueGuestEmail("sipho");
  const before = await standardDoublesLeft(page, "hotel-005", stay);

  const reference = await book(page, {
    hotel: "hotel-005",
    stay,
    sel: [{ roomTypeId: "hotel-005-standard", quantity: 1 }],
    email,
    firstName: "Sipho",
  });
  // A reload right after confirming is still the confirmation.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  expect(await standardDoublesLeft(page, "hotel-005", stay)).toBe(before - 1);

  // Two weeks later, in a browser that holds nothing.
  await page.context().clearCookies();
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Manage booking" }).click();
  await expect(page).toHaveURL(/\/manage$/);
  await expect(page.getByRole("heading", { level: 1, name: "Manage booking" })).toBeFocused();
  await expect(page).toHaveTitle("Manage booking · CheckInn");

  // A wrong reference and a wrong email read the same, and keep what was typed.
  await lookUp(page, "CI-AAAAAA", email);
  const alert = page.getByRole("group", { name: NOT_FOUND });
  await expect(alert).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toHaveValue("CI-AAAAAA");
  await lookUp(page, reference, uniqueGuestEmail("someone"));
  await expect(alert).toBeFocused();
  await expect(page).toHaveURL(/\/manage$/);

  // The right Booking, typed carelessly.
  await lookUp(page, ` ${reference.slice(3).toLowerCase()} `, email.toUpperCase());
  await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Your booking" })).toBeFocused();
  expect(page.url()).not.toContain("checkinn.test");
  const status = page.getByRole("definition").first();
  await expect(status).toHaveText("Confirmed");
  await expect(page.getByText("Free cancellation", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(`until ${deadlineLabel(cancellationDeadline(stay.checkIn, "14:00"))}`),
  ).toBeVisible();

  // Keep booking first; Escape changes nothing.
  const cancel = page.getByRole("button", { name: "Cancel booking" });
  await cancel.click();
  const dialog = page.getByRole("dialog", { name: "Cancel booking" });
  await expect(dialog).toContainText("Cancel your booking at Coral Coast Resort for");
  await expect(dialog).toContainText("This can't be undone.");
  await expect(dialog.getByRole("button", { name: "Keep booking" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(cancel).toBeFocused();

  // Climax: cancel.
  await cancel.click();
  await dialog.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("group", { name: "Your booking is cancelled." })).toBeFocused();
  await expect(status).toHaveText(`Cancelled on ${instantDateLabel(new Date().toISOString())}`);
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  // The notice leaves the address bar once shown.
  await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));

  // Back shows no dialog, and the Booking stays cancelled.
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);

  // A new search shows the Room back.
  expect(await standardDoublesLeft(page, "hotel-005", stay)).toBe(before);
});

test("Non-refundable shows no cancel button; a lookup leaves another Booking's confirmation", async ({
  page,
}, testInfo) => {
  const stay = bookingStay(testInfo, 11, 2);
  const standard = [{ roomTypeId: "hotel-001-standard", quantity: 1 }];
  const other = bookRoomsElsewhere({ hotelId: "hotel-001", stay, lines: standard });

  const reference = await book(page, {
    hotel: "hotel-001",
    stay,
    sel: standard,
    email: uniqueGuestEmail("thandi"),
    firstName: "Thandi",
  });

  // Looking up someone else's Booking shows its Booking view.
  await page.goto("/manage");
  await lookUp(page, other.reference, other.email);
  await expect(page).toHaveURL(new RegExp(`/bookings/${other.reference}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Your booking" })).toBeVisible();
  await expect(page.getByText(NON_REFUNDABLE)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);

  // The first Booking is still "You're booked!", even after a reload.
  await page.goto(`/bookings/${reference}`);
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();

  // Without the cookies, the Booking asks for a lookup, with its reference filled in.
  await page.context().clearCookies();
  await page.goto(`/bookings/${reference}`);
  await expect(page).toHaveURL(new RegExp(`/manage\\?reference=${reference}$`));
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toHaveValue(reference);
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("");
});
