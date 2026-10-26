import { expect, type Page, test } from "@playwright/test";
import { criterionLabel } from "@/domain/hard-criteria";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake. The UJ-1
// Query is a fixture in data/eval/fake-provider.json. Read-only: it never
// books.
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const MAX_CHIP = `Remove ${criterionLabel("maxPrice", 2000)}`;
const PETS_CHIP = "Remove Pets allowed";

const smartBox = (page: Page) => page.getByRole("textbox", { name: "Describe your stay" });
const chipRow = (page: Page) => page.getByRole("list", { name: "Your filters" });
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const cardNames = (page: Page) => page.getByRole("article").getByRole("link");

/** On a phone the Search bar starts as a summary; expand it first. */
async function searchBar(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: /^Change search/ }).click();
  return page.getByRole("search", { name: "Search hotels" });
}

function params(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

test.describe("Hard criteria, Criteria chips and corrections", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("UJ-1 filters by the Hard criteria, and chips and the Search bar correct it", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page
      .getByRole("list", { name: "Try an example" })
      .getByRole("button", { name: UJ1 })
      .click();
    await page.waitForURL(/\/search\?/);
    // Interpreted, so not the fallback page.
    expect(params(page).get("smart")).toBe("1");
    expect(params(page).has("fallback")).toBe(false);

    // Only Winelands: Oak & Vine bans pets and has no Room at R 2 000 for 4.
    await expect(heading(page)).toHaveText("1 property found");
    await expect(cardNames(page)).toHaveText(["Winelands Family Lodge"]);
    const chips = chipRow(page).getByRole("button");
    await expect(chips).toHaveCount(2);
    await expect(chips.nth(0)).toHaveAccessibleName(MAX_CHIP);
    await expect(chips.nth(1)).toHaveAccessibleName(PETS_CHIP);

    // Editing the Party re-runs the search with no new Query interpretation.
    let actions = 0;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.headers()["next-action"]) actions += 1;
    });
    const bar = await searchBar(page, isMobile);
    await bar.getByRole("button", { name: /^Occupancy/ }).click();
    await page.getByRole("button", { name: "Decrease adults" }).click();
    await page.getByRole("button", { name: "Decrease adults" }).click();
    await page.getByRole("button", { name: "Increase children" }).click();
    await page.getByRole("button", { name: "Increase children" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await bar.getByRole("button", { name: "Search", exact: true }).click();

    await page.waitForURL((url) => url.searchParams.get("children") === "2");
    const corrected = params(page);
    expect(corrected.get("adults")).toBe("2");
    expect(corrected.get("sq")).toBe(UJ1);
    expect(corrected.get("smart")).toBe("1");
    expect(corrected.get("prefs")).toBe("pet friendly family place");
    expect(corrected.get("maxPrice")).toBe("2000");
    expect(corrected.get("policy")).toBe("pets");
    await expect(cardNames(page)).toHaveText(["Winelands Family Lodge"]);
    await expect(smartBox(page)).toHaveValue(UJ1);
    await expect(chipRow(page).getByRole("button")).toHaveCount(2);
    await expect(page.getByText("Reading your search…")).toHaveCount(0);
    expect(actions).toBe(0);

    // Removing Pets keeps focus in the chip row; Everyday Suites' Family Suite
    // joins Winelands at R 2 000 or less.
    await chipRow(page).getByRole("button", { name: PETS_CHIP }).click();
    await page.waitForURL((url) => !url.searchParams.has("policy"));
    await expect(cardNames(page)).toHaveText([
      "Winelands Family Lodge",
      "Stellenbosch Everyday Suites",
    ]);
    await expect(chipRow(page).getByRole("button", { name: MAX_CHIP })).toBeFocused();
    await expect(heading(page)).not.toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: "2 properties found" })).toHaveCount(1);

    // Removing Max price too widens the results; focus goes to the box.
    await chipRow(page).getByRole("button", { name: MAX_CHIP }).click();
    await page.waitForURL((url) => !url.searchParams.has("maxPrice"));
    await expect(heading(page)).toHaveText("Stellenbosch: 5 properties found");
    // The Ranking blend order (Relevance 0 until it exists): Winelands' Family
    // Room at R 2 000 outweighs Oak & Vine's higher Review score at R 2 500.
    await expect(cardNames(page)).toHaveText([
      "Winelands Family Lodge",
      "Oak & Vine Manor",
      "Stellenbosch Everyday Suites",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
    ]);
    await expect(chipRow(page)).toHaveCount(0);
    await expect(smartBox(page)).toBeFocused();
    await expect(
      page.getByRole("status").filter({ hasText: "Stellenbosch: 5 properties found" }),
    ).toHaveCount(1);
    expect(params(page).get("sq")).toBe(UJ1);

    // Clearing the box, then a Search bar Search, is the MVP search.
    await page.getByRole("button", { name: "Clear description" }).click();
    const mvpBar = await searchBar(page, isMobile);
    await mvpBar.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForURL((url) => !url.searchParams.has("sq"));
    for (const name of ["smart", "prefs", "maxPrice", "policy"]) {
      expect(params(page).has(name)).toBe(false);
    }
    await expect(heading(page)).toHaveText("Stellenbosch: 6 properties found");
    // The MVP order: Review score, then Nightly price.
    await expect(cardNames(page)).toHaveText([
      "Oak & Vine Manor",
      "Winelands Family Lodge",
      "Stellenbosch Fieldstone Lodge",
      "Stellenbosch Meadow House",
      "Stellenbosch Everyday Suites",
      "Stellenbosch Stillwater Retreat",
    ]);
    expect(actions).toBe(0);
  });

  test("a Max price nothing meets names the Hard criteria and keeps the chips", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .getByRole("list", { name: "Try an example" })
      .getByRole("button", { name: UJ1 })
      .click();
    await page.waitForURL(/\/search\?/);
    const url = new URL(page.url());
    url.searchParams.set("maxPrice", "1999");
    await page.goto(url.toString());

    await expect(heading(page)).toHaveText("Nothing matches that search.");
    await expect(
      page.getByText(
        `We looked for Pets allowed and ${criterionLabel("maxPrice", 1999)} in Stellenbosch. Remove a filter, or try other dates or another city.`,
      ),
    ).toBeVisible();
    await expect(chipRow(page).getByRole("button")).toHaveCount(2);
    await expect(page.getByRole("region", { name: "Explore a city" })).toBeVisible();
  });
});
