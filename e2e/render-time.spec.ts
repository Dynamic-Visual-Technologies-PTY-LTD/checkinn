import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { DEFAULT_PARTY, hotelHref } from "@/domain/criteria";
import { addDays } from "@/domain/dates";
import { blockSeedPhotos } from "./support/network";

// A spot check that the key pages render fast enough for a stand: on a warm
// server, the main headline is visible within 1 second of navigation start,
// as the median of several loads. Generous on purpose: it flags a regression
// (a blocking fetch, a slow query) without failing on a slow machine.

const LOADS = 5;
const LIMIT_MS = 1_000;

test.beforeEach(async ({ page }) => {
  // As at the stand without internet; photo loads never hold up the headline.
  await blockSeedPhotos(page);
});

/** Milliseconds from navigation start until the headline is visible, per load. */
async function headlineTimes(page: Page, path: string, headline: string): Promise<number[]> {
  const heading = page.getByRole("heading", { level: 1, name: headline });
  // Warm the server and the route's code.
  await page.goto(path);
  await expect(heading).toBeVisible();

  const times: number[] = [];
  for (let i = 0; i < LOADS; i += 1) {
    const start = Date.now();
    await page.goto(path, { waitUntil: "commit" });
    await expect(heading).toBeVisible();
    times.push(Date.now() - start);
  }
  return times;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

test("the default search shows its headline within 1 second", async ({ page }) => {
  const times = await headlineTimes(page, "/search", "All destinations: 12 properties found");
  expect(median(times), `median of ${times.join(", ")} ms`).toBeLessThan(LIMIT_MS);
});

test("a Hotel page with dates shows its headline within 1 second", async ({ page }) => {
  const today = todayIn();
  const stay = { checkIn: addDays(today, 3), checkOut: addDays(today, 5) };
  const path = hotelHref("hotel-001", { q: "Cape Town", stay, party: DEFAULT_PARTY });
  const times = await headlineTimes(page, path, "Harbourlight Retreat");
  expect(median(times), `median of ${times.join(", ")} ms`).toBeLessThan(LIMIT_MS);
});
