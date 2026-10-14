import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { hotelHref } from "@/domain/criteria";
import { addDays } from "@/domain/dates";
import type { Stay } from "@/domain/types";
import {
  blockSeedPhotos,
  bookHref,
  bookingCount,
  bookingStay,
  bookingSummary,
  bookRoomsElsewhere,
  confirmButton,
  COUPLE,
  fillGuest,
  shownReference,
  visible,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";

const STANDARD = [{ roomTypeId: "hotel-001-standard", quantity: 1 }];

test.beforeEach(async ({ page }) => {
  await blockSeedPhotos(page);
});

/** Reserve one Standard Double at Harbourlight from the room table: an in-app navigation to /book. */
async function reserveFromHotel(page: Page, stay: Stay) {
  await page.goto(hotelHref("hotel-001", { q: "Cape Town", stay, party: COUPLE, sel: STANDARD }));
  await expect(page.getByRole("combobox", { name: "Rooms of Standard Double" })).toHaveValue("1");
  await visible(page.getByRole("button", { name: "Reserve" })).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
}

/** Confirms the form with a new guest and returns the reference shown. */
async function confirmAs(page: Page, email: string): Promise<string> {
  await fillGuest(page, { firstName: "Thandi", lastName: "Nkosi", email });
  await confirmButton(page).click();
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  return shownReference(page);
}

test.describe("Booking details", () => {
  test("is step 2 with the summary, the statement, a focused headline and a title", async ({
    page,
  }, testInfo) => {
    await reserveFromHotel(page, bookingStay(testInfo, 2));

    await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeFocused();
    await expect(page).toHaveTitle("Your details · Harbourlight Retreat · CheckInn");
    await expect(page.getByRole("list", { name: "Booking steps" }).getByText("2 Your details")).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByText("No payment is taken. This hotel is fictional.")).toBeVisible();
    const summary = bookingSummary(page);
    await expect(summary.getByRole("heading", { name: "Harbourlight Retreat" })).toBeVisible();
    await expect(summary).toContainText("2 nights, 2 adults");
    await expect(summary).toContainText("1 × Standard Double");
    await expect(summary).toContainText(/R\s4\s900,00/);
    await expect(summary).toContainText("Includes taxes. No extra fees.");
    await expect(summary).toContainText("Non-refundable. This booking can't be cancelled.");
    for (const name of ["First name", "Last name", "Email", "Mobile number (optional)", "Special requests (optional)"]) {
      await expect(page.getByRole("textbox", { name })).toBeVisible();
    }
    await expect(
      page.getByRole("combobox", { name: "Estimated arrival time (optional)" }),
    ).toBeVisible();
  });

  test("on a phone the summary comes first and a fixed bar holds the total and Confirm booking", async ({
    page,
    isMobile,
  }, testInfo) => {
    test.skip(!isMobile, "Phone layout only");
    await page.goto(bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 2), sel: STANDARD }));

    const summaryBox = await bookingSummary(page).boundingBox();
    const formBox = await page.getByRole("form", { name: "Your details" }).boundingBox();
    expect(summaryBox!.y).toBeLessThan(formBox!.y);

    const bar = page.getByRole("region", { name: "Booking summary" });
    await expect(bar).toBeInViewport();
    await expect(bar).toContainText(/1 room · R\s4\s900,00/);
    await expect(bar.getByRole("button", { name: "Confirm booking" })).toBeVisible();
    await expect(
      bookingSummary(page).getByRole("button", { name: "Confirm booking" }),
    ).toBeHidden();
  });

  test("reflows at 320px without horizontal scrolling", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 2), sel: STANDARD }));
    await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("an empty submit makes no Booking and focuses a summary that links to each field", async ({
    page,
  }, testInfo) => {
    await page.goto(bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 2), sel: STANDARD }));

    await confirmButton(page).click();

    const summary = page.getByRole("group", { name: "3 details need fixing" });
    await expect(summary).toBeFocused();
    await expect(page).toHaveURL(/\/book\?/);
    await summary.getByRole("link", { name: "Enter your last name." }).click();
    await expect(page.getByRole("textbox", { name: "Last name" })).toBeFocused();
    await expect(summary.getByRole("link")).toHaveText([
      "Enter your first name.",
      "Enter your last name.",
      "Enter your email address.",
    ]);
  });

  test("checks the email when the guest leaves the field", async ({ page }, testInfo) => {
    await page.goto(bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 2), sel: STANDARD }));

    const email = page.getByRole("textbox", { name: "Email" });
    await email.fill("thandi@");
    await email.blur();

    await expect(email).toHaveAccessibleDescription("Enter an email address like name@example.com.");
    await expect(email).toHaveAttribute("aria-invalid", "true");
  });

  test("Back to rooms returns to the room table with the dates, Party and selection", async ({
    page,
  }, testInfo) => {
    const stay = bookingStay(testInfo, 2);
    await reserveFromHotel(page, stay);

    await page.getByRole("link", { name: "Back to rooms" }).click();

    await expect(page).toHaveURL(/\/hotels\/hotel-001\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("checkIn")).toBe(stay.checkIn);
    expect(url.searchParams.get("checkOut")).toBe(stay.checkOut);
    expect(url.searchParams.get("adults")).toBe("2");
    expect(url.searchParams.get("sel")).toBe("hotel-001-standard:1");
    await expect(page.getByRole("combobox", { name: "Rooms of Standard Double" })).toHaveValue("1");
  });

  test("without a valid selection or key it goes back to the room table; an unknown Hotel to search", async ({
    page,
  }, testInfo) => {
    const stay = bookingStay(testInfo, 3);
    const cases = [
      bookHref({ hotel: "hotel-001", stay, sel: null }),
      bookHref({ hotel: "hotel-001", stay, sel: [{ roomTypeId: "hotel-005-standard", quantity: 1 }] }),
      bookHref({ hotel: "hotel-001", stay, sel: STANDARD, k: null }),
    ];
    for (const href of cases) {
      await page.goto(href);
      await expect(page).toHaveURL(/\/hotels\/hotel-001\?.*#availability-hotel-001$/);
      await expect(page.getByRole("heading", { level: 1, name: "Harbourlight Retreat" })).toBeVisible();
      expect(new URL(page.url()).searchParams.get("checkIn")).toBe(stay.checkIn);
    }

    await page.goto(bookHref({ hotel: "nope", stay, sel: STANDARD }));
    await expect(page).toHaveURL(/\/search\?/);
  });

  test("Confirm pressed twice, a refresh and Back all show the one Booking", async ({
    page,
  }, testInfo) => {
    const email = uniqueGuestEmail("double");
    await reserveFromHotel(page, bookingStay(testInfo, 4));
    await fillGuest(page, { firstName: "Thandi", lastName: "Nkosi", email });

    await confirmButton(page).dblclick();
    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
    const reference = await shownReference(page);
    expect(bookingCount(email)).toBe(1);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/book\?/);
    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
    expect(await shownReference(page)).toBe(reference);
    await expect(page.getByRole("form", { name: "Your details" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirm booking" })).toHaveCount(0);
    expect(bookingCount(email)).toBe(1);
  });

  test("Back after a refused try and then a confirm shows the confirmation", async ({
    page,
  }, testInfo) => {
    const email = uniqueGuestEmail("refused");
    await reserveFromHotel(page, bookingStay(testInfo, 5));

    await confirmButton(page).click();
    await expect(page.getByRole("group", { name: "3 details need fixing" })).toBeFocused();
    const reference = await confirmAs(page, email);

    await page.goBack();
    await expect(page).toHaveURL(/\/book\?/);
    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
    expect(await shownReference(page)).toBe(reference);
    await expect(page.getByRole("form", { name: "Your details" })).toHaveCount(0);
    expect(bookingCount(email)).toBe(1);
  });

  test("another browser with a used link sees only that it was confirmed", async ({
    page,
    browser,
  }, testInfo) => {
    const href = bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 6), sel: STANDARD });
    await page.goto(href);
    const reference = await confirmAs(page, uniqueGuestEmail("shared"));

    const other = await browser.newContext();
    try {
      const otherPage = await other.newPage();
      await blockSeedPhotos(otherPage);
      await otherPage.goto(href);

      await expect(
        otherPage.getByRole("heading", { level: 1, name: "This booking is already confirmed" }),
      ).toBeVisible();
      await expect(otherPage).toHaveTitle("This booking is already confirmed · CheckInn");
      await expect(otherPage.getByRole("main").getByRole("link", { name: "Manage booking" })).toHaveAttribute(
        "href",
        "/manage",
      );
      await expect(otherPage.getByRole("main")).not.toContainText(reference);
      await expect(otherPage.getByRole("main")).not.toContainText("Thandi");
      await expect(otherPage.getByRole("form")).toHaveCount(0);

      // Without the token the Booking's own page asks for a lookup instead.
      await otherPage.goto(`/bookings/${reference}`);
      await expect(otherPage).toHaveURL(`/manage?reference=${reference}`);
      await otherPage.goto("/bookings/CI-AAAAAA");
      await expect(otherPage).toHaveURL("/manage?reference=CI-AAAAAA");
    } finally {
      await other.close();
    }
  });

  test("Rooms that run out before Confirm send the guest back with the alert", async ({
    page,
  }, testInfo) => {
    const stay = bookingStay(testInfo, 8);
    await page.goto(bookHref({ hotel: "hotel-001", q: "Cape Town", stay, sel: STANDARD }));
    await fillGuest(page, { firstName: "Thandi", lastName: "Nkosi", email: uniqueGuestEmail("late") });

    // Another visitor takes every Standard Double.
    bookRoomsElsewhere({
      hotelId: "hotel-001",
      stay,
      lines: [{ roomTypeId: "hotel-001-standard", quantity: 10 }],
    });
    await confirmButton(page).click();

    const alert = page.getByRole("group", { name: "Room no longer available" });
    await expect(alert).toContainText(
      "Sorry, the last Standard Double was just booked. Pick another room.",
    );
    await expect(alert).toBeFocused();
    await expect(page).toHaveURL(/\/hotels\/hotel-001\?/);
    expect(new URL(page.url()).searchParams.get("checkIn")).toBe(stay.checkIn);

    // The form itself is no longer offered for those Rooms either.
    await page.goto(bookHref({ hotel: "hotel-001", stay, sel: STANDARD }));
    await expect(page).toHaveURL(/\/hotels\/hotel-001\?/);
    await expect(page.getByRole("group", { name: "Room no longer available" })).toBeVisible();
  });

  test("a passed free-cancellation deadline says so, and the Booking can still be confirmed", async ({
    page,
  }) => {
    const checkIn = addDays(todayIn(), 1);
    await page.goto(
      bookHref({
        hotel: "hotel-005",
        stay: { checkIn, checkOut: addDays(checkIn, 1) },
        sel: [{ roomTypeId: "hotel-005-standard", quantity: 1 }],
      }),
    );

    await expect(bookingSummary(page)).toContainText(/^.*Free cancellation ended on .+, 14:00\./);
    await expect(bookingSummary(page).getByText("Free cancellation", { exact: true })).toHaveCount(0);

    await confirmAs(page, uniqueGuestEmail("late-cancel"));
    await expect(bookingSummary(page)).toContainText("Free cancellation ended on");
  });
});

