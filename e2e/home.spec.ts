import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test("shows the CheckInn heading and tagline", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "CheckInn" }),
    ).toBeVisible();
    await expect(page.getByText("A simple hotel booking system.")).toBeVisible();
  });

  test("has the document title and language", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("CheckInn");
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
    await expect(page.locator("main#main")).toBeVisible();

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
    await expect(page.locator("main#main")).toBeFocused();
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
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("requestfailed", (request) => problems.push(request.url()));

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
        blocked.push(route.request().url());
        return route.abort();
      },
    );
    page.on("requestfailed", (request) => failed.push(request.url()));

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
    await expect(logo.locator('img[src*="checkinn-icon"]')).toBeVisible();
    await expect(logo.locator('img[src*="checkinn-logo"]')).toBeHidden();
    await expect(page.getByRole("banner")).toHaveCSS("height", "64px");
  });

  test("shows the wordmark from 480px", async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 800 });
    await page.goto("/");

    const logo = page.getByRole("link", { name: "CheckInn home" });
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
});
