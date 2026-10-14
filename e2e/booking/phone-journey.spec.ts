import { expect, test } from "@playwright/test";
import {
  bookingStay,
  confirmButton,
  fillGuest,
  pickStay,
  shownReference,
  visible,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";
import { blockNetwork, expectNoHorizontalScroll } from "../support/network";

// The whole guest journey on a 390px phone, from Home to a cancelled Booking:
// the collapsed search bar, the room cards, the mobile summary bar and the
// sheets, with no horizontal scroll on any step. The network is blocked
// throughout (epic "Done when" 3), so booking and cancelling also run as at
// the stand without internet.

test.use({ viewport: { width: 390, height: 844 } });

test("a phone guest searches, books a Free cancellation stay, finds it and cancels it", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "booking-mobile", "The phone journey runs on booking-mobile.");
  const network = await blockNetwork(page, baseURL);
  const stay = bookingStay(testInfo, 10, 2);
  const email = uniqueGuestEmail("phone");

  // Home: the full search bar, with the calendar as a sheet.
  await page.goto("/");
  await expectNoHorizontalScroll(page);
  const bar = page.getByRole("search", { name: "Search hotels" });
  await bar.getByRole("textbox", { name: "Destination" }).fill("Durban");
  await bar.getByRole("button", { name: /^Dates/ }).click();
  await expect(page.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  await pickStay(page, stay);
  await bar.getByRole("button", { name: "Search" }).click();

  // Search results: the bar starts collapsed to a summary line.
  await expect(
    page.getByRole("heading", { level: 1, name: "Durban: 2 properties found" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Change search: Durban · / })).toBeVisible();
  await expect(bar).toBeHidden();
  await expectNoHorizontalScroll(page);
  await page.getByRole("link", { name: "Coral Coast Resort" }).click();

  // Hotel page: rooms are cards; the summary bar holds Reserve.
  await expect(page.getByRole("heading", { level: 1, name: "Coral Coast Resort" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Standard Double" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("combobox", { name: "Rooms of Standard Double" }).selectOption("1");
  const summaryBar = page.getByRole("region", { name: "Booking summary" });
  await expect(summaryBar).toBeInViewport();
  await summaryBar.getByRole("button", { name: /^1 room, .* Show full summary$/ }).click();
  const sheet = page.getByRole("dialog", { name: "Booking summary" });
  await expect(sheet.getByText("1 × Standard Double")).toBeVisible();
  await expect(sheet.getByText("Free cancellation", { exact: true }).first()).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
  await visible(summaryBar.getByRole("button", { name: "Reserve" })).click();

  // Booking details: the guest form, confirmed from the summary bar.
  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await fillGuest(page, { firstName: "Sipho", lastName: "Dlamini", email });
  await confirmButton(page).click();

  // Confirmation.
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  const reference = await shownReference(page);
  await expectNoHorizontalScroll(page);

  // Manage booking from the header, in a browser that holds no access cookie.
  await page.context().clearCookies();
  await page.getByRole("banner").getByRole("link", { name: "Manage booking" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Manage booking" })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await page.getByRole("textbox", { name: "Booking reference" }).fill(reference);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page).toHaveURL(new RegExp(`/bookings/${reference}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Your booking" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Cancel, through the confirmation dialog.
  await page.getByRole("button", { name: "Cancel booking" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel booking" });
  await expect(dialog.getByRole("button", { name: "Keep booking" })).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("group", { name: "Your booking is cancelled." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  await expectNoHorizontalScroll(page);
  network.expectClean();
});
