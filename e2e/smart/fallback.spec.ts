import { expect, type Page, test } from "@playwright/test";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake. The fake
// throws UNAVAILABLE for a Query missing from data/eval/fake-provider.json,
// which is how these specs reach the fallback page. The UJ-1 Query is a
// fixture. Read-only: it never books.
const UNKNOWN = "a castle on the moon with a moat";
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const FALLBACK =
  "Smart search isn't available right now, so these results are in the usual order.";

const smartBox = (page: Page) => page.getByRole("textbox", { name: "Describe your stay" });
const heading = (page: Page) => page.getByRole("heading", { level: 1 });
const tryAgain = (page: Page) => page.getByRole("button", { name: "Try again" });
/** The fallback notice's text; the notice itself has no role. */
const notice = (page: Page) => page.getByText(FALLBACK);
const listing = (page: Page) => page.getByRole("list", { name: "Hotels" });

function params(page: Page): URLSearchParams {
  return new URL(page.url()).searchParams;
}

/** On a phone the Search bar starts as a summary; expand it first. */
async function searchBar(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: /^Change search/ }).click();
  return page.getByRole("search", { name: "Search hotels" });
}

/** Holds every server action back until `release` is called. */
async function holdActions(page: Page) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"]) await held;
    await route.fallback();
  });
  return () => release();
}

/** Counts server action calls from now on. */
function countActions(page: Page) {
  const count = { actions: 0 };
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) count.actions += 1;
  });
  return count;
}

async function expectFallbackPage(page: Page, query: string) {
  await expect(heading(page)).toHaveText("All destinations: 12 properties found");
  await expect(notice(page)).toBeVisible();
  // The notice, Try again included, describes the heading.
  await expect(heading(page)).toHaveAccessibleDescription(`${FALLBACK} Try again`);
  await expect(tryAgain(page)).toBeVisible();
  await expect(smartBox(page)).toHaveValue(query);
  // MVP cards: no chips, no Best-fit room line, prices "from".
  await expect(page.getByRole("list", { name: "Your filters" })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(12);
  await expect(page.getByRole("article").getByText(/ · sleeps \d/)).toHaveCount(0);
  await expect(page.getByRole("article").first()).toContainText(": from");
}

test.describe("Fallback and Try again", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("an unknown Query falls back; reload keeps it; Try again fails back to it", async ({
    page,
  }) => {
    await page.goto("/");
    await smartBox(page).fill(UNKNOWN);
    await smartBox(page).press("Enter");

    await page.waitForURL(/\/search\?/);
    const url = params(page);
    expect(url.get("sq")).toBe(UNKNOWN);
    expect(url.get("fallback")).toBe("1");
    for (const name of ["smart", "prefs", "maxPrice", "policy", "place", "ignored", "q"]) {
      expect(url.has(name)).toBe(false);
    }
    expect(url.get("adults")).toBe("2");
    await expectFallbackPage(page, UNKNOWN);
    await expect(heading(page)).toBeFocused();

    // Reload shows the same page, with no Query interpretation.
    const count = countActions(page);
    const fallbackUrl = page.url();
    await page.reload();
    await expectFallbackPage(page, UNKNOWN);
    expect(page.url()).toBe(fallbackUrl);
    expect(count.actions).toBe(0);

    // Try again runs the Submitting state, then lands on the fallback again.
    const release = await holdActions(page);
    await tryAgain(page).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Reading your search…" }),
    ).toBeVisible();
    await expect(smartBox(page)).toHaveAttribute("readonly", "");
    await expect(smartBox(page)).toHaveValue(UNKNOWN);
    // Only the cards become skeleton cards meanwhile: the heading, the notice
    // and Try again stay, and Try again keeps focus.
    await expect(listing(page)).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(heading(page)).toHaveText("All destinations: 12 properties found");
    await expect(notice(page)).toBeVisible();
    await expect(tryAgain(page)).toBeVisible();
    await expect(tryAgain(page)).toHaveAttribute("aria-disabled", "true");
    await expect(tryAgain(page)).toBeFocused();
    release();

    await expect(page.getByRole("status").filter({ hasText: "Reading your search…" })).toHaveCount(
      0,
    );
    expect(page.url()).toBe(fallbackUrl);
    await expectFallbackPage(page, UNKNOWN);
    await expect(heading(page)).toBeFocused();
    expect(count.actions).toBe(1);
  });

  test("Try again on a fallback URL whose Query is known gives Smart results", async ({
    page,
  }) => {
    await page.goto(`/search?${new URLSearchParams({ sq: UJ1, fallback: "1" })}`);
    await expect(notice(page)).toBeVisible();
    await expect(smartBox(page)).toHaveValue(UJ1);

    await tryAgain(page).click();
    await page.waitForURL((url) => url.searchParams.get("smart") === "1");
    expect(params(page).has("fallback")).toBe(false);
    expect(params(page).get("q")).toBe("Stellenbosch");
    await expect(heading(page)).toHaveText("1 property found");
    await expect(heading(page)).toBeFocused();
    await expect(page.getByRole("article").getByRole("link")).toHaveText([
      "Winelands Family Lodge",
    ]);
    await expect(notice(page)).toHaveCount(0);
    await expect(smartBox(page)).toHaveValue(UJ1);
  });

  test("a Search bar Search on the fallback page is the MVP search with the Query kept", async ({
    page,
    isMobile,
  }) => {
    await page.goto(`/search?${new URLSearchParams({ sq: UNKNOWN, fallback: "1" })}`);
    await expect(notice(page)).toBeVisible();

    const count = countActions(page);
    const bar = await searchBar(page, isMobile);
    await bar.getByRole("button", { name: /^Occupancy/ }).click();
    await page.getByRole("button", { name: "Increase adults" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await bar.getByRole("button", { name: "Search", exact: true }).click();

    await page.waitForURL((url) => url.searchParams.get("adults") === "3");
    expect(params(page).has("fallback")).toBe(false);
    expect(params(page).has("smart")).toBe(false);
    expect(params(page).get("sq")).toBe(UNKNOWN);
    await expect(heading(page)).toHaveText(/properties found/);
    await expect(notice(page)).toHaveCount(0);
    await expect(tryAgain(page)).toHaveCount(0);
    await expect(smartBox(page)).toHaveValue(UNKNOWN);
    expect(count.actions).toBe(0);
  });

  test("a fallback URL with Hard criteria filters by them and shows their chips", async ({
    page,
  }) => {
    await page.goto(
      `/search?${new URLSearchParams({
        q: "Stellenbosch",
        adults: "4",
        sq: UNKNOWN,
        fallback: "1",
        maxPrice: "2000",
        policy: "pets",
      })}`,
    );
    await expect(notice(page)).toBeVisible();
    await expect(heading(page)).toHaveText("1 property found");
    await expect(page.getByRole("article").getByRole("link")).toHaveText([
      "Winelands Family Lodge",
    ]);
    await expect(page.getByRole("list", { name: "Your filters" }).getByRole("button")).toHaveCount(
      2,
    );
    await expect(page.getByRole("article").getByText(/ · sleeps \d/)).toHaveCount(0);
  });

  test("fallback without a Query is ignored", async ({ page }) => {
    await page.goto("/search?fallback=1");
    await expect(heading(page)).toHaveText("All destinations: 12 properties found");
    await expect(notice(page)).toHaveCount(0);
    await expect(smartBox(page)).toHaveValue("");
  });
});
