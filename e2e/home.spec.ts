import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { defaultCriteria, searchHref } from "@/domain/criteria";

// Seed photos are the only remote requests (AD-17). Wikimedia's
// Special:FilePath redirects to upload.wikimedia.org. These hosts can be slow
// (one city photo is ~5 MB), rate-limited or offline, so every test here runs
// as the stand does without internet: seed photos are aborted, and their
// failures are the only ones ignored.
const SEED_PHOTO_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

function isSeedPhoto(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return SEED_PHOTO_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

// A City tile is named after its City; its credit link is named "Photo credit: City".
const CITY_TILE_NAME = /^(?!Photo credit: )(.+)$/;

/** Home's default criteria: tomorrow for 1 night, 2 adults, 0 children, 1 room. */
function homeDefaults() {
  return defaultCriteria(todayIn());
}

function searchBar(page: Page) {
  return page.getByRole("search", { name: "Search hotels" });
}

function cityTiles(page: Page) {
  return page
    .getByRole("region", { name: "Explore a city" })
    .getByRole("link", { name: CITY_TILE_NAME });
}

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => SEED_PHOTO_HOSTS.has(url.hostname),
      (route) => route.abort(),
    );
  });

  test("shows the hero headline and lead", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "Find your stay." }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Twelve hotels in six South African cities. Pick your dates and book in a few steps.",
      ),
    ).toBeVisible();
  });

  test("shows 6 City tiles that each search for their City", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 2, name: "Explore a city" }),
    ).toBeVisible();
    const tiles = cityTiles(page);
    await expect(tiles).toHaveCount(6);

    for (const tile of await tiles.all()) {
      const city = (await tile.getAttribute("aria-label")) ?? "";
      expect(city).toBeTruthy();
      expect(await tile.getAttribute("href")).toBe(
        searchHref({ ...homeDefaults(), q: city }),
      );
    }
  });

  test("shows placeholders with the name when photos are blocked", async ({
    page,
  }) => {
    // Seed photos are aborted in beforeEach.
    await page.goto("/");

    const tiles = cityTiles(page);
    await expect(tiles).toHaveCount(6);
    for (const tile of await tiles.all()) {
      await tile.scrollIntoViewIfNeeded();
      const city = (await tile.getAttribute("aria-label")) ?? "";

      const placeholder = tile.getByRole("img", {
        name: `${city} destination photograph`,
      });
      await expect(placeholder).toBeVisible();
      // Proves the failed <img> is gone; the placeholder also has role img.
      await expect(tile.locator("img")).toHaveCount(0);
      await expect(tile.getByText(city, { exact: true })).toBeVisible();
      await expect(
        page.getByRole("link", { name: `Photo credit: ${city}` }),
      ).toBeVisible();
    }
  });

  test("has the document title and language", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("CheckInn");
    // The document language is an attribute of <html>; no role exposes it.
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("has the shell landmarks", async ({ page }) => {
    await page.goto("/");

    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("navigation")).toBeVisible();
    await expect(
      banner.getByRole("link", { name: "CheckInn home" }),
    ).toBeVisible();
    await expect(
      banner.getByRole("link", { name: "Manage booking" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();

    const footer = page.getByRole("contentinfo");
    await expect(
      footer.getByText(
        "CheckInn is a demo. Hotels, prices and reviews are fictional. Photos are illustrative. No payment is taken.",
      ),
    ).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Photo credits" }),
    ).toBeVisible();
  });

  test("the skip link is first and moves focus to main", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("shows a 2px Gold focus ring with an offset", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const logo = page.getByRole("link", { name: "CheckInn home" });
    await expect(logo).toBeFocused();

    const ring = await logo.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        color: style.outlineColor,
        width: style.outlineWidth,
        offset: style.outlineOffset,
        style: style.outlineStyle,
      };
    });
    expect(ring).toEqual({
      color: "rgb(255, 195, 0)",
      width: "2px",
      offset: "2px",
      style: "solid",
    });
  });

  test("loads without console errors or failed requests", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      if (isSeedPhoto(message.location().url)) return;
      problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("requestfailed", (request) => {
      if (!isSeedPhoto(request.url())) problems.push(request.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(problems).toEqual([]);
  });

  test("renders in Poppins with the network blocked", async ({ page }) => {
    const blocked: string[] = [];
    const failed: string[] = [];
    await page.route(
      (url) => url.hostname !== "localhost",
      (route) => {
        const url = route.request().url();
        if (!isSeedPhoto(url)) blocked.push(url);
        return route.abort();
      },
    );
    page.on("requestfailed", (request) => {
      if (!isSeedPhoto(request.url())) failed.push(request.url());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    const fonts = await page.evaluate(() => ({
      check: document.fonts.check("16px Poppins"),
      loaded: [...document.fonts].some(
        (face) => /poppins/i.test(face.family) && face.status === "loaded",
      ),
      body: getComputedStyle(document.body).fontFamily,
    }));

    expect(fonts.check).toBe(true);
    expect(fonts.loaded).toBe(true);
    expect(fonts.body).toMatch(/^"?poppins"?,/i);
    expect(blocked).toEqual([]);
    expect(failed).toEqual([]);
  });

  test("fits the viewport without horizontal scrolling", async ({ page }) => {
    await page.goto("/");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("reflows at 320px without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("shows the icon instead of the wordmark below 480px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 479, height: 800 });
    await page.goto("/");

    const logo = page.getByRole("link", { name: "CheckInn home" });
    // Both images are decorative (alt=""), so only their source tells them apart.
    await expect(logo.locator('img[src*="checkinn-icon"]')).toBeVisible();
    await expect(logo.locator('img[src*="checkinn-logo"]')).toBeHidden();
    await expect(page.getByRole("banner")).toHaveCSS("height", "64px");
  });

  test("shows the wordmark from 480px", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto("/");

    const logo = page.getByRole("link", { name: "CheckInn home" });
    // Both images are decorative (alt=""), so only their source tells them apart.
    await expect(logo.locator('img[src*="checkinn-logo"]')).toBeVisible();
    await expect(logo.locator('img[src*="checkinn-icon"]')).toBeHidden();
  });

  test("the header is 100px tall from 768px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    await expect(page.getByRole("banner")).toHaveCSS("height", "100px");
  });

  test("the header is not sticky on a short viewport", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 480 });
    await page.goto("/");

    await expect(page.getByRole("banner")).toHaveCSS("position", "static");
  });
  test("shows the search bar with the default Stay and Party", async ({
    page,
  }) => {
    await page.goto("/");

    const bar = searchBar(page);
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("textbox", { name: "Destination" })).toHaveAttribute(
      "placeholder",
      "Where are you going?",
    );
    await expect(bar.getByRole("button", { name: /^Dates / })).toBeVisible();
    await expect(
      bar.getByRole("button", {
        name: "Occupancy 2 adults · 0 children · 1 room",
      }),
    ).toBeVisible();
    await expect(bar.getByRole("button", { name: "Search" })).toBeVisible();
  });

  test("has no Smart search box without a Provider, on Home or Search results", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(searchBar(page)).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Describe your stay" })).toHaveCount(0);

    // Smart search parameters in a URL are ignored.
    await page.goto(
      `${searchHref({ ...homeDefaults(), q: "Cape Town" })}&sq=quiet+hotel&smart=1`,
    );
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Describe your stay" })).toHaveCount(0);
  });

  test("searching puts every criterion in the URL and Back returns Home", async ({
    page,
  }) => {
    await page.goto("/");

    const bar = searchBar(page);
    await bar.getByRole("textbox", { name: "Destination" }).fill("Cape Town");
    await bar.getByRole("button", { name: "Search" }).click();

    const expected = searchHref({ ...homeDefaults(), q: "Cape Town" });
    expect(expected).toMatch(
      /^\/search\?q=Cape\+Town&checkIn=\d{4}-\d{2}-\d{2}&checkOut=\d{4}-\d{2}-\d{2}&adults=2&children=0&rooms=1$/,
    );
    await expect(page).toHaveURL(expected);

    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Find your stay." }),
    ).toBeVisible();
  });

  test("an empty Destination searches anyway", async ({ page }) => {
    await page.goto("/");

    await searchBar(page).getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(searchHref(homeDefaults()));
  });

  test("the Destination clear empties the field and keeps focus", async ({
    page,
  }) => {
    await page.goto("/");

    const input = searchBar(page).getByRole("textbox", { name: "Destination" });
    await input.fill("Durban");
    await searchBar(page)
      .getByRole("button", { name: "Clear destination" })
      .click();

    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
  });

  test("City tiles carry the search bar's dates and party", async ({ page }) => {
    await page.goto("/");

    const tile = cityTiles(page).first();
    const city = ((await tile.getAttribute("aria-label")) ?? "").replace(
      CITY_TILE_NAME,
      "$1",
    );
    await expect(tile).toHaveAttribute(
      "href",
      searchHref({ ...homeDefaults(), q: city }),
    );

    // Change the Party without searching: the tiles follow.
    await searchBar(page).getByRole("button", { name: /^Occupancy/ }).click();
    await page.getByRole("button", { name: "Increase adults" }).click();
    await page.getByRole("button", { name: "Done" }).click();

    const defaults = homeDefaults();
    await expect(tile).toHaveAttribute(
      "href",
      searchHref({
        ...defaults,
        q: city,
        party: { ...defaults.party, adults: 3 },
      }),
    );
    await expect(page).toHaveURL("/");
  });

  for (const width of [768, 1024, 1280]) {
    test(`the Dates popover fits a ${width}px viewport`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "Phones use a full-screen sheet.");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      await searchBar(page).getByRole("button", { name: /^Dates/ }).click();
      const popover = page.getByRole("dialog", { name: "Dates" });
      await expect(popover).toBeVisible();

      const box = await popover.boundingBox();
      if (!box) throw new Error("The Dates popover has no layout box.");
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    });
  }
});
