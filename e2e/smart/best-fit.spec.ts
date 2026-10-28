import { expect, type Page, test } from "@playwright/test";
import { formatZar } from "@/lib/format";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake and whose
// CHECKINN_SEARCH_DEBUG is unset. The UJ-1 Query is a fixture in
// data/eval/fake-provider.json. Read-only: it never books.
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const SMART_PARAMS = ["sq", "smart", "prefs", "maxPrice", "policy", "fallback", "place", "ignored"];

const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const cardNames = (page: Page) => page.getByRole("article").getByRole("link");

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

test.describe("Best-fit room on Smart search cards", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("UJ-1: Winelands shows its Family Room, priced from it, and hands it to the Hotel page", async ({
    page,
  }) => {
    await runUj1(page);
    await expect(heading(page)).toHaveText("1 property found");
    await expect(cardNames(page)).toHaveText(["Winelands Family Lodge"]);

    const card = page.getByRole("article").filter({ hasText: "Winelands Family Lodge" });
    const line = card.getByText("Family Room · 1 room · sleeps 4", { exact: true });
    const stay = card.getByText("2 nights, 4 adults", { exact: true });
    await expect(line).toBeVisible();
    await expect(stay).toBeVisible();
    // The Best-fit room line sits above the stay line, which has no "from".
    expect((await line.boundingBox())!.y).toBeLessThan((await stay.boundingBox())!.y);
    await expect(card.getByText(/: from/)).toHaveCount(0);
    await expect(card.getByText(formatZar(4000), { exact: true })).toBeVisible();
    await expect(card.locator("p", { hasText: "a night" })).toContainText(formatZar(2000));

    const href = await card.getByRole("link").getAttribute("href");
    const link = new URL(href!, page.url());
    expect(link.pathname).toBe("/hotels/hotel-010");
    expect(link.searchParams.get("bestFit")).toBe("hotel-010-family");
    for (const name of SMART_PARAMS) expect(link.searchParams.has(name)).toBe(false);

    // No Score breakdown without the server debug flag.
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(page.getByText(/Score breakdown/)).toHaveCount(0);
  });

  test("no URL parameter turns the Score breakdown on", async ({ page }) => {
    await runUj1(page);
    const smartUrl = page.url();

    for (const extra of ["debug=1", "CHECKINN_SEARCH_DEBUG=1"]) {
      await page.goto(`${smartUrl}&${extra}`);
      await expect(cardNames(page)).toHaveText(["Winelands Family Lodge"]);
      await expect(page.getByText("Family Room · 1 room · sleeps 4")).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByText(/Score breakdown/)).toHaveCount(0);
    }
  });
});
