import { expect, type Locator, type Page, test } from "@playwright/test";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake. The UJ-1
// Query is a fixture in data/eval/fake-provider.json. Read-only: Reserve only
// starts a Booking, and the spec stops at the /book URL.
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const SMART_PARAMS = ["sq", "smart", "prefs", "maxPrice", "policy", "fallback", "place", "ignored"];
const CHIP = "Best fit for your search";
const PICKED = "Family Room picked for your search. Change it in the table.";

async function runUj1(page: Page) {
  await page.goto("/");
  await page
    .getByRole("list", { name: "Try an example" })
    .getByRole("button", { name: UJ1 })
    .click();
  await page.waitForURL(/\/search\?/);
  // Interpreted, so not the fallback page.
  const params = new URL(page.url()).searchParams;
  expect(params.get("smart")).toBe("1");
  expect(params.has("fallback")).toBe(false);
}

/** UJ-1, then the Winelands Family Lodge card: the Hotel page with bestFit. */
async function openWinelands(page: Page) {
  await runUj1(page);
  await page
    .getByRole("article")
    .filter({ hasText: "Winelands Family Lodge" })
    .getByRole("link")
    .click();
  await page.waitForURL(/\/hotels\/hotel-010\?/);
  expect(new URL(page.url()).searchParams.get("bestFit")).toBe("hotel-010-family");
}

function section(page: Page) {
  return page.getByRole("region", { name: "Availability" });
}

function familySelect(page: Page) {
  return section(page).getByRole("combobox", { name: "Rooms of Family Room" });
}

/** Where Reserve sits at this width: the side panel from 768px, else the bar. */
function reserveArea(page: Page, isMobile: boolean) {
  return isMobile
    ? page.getByRole("region", { name: "Booking summary" })
    : page.getByRole("complementary", { name: "Booking summary" });
}

/**
 * The booking summary a guest can read: the side panel on desktop, the sheet
 * behind the summary bar on a phone (opened here).
 */
async function fullSummary(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.getByRole("complementary", { name: "Booking summary" });
  await page
    .getByRole("region", { name: "Booking summary" })
    .getByRole("button", { name: /Show full summary/ })
    .click();
  return page.getByRole("dialog", { name: "Booking summary" });
}

async function closeSummary(page: Page, isMobile: boolean) {
  if (isMobile) await page.keyboard.press("Escape");
}

test.describe("Best-fit pre-selection on the Hotel page", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("UJ-1: the Family Room arrives selected, marked, explained and ready to Reserve", async ({
    page,
    isMobile,
  }) => {
    await openWinelands(page);

    await expect(familySelect(page)).toHaveValue("1");
    await expect(familySelect(page)).toHaveAccessibleDescription(CHIP);
    await expect(
      section(page).getByRole("rowheader").filter({ hasText: "Family Room" }).getByText(CHIP),
    ).toBeVisible();
    await expect(reserveArea(page, isMobile).getByRole("button", { name: "Reserve" })).not.toHaveAttribute(
      "aria-disabled",
    );
    const summary = await fullSummary(page, isMobile);
    await expect(summary.getByText(PICKED)).toBeVisible();
    await closeSummary(page, isMobile);
    // Not written to the URL until the Guest changes a quantity.
    expect(new URL(page.url()).searchParams.has("sel")).toBe(false);
  });

  test("a quantity change drops the line, keeps the chip, and a reload keeps both", async ({
    page,
    isMobile,
  }) => {
    await openWinelands(page);
    await expect(familySelect(page)).toHaveValue("1");

    await familySelect(page).selectOption("2");

    await expect(familySelect(page)).toHaveAccessibleDescription(CHIP);
    await expect(page.getByText(PICKED)).toHaveCount(0);
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sel"))
      .toBe("hotel-010-family:2");
    expect(new URL(page.url()).searchParams.get("bestFit")).toBe("hotel-010-family");

    await page.reload();

    await expect(familySelect(page)).toHaveValue("2");
    await expect(familySelect(page)).toHaveAccessibleDescription(CHIP);
    const summary = await fullSummary(page, isMobile);
    await expect(summary.getByText("2 × Family Room")).toBeVisible();
    await expect(page.getByText(PICKED)).toHaveCount(0);
  });

  test("clearing the pick keeps the chip and bestFit, and a reload pre-selects again", async ({
    page,
    isMobile,
  }) => {
    await openWinelands(page);
    await expect(familySelect(page)).toHaveValue("1");

    await familySelect(page).selectOption("0");

    await expect(page.getByText(PICKED)).toHaveCount(0);
    await expect(familySelect(page)).toHaveAccessibleDescription(CHIP);
    await expect(
      section(page).getByRole("rowheader").filter({ hasText: "Family Room" }).getByText(CHIP),
    ).toBeVisible();
    // The MVP sel codec cannot hold an empty choice (AD-8): no sel is written.
    await expect.poll(() => new URL(page.url()).searchParams.has("sel")).toBe(false);
    expect(new URL(page.url()).searchParams.get("bestFit")).toBe("hotel-010-family");

    await page.reload();

    await expect(familySelect(page)).toHaveValue("1");
    await expect(familySelect(page)).toHaveAccessibleDescription(CHIP);
    const summary = await fullSummary(page, isMobile);
    await expect(summary.getByText(PICKED)).toBeVisible();
  });

  test("Reserve leads to /book with no bestFit and no Smart parameter, nor in its back link", async ({
    page,
    isMobile,
  }) => {
    await openWinelands(page);
    await expect(familySelect(page)).toHaveValue("1");

    await reserveArea(page, isMobile).getByRole("button", { name: "Reserve" }).click();
    await page.waitForURL(/\/book\?/);

    const params = new URL(page.url()).searchParams;
    expect(params.get("sel")).toBe("hotel-010-family:1");
    for (const name of ["bestFit", ...SMART_PARAMS]) expect(params.has(name)).toBe(false);

    const back = await page.getByRole("link", { name: "Back to rooms" }).getAttribute("href");
    const backUrl = new URL(back!, page.url());
    expect(backUrl.pathname).toBe("/hotels/hotel-010");
    for (const name of ["bestFit", ...SMART_PARAMS]) expect(backUrl.searchParams.has(name)).toBe(false);
  });

  test("an unknown bestFit selects nothing and shows no chip", async ({ page, isMobile }) => {
    await openWinelands(page);
    const url = new URL(page.url());
    url.searchParams.set("bestFit", "nope");

    await page.goto(url.toString());

    const selects = section(page).getByRole("combobox", { name: /^Rooms of / });
    await expect(selects).toHaveCount(2);
    for (const select of await selects.all()) await expect(select).toHaveValue("0");
    await expect(section(page).getByText(CHIP)).toHaveCount(0);
    await expect(page.getByText(/picked for your search/)).toHaveCount(0);
    const summary = await fullSummary(page, isMobile);
    await expect(summary.getByText("0 rooms selected")).toBeVisible();
    await expect(summary.getByRole("listitem")).toHaveCount(0);
  });
});
