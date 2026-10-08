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

  test("fits the viewport without horizontal scrolling", async ({ page }) => {
    await page.goto("/");

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
