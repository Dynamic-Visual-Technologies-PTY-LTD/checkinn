import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { compactStayLabel, relativeStay, stayLabel } from "@/domain/dates";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake. The UJ-1
// Query is a fixture in data/eval/fake-provider.json.
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";

function smartBox(page: Page) {
  return page.getByRole("textbox", { name: "Describe your stay" });
}

test.describe("Smart search tracer", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("the UJ-1 Query on Home fills the Search bar on /search", async ({ page, isMobile }) => {
    await page.goto("/");
    const box = smartBox(page);
    await expect(box).toBeVisible();
    // The box sits above the Search bar.
    const bar = page.getByRole("search", { name: "Search hotels" });
    const boxTop = (await box.boundingBox())!.y;
    expect(boxTop).toBeLessThan((await bar.boundingBox())!.y);

    // Hold the server action back, so the Submitting state can be seen.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/*", async (route) => {
      const request = route.request();
      if (request.method() === "POST" && request.headers()["next-action"]) await held;
      await route.fallback();
    });

    await box.fill(UJ1);
    await box.press("Enter");

    await expect(page.getByRole("status").filter({ hasText: "Reading your search…" })).toBeVisible();
    await expect(box).toHaveAttribute("readonly", "");
    await expect(bar.getByRole("button", { name: "Search", exact: true })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    release();

    await page.waitForURL(/\/search\?/);
    // Next weekend, from the server's today (FR-4).
    const stay = relativeStay("next-weekend", todayIn());
    const url = new URL(page.url());
    expect(url.searchParams.get("q")).toBe("Stellenbosch");
    expect(url.searchParams.get("checkIn")).toBe(stay.checkIn);
    expect(url.searchParams.get("checkOut")).toBe(stay.checkOut);
    expect(url.searchParams.get("adults")).toBe("4");
    expect(url.searchParams.get("children")).toBe("0");
    expect(url.searchParams.get("rooms")).toBe("1");
    expect(url.searchParams.get("sq")).toBe(UJ1);
    // Interpreted, so not the fallback.
    expect(url.searchParams.get("smart")).toBe("1");
    expect(url.searchParams.has("fallback")).toBe(false);
    expect(url.searchParams.get("prefs")).toBe("pet friendly family place");
    expect(url.searchParams.get("maxPrice")).toBe("2000");
    expect(url.searchParams.get("policy")).toBe("pets");

    // The box keeps the Guest's words.
    await expect(smartBox(page)).toHaveValue(UJ1);
    await expect(smartBox(page)).not.toHaveAttribute("readonly");

    if (isMobile) {
      await expect(
        page.getByRole("button", {
          name: `Change search: Stellenbosch · ${compactStayLabel(stay)} · 4 adults`,
        }),
      ).toBeVisible();
    } else {
      const results = page.getByRole("search", { name: "Search hotels" });
      await expect(results.getByRole("textbox", { name: "Destination" })).toHaveValue(
        "Stellenbosch",
      );
      await expect(results.getByRole("button", { name: `Dates ${stayLabel(stay)}` })).toBeVisible();
      await expect(
        results.getByRole("button", { name: "Occupancy 4 adults · 0 children · 1 room" }),
      ).toBeVisible();
    }
  });
});
