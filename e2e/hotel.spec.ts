import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { DEFAULT_PARTY, hotelHref, searchHref } from "@/domain/criteria";
import { addDays } from "@/domain/dates";

// Seed photos are the only remote requests (AD-17). They are aborted, as at
// the stand without internet, so the photos show their placeholders.
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

const criteria = () => ({ q: "Cape Town", stay: weekendStay(), party: DEFAULT_PARTY });
const harbourlightPath = () => hotelHref("hotel-001", criteria());

function heading(page: Page) {
  return page.getByRole("heading", { level: 1, name: "Harbourlight Retreat" });
}

test.describe("Hotel page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => SEED_PHOTO_HOSTS.has(url.hostname),
      (route) => route.abort(),
    );
  });

  test("Search → Harbourlight Retreat shows its seed details", async ({ page }) => {
    await page.goto(searchHref(criteria()));
    await page
      .getByRole("main")
      .getByRole("article")
      .first()
      .getByRole("link", { name: "Harbourlight Retreat" })
      .click();

    await expect(page).toHaveURL(harbourlightPath());
    await expect(page).toHaveTitle("Harbourlight Retreat · CheckInn");
    await expect(heading(page)).toBeVisible();
    // Client navigation moves focus to the hotel name.
    await expect(heading(page)).toBeFocused();

    // Cache Components keeps the Search results page in the DOM, hidden, so
    // text matches are limited to what is visible.
    const main = page.getByRole("main");
    await expect(main.getByText("luxury", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(main.getByRole("img", { name: "5-star hotel" })).toBeVisible();
    await expect(main.getByText("V&A Waterfront, Cape Town, Western Cape").filter({ visible: true })).toBeVisible();
    await expect(main.getByRole("img", { name: "Resort exterior and swimming pool" })).toBeVisible();

    const reviews = main.getByRole("region", { name: "Guest reviews" });
    await expect(reviews.getByText("4.8", { exact: true })).toBeVisible();
    await expect(reviews.getByText("/ 5", { exact: true })).toBeVisible();
    await expect(reviews.getByText("Superb", { exact: true })).toBeVisible();
    await expect(reviews.getByText("248 reviews", { exact: true })).toBeVisible();
    await expect(reviews.getByText("Rated 4.8 out of 5, Superb, 248 reviews")).toBeAttached();

    const facilities = main.getByRole("region", { name: "Most popular facilities" });
    await expect(facilities.getByRole("listitem")).toHaveCount(5);
    await expect(facilities.getByText("Free Wi-Fi")).toBeVisible();

    await expect(
      main
        .getByText("A fictional coastal retreat with spacious rooms and a relaxed pool terrace.")
        .filter({ visible: true }),
    ).toBeVisible();
    const rules = main.getByRole("region", { name: "House rules" });
    await expect(rules.getByText("From 14:00")).toBeVisible();
    await expect(rules.getByText("Until 10:00")).toBeVisible();
    await expect(rules.getByText("Pets are not allowed")).toBeVisible();
    await expect(
      rules.getByText("Non-refundable. This booking can't be cancelled."),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 2, name: "Availability" }),
    ).toBeAttached();
  });

  test("a direct load keeps focus off the hotel name", async ({ page }) => {
    await page.goto(harbourlightPath());

    await expect(heading(page)).toBeVisible();
    await expect(heading(page)).not.toBeFocused();
  });

  test("Save persists over a reload and toggles off", async ({ page }) => {
    await page.goto(harbourlightPath());
    const save = page.getByRole("button", { name: "Save Harbourlight Retreat" });
    await expect(save).toHaveAttribute("aria-pressed", "false");

    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await expect(save).toHaveAttribute("aria-pressed", "true");

    await save.click();
    await expect(save).toHaveAttribute("aria-pressed", "false");
  });

  test("Share copies the page link and shows the toast", async ({ page, context, baseURL }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(harbourlightPath());

    await page.getByRole("button", { name: "Share" }).click();

    await expect(page.getByRole("status").getByText("Link copied")).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toBe(`${baseURL}${harbourlightPath()}`);
  });

  test("Share falls back to a dialog when the clipboard is blocked", async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "clipboard", {
        configurable: true,
        get: () => undefined,
      });
    });
    await page.goto(harbourlightPath());
    const share = page.getByRole("button", { name: "Share" });

    await share.click();

    const dialog = page.getByRole("dialog", { name: "Copy this link" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Your browser blocked copying. Select the link and copy it."),
    ).toBeVisible();
    const field = dialog.getByRole("textbox", { name: "Hotel page link" });
    const url = `${baseURL}${harbourlightPath()}`;
    await expect(field).toHaveValue(url);
    const selection = await field.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
    expect(selection).toEqual([0, url.length]);
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(share).toBeFocused();
  });

  test("the We Price Match chip explains itself in a dialog", async ({ page }) => {
    await page.goto(harbourlightPath());

    await page.getByRole("button", { name: "We Price Match" }).click();

    const dialog = page.getByRole("dialog", { name: "We Price Match" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "CheckInn is a demo, so no price matching happens. Prices shown are fictional.",
      ),
    ).toBeVisible();
    const close = dialog.getByRole("button", { name: "Close" });
    await expect(close).toBeFocused();
    await close.click();
    await expect(dialog).toBeHidden();
  });

  test("See rooms moves focus to the Availability heading", async ({ page }) => {
    await page.goto(harbourlightPath());

    await page.getByRole("button", { name: "See rooms" }).click();

    const availability = page.getByRole("heading", { level: 2, name: "Availability" });
    await expect(availability).toBeFocused();
    await expect(availability).toBeInViewport();
  });

  test("the photo viewer opens at a photo, steps by keys and buttons, and returns focus", async ({
    page,
  }) => {
    await page.goto(harbourlightPath());
    const photos = page.getByRole("list", { name: "Photos" });
    const first = photos.getByRole("button", { name: "Resort exterior and swimming pool" });

    await first.click();

    const viewer = page.getByRole("dialog", { name: "Harbourlight Retreat photos" });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByRole("img", { name: "Resort exterior and swimming pool" })).toBeVisible();
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();
    await expect(viewer.getByText("1 / 2")).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("Photo 2 of 2")).toBeAttached();
    await expect(viewer.getByRole("img", { name: "Hotel bedroom" })).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();

    await page.keyboard.press("ArrowLeft");
    await expect(viewer.getByText("Photo 2 of 2")).toBeAttached();

    await viewer.getByRole("button", { name: "Next photo" }).click();
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();

    await viewer.getByRole("button", { name: "Previous photo" }).click();
    await expect(viewer.getByText("Photo 2 of 2")).toBeAttached();
    await expect(viewer.getByText("2 / 2")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("Enter on the second photo opens the viewer there", async ({ page }) => {
    await page.goto(harbourlightPath());
    const second = page
      .getByRole("list", { name: "Photos" })
      .getByRole("button", { name: "Hotel bedroom" });

    await second.focus();
    await page.keyboard.press("Enter");

    const viewer = page.getByRole("dialog", { name: "Harbourlight Retreat photos" });
    await expect(viewer.getByText("Photo 2 of 2")).toBeAttached();
    await viewer.getByRole("button", { name: "Close" }).click();
    await expect(viewer).toBeHidden();
    await expect(second).toBeFocused();
  });

  test("on a phone the viewer covers the screen and a swipe changes the photo", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Touch swipe runs in the mobile project.");
    await page.goto(harbourlightPath());
    await page
      .getByRole("list", { name: "Photos" })
      .getByRole("button", { name: "Resort exterior and swimming pool" })
      .click();

    const viewer = page.getByRole("dialog", { name: "Harbourlight Retreat photos" });
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();
    const viewport = page.viewportSize();
    const box = await viewer.boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width: viewport?.width, height: viewport?.height });

    // Playwright has no swipe, so the touch points go through the DevTools protocol.
    const photo = await viewer
      .getByRole("img", { name: "Resort exterior and swimming pool" })
      .boundingBox();
    if (!photo) throw new Error("The photo has no box");
    const y = photo.y + photo.height / 2;
    const cdp = await page.context().newCDPSession(page);
    const drag = async (fromX: number, toX: number) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: fromX, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: toX, y }],
      });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const centre = photo.x + photo.width / 2;

    await drag(centre + 60, centre - 60);
    await expect(viewer.getByText("Photo 2 of 2")).toBeAttached();

    await drag(centre - 60, centre + 60);
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();

    await drag(centre + 15, centre - 15);
    await expect(viewer.getByText("Photo 1 of 2")).toBeAttached();
  });

  test("other Hotels show their own Facilities and rules", async ({ page }) => {
    await page.goto("/hotels/hotel-002");
    await expect(
      page.getByRole("heading", { level: 1, name: "Table View City Lodge" }),
    ).toBeVisible();
    await expect(page.getByText("Swimming pool")).toHaveCount(0);

    await page.goto("/hotels/hotel-010");
    await expect(page.getByText("Pets are welcome")).toBeVisible();
  });

  test("an unknown Hotel shows the not-found page", async ({ page }) => {
    // Streaming may already have started, so the status can be 200 (Next.js
    // not-found docs); the heading is what the guest sees.
    await page.goto("/hotels/nope");

    await expect(
      page.getByRole("heading", { level: 1, name: "We can't find that page." }),
    ).toBeVisible();
  });
});
