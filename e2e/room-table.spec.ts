import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { hotelHref } from "@/domain/criteria";
import { addDays, dayLabel } from "@/domain/dates";

// Seed photos are the only remote requests (AD-17); they are aborted, as at
// the stand without internet.
const SEED_PHOTO_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

/** A 2-night Stay from 3 days out, so it is never in the past. */
function weekendStay() {
  const today = todayIn();
  return { checkIn: addDays(today, 3), checkOut: addDays(today, 5) };
}

const COUPLE = { adults: 2, children: 0, rooms: 1 };
const FAMILY_OF_FIVE = { adults: 3, children: 2, rooms: 1 };

function section(page: Page) {
  return page.getByRole("region", { name: "Availability" });
}

/** The summary visible at this width: the panel from 768px, else the bar. */
function summary(page: Page, isMobile: boolean) {
  return isMobile
    ? page.getByRole("region", { name: "Booking summary" })
    : page.getByRole("complementary", { name: "Booking summary" });
}

test.describe("Room table, selection and Reserve", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => SEED_PHOTO_HOSTS.has(url.hostname),
      (route) => route.abort(),
    );
  });

  test("shows priced rows, and a sold-out Family Room at Table View City Lodge", async ({
    page,
  }) => {
    await page.goto(hotelHref("hotel-002", { stay: weekendStay(), party: COUPLE }));
    const rooms = section(page);

    await expect(rooms.getByRole("heading", { level: 3, name: "Standard Double" })).toBeVisible();
    await expect(rooms.getByRole("combobox", { name: "Rooms of Standard Double" })).toBeVisible();
    await expect(rooms.getByText("Sold out for your dates")).toBeVisible();
    await expect(rooms.getByRole("combobox", { name: "Rooms of Family Room" })).toHaveCount(0);
  });

  test("Harbourlight Retreat prices one room for the Stay", async ({ page }) => {
    await page.goto(hotelHref("hotel-001", { stay: weekendStay(), party: COUPLE }));
    const rooms = section(page);

    await expect(rooms.getByText("4 900 rand")).toBeAttached();
    await expect(rooms.getByText("6 000 rand")).toBeAttached();
    await expect(
      rooms.getByRole("combobox", { name: "Rooms of Standard Double" }).getByRole("option"),
    ).toHaveCount(11);
    await expect(
      rooms.getByRole("combobox", { name: "Rooms of Family Room" }).getByRole("option"),
    ).toHaveCount(5);
  });

  test("Coral Coast: a party that does not fit blocks Reserve until it does, then lands on /book", async ({
    page,
    isMobile,
  }) => {
    await page.goto(hotelHref("hotel-005", { stay: weekendStay(), party: FAMILY_OF_FIVE }));
    const bar = summary(page, isMobile);
    const reserve = bar.getByRole("button", { name: "Reserve" });

    await expect(reserve).toHaveAttribute("aria-disabled", "true");
    await expect(bar.getByText("Select at least one room.")).toBeVisible();
    await reserve.click({ force: true });
    await expect(page).toHaveURL(/\/hotels\/hotel-005/);

    const history = await page.evaluate(() => window.history.length);
    await page.getByRole("combobox", { name: "Rooms of Family Room" }).selectOption("1");
    await expect(
      bar.getByText("These rooms sleep 4. Your party is 5. Add a room or pick a bigger one."),
    ).toBeVisible();
    await expect(reserve).toHaveAttribute("aria-disabled", "true");

    await page.getByRole("combobox", { name: "Rooms of Standard Double" }).selectOption("1");
    await expect(reserve).not.toHaveAttribute("aria-disabled", "true");
    // The selection replaces the URL: it is there, and Back stays one step.
    const sel = new URL(page.url()).searchParams.get("sel");
    expect(sel).toBe("hotel-005-standard:1,hotel-005-family:1");
    expect(await page.evaluate(() => window.history.length)).toBe(history);

    await reserve.click();
    await page.waitForURL(/\/book\?/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/book");
    expect(url.searchParams.get("hotel")).toBe("hotel-005");
    expect(url.searchParams.get("sel")).toBe(sel);
    expect(url.searchParams.get("k")).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("a selection in the URL comes back selected, with the total in the summary", async ({
    page,
    isMobile,
  }) => {
    await page.goto(
      hotelHref("hotel-001", {
        stay: weekendStay(),
        party: COUPLE,
        sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
      }),
    );

    await expect(page.getByRole("combobox", { name: "Rooms of Standard Double" })).toHaveValue("1");
    const bar = summary(page, isMobile);
    await expect(bar).toContainText("1 room");
    await expect(bar).toContainText(/R\s4\s900,00/);
  });

  test("without dates, rows have no prices and Show prices opens the calendar", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/hotels/hotel-001");
    const rooms = section(page);

    await expect(
      rooms.getByText("Select dates to see this property's availability and prices"),
    ).toBeVisible();
    await expect(rooms.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reserve" })).toHaveCount(0);

    await rooms.getByRole("button", { name: "Show prices" }).first().click();
    const calendar = isMobile
      ? page.getByRole("dialog", { name: "Select dates" })
      : page.getByRole("dialog", { name: "Dates" });
    await expect(calendar).toBeVisible();
  });

  test("a stale link shows the no-dates table and the Coral message under Dates", async ({
    page,
  }) => {
    await page.goto("/hotels/hotel-001?checkIn=2020-01-01&checkOut=2020-01-03");
    const rooms = section(page);

    await expect(rooms.getByText("Those dates have passed. Pick new ones.")).toBeVisible();
    await expect(
      rooms.getByText("Select dates to see this property's availability and prices"),
    ).toBeVisible();
    await expect(rooms.getByRole("combobox")).toHaveCount(0);
  });

  test("changing Occupancy pushes the URL and keeps focus on the picker", async ({ page }) => {
    await page.goto(hotelHref("hotel-001", { stay: weekendStay(), party: COUPLE }));
    const rooms = section(page);
    const occupancy = rooms.getByRole("button", { name: /Occupancy/ });

    await occupancy.click();
    await page.getByRole("button", { name: "Increase adults" }).click();
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page).toHaveURL(/adults=3/);
    await expect(occupancy).toBeFocused();
    await expect(occupancy).toContainText("3 adults");
    // The picker was not remounted, so the heading is still there too.
    await expect(rooms.getByRole("heading", { level: 2, name: "Availability" })).toBeVisible();
  });

  test("changing Dates pushes the URL, keeps focus on the field and reprices the table", async ({
    page,
  }) => {
    const stay = weekendStay();
    const longer = { checkIn: stay.checkIn, checkOut: addDays(stay.checkIn, 3) };
    await page.goto(hotelHref("hotel-001", { stay, party: COUPLE }));
    const rooms = section(page);
    await expect(rooms.getByText("4 900 rand")).toBeAttached();
    const history = await page.evaluate(() => window.history.length);

    const dates = rooms.getByRole("button", { name: /^Dates/ });
    await dates.click();
    const calendar = page.getByRole("dialog");
    await calendar.locator(`[aria-label^="${dayLabel(longer.checkIn)}"]`).click();
    await calendar.locator(`[aria-label^="${dayLabel(longer.checkOut)}"]`).click();
    await calendar.getByRole("button", { name: "Done" }).click();

    await expect(page).toHaveURL(new RegExp(`checkOut=${longer.checkOut}`));
    expect(await page.evaluate(() => window.history.length)).toBe(history + 1);
    await expect(dates).toBeFocused();
    await expect(rooms.getByText("7 350 rand")).toBeAttached();
    await expect(dates).toBeFocused();
  });

  test("an alert names the Room type that ran out and takes focus", async ({ page }) => {
    await page.goto(
      `${hotelHref("hotel-001", { stay: weekendStay(), party: COUPLE })}&notice=room-unavailable&rt=hotel-001-standard`,
    );

    const alert = page.getByRole("group", { name: "Room no longer available" });
    await expect(alert).toContainText(
      "Sorry, the last Standard Double was just booked. Pick another room.",
    );
    await expect(alert).toBeFocused();
  });

  test("on a phone the rooms are cards with a fixed summary bar and a summary sheet", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Phone layout only");
    await page.goto(
      hotelHref("hotel-001", {
        stay: weekendStay(),
        party: COUPLE,
        sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
      }),
    );

    await expect(page.getByRole("heading", { level: 3, name: "Family Room" })).toBeVisible();
    const bar = page.getByRole("region", { name: "Booking summary" });
    await expect(bar).toBeInViewport();
    await bar
      .getByRole("button", { name: /^1 room, 4\s900 rand\. Show full summary$/ })
      .click();

    const sheet = page.getByRole("dialog", { name: "Booking summary" });
    await expect(sheet.getByText("1 × Standard Double")).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
  });
});
