import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { defaultStay, searchHref, smartCriteria } from "@/domain/criteria";
import { compactStayLabel, relativeStay, stayLabel } from "@/domain/dates";
import { blockSeedPhotos } from "../support/network";

// Runs on the Smart server (port 3101), whose Provider is the fake. Every
// Query here is a fixture in data/eval/fake-provider.json.
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";
const KRUGER = "relaxed lodge with a pool near Kruger";
const PLACE_NOTICE = "We don't have hotels in Kruger, so we're showing all cities.";

function smartBox(page: Page) {
  return page.getByRole("textbox", { name: "Describe your stay" });
}

test.describe("Query interpretation", () => {
  test.beforeEach(async ({ page }) => {
    await blockSeedPhotos(page);
  });

  test("the UJ-1 Example query fills the box and the Search bar in one click", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const examples = page.getByRole("list", { name: "Try an example" });
    await expect(examples.getByRole("button")).toHaveCount(4);

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

    const example = examples.getByRole("button", { name: UJ1 });
    await example.click();

    await expect(smartBox(page)).toHaveValue(UJ1);
    await expect(page.getByRole("status").filter({ hasText: "Reading your search…" })).toBeVisible();
    await expect(example).toBeFocused();
    for (const button of await examples.getByRole("button").all()) {
      await expect(button).toHaveAttribute("aria-disabled", "true");
    }
    release();

    await page.waitForURL(/\/search\?/);
    const stay = relativeStay("next-weekend", todayIn());
    const url = new URL(page.url());
    expect(url.searchParams.get("smart")).toBe("1");
    expect(url.searchParams.get("maxPrice")).toBe("2000");
    expect(url.searchParams.get("policy")).toBe("pets");
    expect(url.searchParams.get("prefs")).toBe("pet friendly family place");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

    // The Example queries are on Home only.
    await expect(page.getByRole("list", { name: "Try an example" })).toHaveCount(0);
    await expect(smartBox(page)).toHaveValue(UJ1);
    if (isMobile) {
      await expect(
        page.getByRole("button", {
          name: `Change search: Stellenbosch · ${compactStayLabel(stay)} · 4 adults`,
        }),
      ).toBeVisible();
    } else {
      const bar = page.getByRole("search", { name: "Search hotels" });
      await expect(bar.getByRole("textbox", { name: "Destination" })).toHaveValue("Stellenbosch");
      await expect(bar.getByRole("button", { name: `Dates ${stayLabel(stay)}` })).toBeVisible();
      await expect(
        bar.getByRole("button", { name: "Occupancy 4 adults · 0 children · 1 room" }),
      ).toBeVisible();
    }
  });

  test("a place CheckInn doesn't have shows all cities with a notice after the heading", async ({
    page,
  }) => {
    await page.goto("/");
    await smartBox(page).fill(KRUGER);
    await smartBox(page).press("Enter");

    await page.waitForURL(/\/search\?/);
    const url = new URL(page.url());
    expect(url.searchParams.has("q")).toBe(false);
    expect(url.searchParams.get("place")).toBe("Kruger");
    expect(url.searchParams.get("prefs")).toBe("relaxed lodge with a pool Kruger");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(/^All destinations: \d+ properties found$/);
    await expect(heading).toHaveAttribute("aria-describedby", "notice-place");
    await expect(heading).toHaveAccessibleDescription(PLACE_NOTICE);
    const notice = page.getByText(PLACE_NOTICE, { exact: true });
    await expect(notice).toBeVisible();
    // After the heading on screen; DOM order is covered by the page unit test.
    expect((await notice.boundingBox())!.y).toBeGreaterThan((await heading.boundingBox())!.y);
  });

  test("a stale Smart search URL drops its invalid values and keeps the Query", async ({
    page,
  }) => {
    const href = searchHref({
      stay: defaultStay(todayIn()),
      smart: smartCriteria("pet friendly family place", true),
    });
    const stale = new URLSearchParams({
      maxPrice: "abc",
      policy: "pets,wifi",
      place: "a".repeat(61),
      prefs: "a".repeat(301),
    });
    await page.goto(`${href}&${stale}`);

    await expect(smartBox(page)).toHaveValue("pet friendly family place");
    // The valid `pets` entry survives and filters (AD-23) to the 55 Hotels
    // that allow pets. The invalid Max price is dropped, so it has no chip.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "All destinations: 55 properties found",
    );
    const chips = page.getByRole("list", { name: "Your filters" }).getByRole("button");
    await expect(chips).toHaveCount(1);
    await expect(chips).toHaveAccessibleName("Remove Pets allowed");
    await expect(page.getByText(/^We don't have hotels in/)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveAttribute("aria-describedby");
    await expect(page.getByText("Something went wrong")).toHaveCount(0);
  });
});
