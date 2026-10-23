import { expect, type Page, test } from "@playwright/test";
import { todayIn } from "@/domain/clock";
import { cancellationDeadline, deadlineLabel } from "@/domain/cancellation";
import { DEFAULT_PARTY, searchHref } from "@/domain/criteria";
import { addDays } from "@/domain/dates";

// Seed photos are the only remote requests (AD-17). They are aborted, as at
// the stand without internet, so the cards show their placeholders.
const SEED_PHOTO_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "images.unsplash.com",
]);

/** A 2-night Stay from 3 days out, so it is never in the past. */
function weekendStay() {
  const today = todayIn();
  return { checkIn: addDays(today, 3), checkOut: addDays(today, 5) };
}

function searchFor(q: string) {
  return searchHref({ q, stay: weekendStay(), party: DEFAULT_PARTY });
}

function cards(page: Page) {
  return page.getByRole("main").getByRole("article");
}

test.describe("Search results", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => SEED_PHOTO_HOSTS.has(url.hostname),
      (route) => route.abort(),
    );
  });

  test("a Cape Town search shows the heading and Harbourlight Retreat first", async ({
    page,
  }) => {
    await page.goto(searchFor("Cape Town"));

    await expect(page).toHaveTitle("Cape Town hotels · CheckInn");
    const heading = page.getByRole("heading", {
      level: 1,
      name: "Cape Town: 6 properties found",
    });
    await expect(heading).toBeVisible();
    // A full page load keeps focus at the top; only client navigation moves it.
    await expect(heading).not.toBeFocused();
    await expect(cards(page)).toHaveCount(6);

    const first = cards(page).first();
    const name = first.getByRole("link", { name: "Harbourlight Retreat" });
    await expect(name).toBeVisible();
    const stay = weekendStay();
    await expect(name).toHaveAttribute(
      "href",
      `/hotels/hotel-001?q=Cape+Town&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&adults=2&children=0&rooms=1`,
    );
    await expect(first.getByText("2 nights, 2 adults: from")).toBeVisible();
    await expect(first.getByText("4 900 rand", { exact: true })).toBeAttached();
    await expect(first.getByRole("img", { name: "5-star hotel" })).toBeVisible();
    await expect(
      first.getByText("Rated 4.8 out of 5, Superb, 248 reviews"),
    ).toBeAttached();
  });

  test("a 'cape' search spans Cities and puts Oak & Vine Manor first", async ({
    page,
  }) => {
    await page.goto(searchFor("cape"));

    await expect(page).toHaveTitle("Search results · CheckInn");
    await expect(
      page.getByRole("heading", { level: 1, name: "60 properties found" }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(60);
    await expect(
      cards(page).first().getByRole("link", { name: "Oak & Vine Manor" }),
    ).toBeVisible();
  });

  test("no dates searches the default Stay across all destinations", async ({ page }) => {
    await page.goto("/search");

    await expect(
      page.getByRole("heading", { level: 1, name: "All destinations: 120 properties found" }),
    ).toBeVisible();
    await expect(cards(page)).toHaveCount(120);
  });

  test("a card's free cancellation matches the Hotel page: open, or ended inside 48 hours", async ({
    page,
  }) => {
    // Table View City Lodge has Free cancellation and checks in at 14:00.
    const tableView = () =>
      cards(page).filter({ has: page.getByRole("link", { name: "Table View City Lodge" }) });

    const stay = weekendStay();
    await page.goto(searchFor("Table View"));
    const open = deadlineLabel(cancellationDeadline(stay.checkIn, "14:00"));
    await expect(tableView().getByText("Free cancellation", { exact: true })).toBeVisible();
    await expect(tableView().getByText(`until ${open}`)).toBeVisible();

    // With no dates the search runs the default Stay, which checks in
    // tomorrow, inside the 48 hours.
    const tomorrow = addDays(todayIn(), 1);
    await page.goto("/search?q=Table+View");
    const ended = deadlineLabel(cancellationDeadline(tomorrow, "14:00"));
    await expect(tableView().getByText(`Free cancellation ended on ${ended}.`)).toBeVisible();
    await expect(tableView().getByText("Free cancellation", { exact: true })).toHaveCount(0);
  });

  test("no match explains itself and offers the City tiles", async ({ page }) => {
    await page.goto(searchFor("Atlantis"));

    await expect(
      page.getByRole("heading", { level: 1, name: "Nothing matches that search." }),
    ).toBeVisible();
    await expect(
      page.getByText("Try another city, other dates or fewer rooms."),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Explore a city" }).getByRole("link", {
        name: /^(?!Photo credit: )/,
      }),
    ).toHaveCount(20);
    await expect(cards(page)).toHaveCount(0);
  });

  test("a new destination opens its hotel and allows a room selection", async ({ page }) => {
    await page.goto(searchFor("Hermanus"));
    await expect(page.getByRole("heading", { level: 1, name: "Hermanus: 6 properties found" })).toBeVisible();
    await expect(cards(page)).toHaveCount(6);
    await page.getByRole("link", { name: "Hermanus Saltwind House", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Hermanus Saltwind House" })).toBeVisible();
    const rooms = page.getByRole("combobox", { name: "Rooms of Family Suite" });
    await expect(rooms).toBeVisible();
    await rooms.selectOption("1");
    await expect(rooms).toHaveValue("1");
    await expect(page.getByRole("button", { name: "Reserve", exact: true })).toBeEnabled();
  });

  test("a stale link asks for new dates and runs no search", async ({ page }) => {
    const today = todayIn();
    await page.goto(
      `/search?q=Cape+Town&checkIn=${addDays(today, -3)}&checkOut=${addDays(today, -1)}&adults=2&children=0&rooms=1`,
    );

    const bar = page.getByRole("search", { name: "Search hotels" });
    await expect(bar).toBeVisible();
    await expect(bar.getByText("Those dates have passed. Pick new ones.")).toBeVisible();
    await expect(bar.getByRole("button", { name: "Dates Add dates" })).toBeVisible();
    await expect(bar.getByRole("textbox", { name: "Destination" })).toHaveValue("Cape Town");
    await expect(page.getByText(/properties found/)).toHaveCount(0);
    await expect(cards(page)).toHaveCount(0);
  });

  test("Home → Search shows results, and Back returns Home", async ({ page }) => {
    await page.goto("/");

    const bar = page.getByRole("search", { name: "Search hotels" });
    await bar.getByRole("textbox", { name: "Destination" }).fill("Cape Town");
    await bar.getByRole("button", { name: "Search" }).click();

    const heading = page.getByRole("heading", {
      level: 1,
      name: "Cape Town: 6 properties found",
    });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(
      cards(page).first().getByRole("link", { name: "Harbourlight Retreat" }),
    ).toBeVisible();

    // A new search from the results page pushes another URL.
    await bar.getByRole("textbox", { name: "Destination" }).fill("Durban");
    await bar.getByRole("button", { name: "Search" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Durban: 6 properties found" }),
    ).toBeVisible();

    await page.goBack();
    await expect(heading).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Find your stay." }),
    ).toBeVisible();
  });

});

test.describe("Photo credits", () => {
  test("lists 20 City and 120 Hotel credits, reached from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Photo credits" }).click();

    await expect(page).toHaveURL("/credits");
    await expect(page).toHaveTitle("Photo credits · CheckInn");
    await expect(
      page.getByRole("heading", { level: 1, name: "Photo credits" }),
    ).toBeVisible();

    const cities = page.getByRole("region", { name: "Cities" });
    await expect(cities.getByRole("heading", { level: 3 })).toHaveCount(20);
    await expect(
      cities.getByRole("link", { name: "Source and licence: Cape Town" }),
    ).toHaveAttribute("href", /^https:\/\/commons\.wikimedia\.org\//);

    const hotels = page.getByRole("region", { name: "Hotels" });
    await expect(hotels.getByRole("heading", { level: 3 })).toHaveCount(120);
    await expect(
      hotels.getByRole("heading", { level: 3, name: "Harbourlight Retreat" }),
    ).toBeVisible();
    await expect(hotels.getByRole("link", { name: "Unsplash licence" })).toHaveCount(240);
    await expect(page.getByRole("main").getByRole("img")).toHaveCount(0);
  });
});
