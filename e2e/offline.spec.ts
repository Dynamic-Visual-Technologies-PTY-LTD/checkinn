import { expect, type Locator, test } from "@playwright/test";
import { blockNetwork, expectNoHorizontalScroll } from "./support/network";

// Epic "Done when" 3: with the network blocked, browsing completes with photo
// placeholders. Read-only, so it runs in the parallel projects. Booking and
// managing with the network blocked is in e2e/booking/offline-booking.spec.ts.

/** Scrolls each lazy photo in, then expects its placeholder and no <img>. */
async function expectPlaceholders(container: Locator, count: number) {
  const items = await container.all();
  expect(items).toHaveLength(count);
  for (const item of items) {
    await item.scrollIntoViewIfNeeded();
    await expect(item.getByRole("img").first()).toBeVisible();
    // The failed <img> is gone; the placeholder also has role img.
    await expect(item.locator("img")).toHaveCount(0);
  }
}

test("Home → Cape Town search → Hotel page → photo viewer, all with the network blocked", async ({
  page,
  baseURL,
}) => {
  const network = await blockNetwork(page, baseURL);

  // Home: remote photos show placeholders; local AI destination images still load.
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Find your stay." })).toBeVisible();
  const tiles = page
    .getByRole("region", { name: "Explore a city" })
    .getByRole("link", { name: /^(?!Photo credit: )/ });
  await expect(tiles).toHaveCount(20);
  const generatedTiles = tiles.filter({ has: page.getByRole("img", { name: /^AI-generated/ }) });
  await expect(generatedTiles).toHaveCount(14);
  await expectPlaceholders(tiles.filter({ hasNot: page.getByRole("img", { name: /^AI-generated/ }) }), 6);
  for (const tile of await generatedTiles.all()) {
    await tile.scrollIntoViewIfNeeded();
    const image = tile.getByRole("img", { name: /^AI-generated/ });
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", /^\/images\/destinations\//);
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  for (const city of ["Cape Town", "Johannesburg", "Durban", "Pretoria", "Stellenbosch", "Gqeberha"]) {
    await expect(
      tiles.getByRole("img", { name: `${city} destination photograph`, exact: true }),
    ).toBeVisible();
  }
  await expectNoHorizontalScroll(page);

  // Search results: each card shows its placeholder with the hotel name.
  const bar = page.getByRole("search", { name: "Search hotels" });
  await bar.getByRole("textbox", { name: "Destination" }).fill("Cape Town");
  await bar.getByRole("button", { name: "Search" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Cape Town: 6 properties found" }),
  ).toBeVisible();
  const cards = page.getByRole("main").getByRole("article");
  await expectPlaceholders(cards, 6);
  await expect(
    cards.first().getByRole("img", { name: "Resort exterior and swimming pool", exact: true }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  // Hotel page: the photos are placeholders named after the hotel.
  await page.getByRole("link", { name: "Harbourlight Retreat" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Harbourlight Retreat" })).toBeVisible();
  const photos = page.getByRole("list", { name: "Photos" }).getByRole("listitem");
  await expectPlaceholders(photos, 2);
  for (const alt of ["Resort exterior and swimming pool", "Hotel bedroom"]) {
    await expect(photos.getByRole("img", { name: alt, exact: true })).toBeVisible();
  }
  await expectNoHorizontalScroll(page);

  // Photo viewer: the placeholder keeps the seed alt text and shows the name.
  await page
    .getByRole("list", { name: "Photos" })
    .getByRole("button", { name: "Resort exterior and swimming pool" })
    .click();
  const viewer = page.getByRole("dialog", { name: "Harbourlight Retreat photos" });
  await expect(viewer.getByRole("img", { name: "Resort exterior and swimming pool" })).toBeVisible();
  await expect(viewer.locator("img")).toHaveCount(0);
  await expect(viewer.getByText("Harbourlight Retreat", { exact: true })).toBeVisible();
  await viewer.getByRole("button", { name: "Next photo" }).click();
  await expect(viewer.getByRole("img", { name: "Hotel bedroom" })).toBeVisible();
  await viewer.getByRole("button", { name: "Close" }).click();
  await expect(viewer).toBeHidden();
  await expectNoHorizontalScroll(page);

  network.expectClean();
});