test.describe("Confirmation", () => {
  test("shows step 3, the reference block, the stored summary and a title naming the reference", async ({
    page,
  }, testInfo) => {
    await reserveFromHotel(page, bookingStay(testInfo, 7));
    const reference = await confirmAs(page, uniqueGuestEmail("confirm"));

    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeFocused();
    await expect(page).toHaveTitle(`Booking ${reference} · CheckInn`);
    await expect(page.getByRole("list", { name: "Booking steps" }).getByText("3 Confirmation")).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByText("Booking reference", { exact: true })).toBeVisible();
    await expect(page.getByText(reference, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage this booking" })).toHaveAttribute(
      "href",
      `/manage?reference=${reference}`,
    );
    const summary = bookingSummary(page);
    await expect(summary.getByRole("heading", { name: "Harbourlight Retreat" })).toBeVisible();
    await expect(summary).toContainText("Guest: Thandi Nkosi");
    await expect(summary).toContainText("1 × Standard Double");
    await expect(summary).toContainText(/R\s4\s900,00/);
    await expect(summary).toContainText("Non-refundable. This booking can't be cancelled.");

    // A lowercase reference opens the same page.
    await page.goto(`/bookings/${reference.toLowerCase()}`);
    await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
    expect(await shownReference(page)).toBe(reference);
  });

  test("COPY copies the reference, or selects it when the clipboard is blocked", async ({
    page,
    context,
  }, testInfo) => {
    await page.goto(bookHref({ hotel: "hotel-001", stay: bookingStay(testInfo, 9), sel: STANDARD }));
    const reference = await confirmAs(page, uniqueGuestEmail("copy"));
    const copy = page.getByRole("button", { name: `Copy booking reference ${reference}` });

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await copy.click();
    await expect(page.getByRole("status").filter({ hasText: "Reference copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);

    await page.addInitScript(() => {
      navigator.clipboard.writeText = () => Promise.reject(new Error("blocked"));
    });
    await page.reload();
    await copy.click();
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString().trim()))
      .toBe(reference);
  });
});
