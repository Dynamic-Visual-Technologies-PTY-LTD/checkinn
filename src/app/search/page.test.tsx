import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultCriteria } from "@/domain/criteria";
import type { CityTile, ListingCard, SearchCriteria } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import SearchPage, { generateMetadata } from "./page";
import { Results, SearchResults } from "./search-results";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  searchHotels: vi.fn(),
  getCityTiles: vi.fn(),
  getCityNamed: vi.fn(),
  io: vi.fn(),
}));

vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("@/domain/clock", () => ({
  todayIn: () => {
    mocks.calls.push("todayIn");
    return "2026-11-10";
  },
}));
vi.mock("@/features/search/queries", () => ({
  searchHotels: mocks.searchHotels,
  getCityTiles: mocks.getCityTiles,
  getCityNamed: mocks.getCityNamed,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const weekend = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const STALE = "Those dates have passed. Pick new ones.";

function card(overrides: Partial<ListingCard>): ListingCard {
  return {
    hotelId: "hotel-001",
    name: "Harbourlight Retreat",
    category: "luxury",
    starRating: 5,
    area: "V&A Waterfront",
    cityName: "Cape Town",
    reviewScore: 4.8,
    reviewLabel: "Superb",
    reviewCount: 248,
    facilities: ["Swimming pool", "Spa"],
    cancellation: { kind: "non-refundable", text: "Non-refundable. This booking can't be cancelled." },
    firstImage: null,
    nights: 2,
    adults: 2,
    totalRand: 4900,
    nightlyRand: 2450,
    ...overrides,
  };
}

const capeTownCards = [
  card({}),
  card({ hotelId: "hotel-002", name: "Table View City Lodge", reviewScore: 4.2 }),
];

const tile: CityTile = {
  id: "cape-town",
  name: "Cape Town",
  hotelCount: 2,
  image: {
    url: "https://example.test/ct.jpg",
    alt: "Cape Town destination photograph",
    sourceUrl: "https://example.test/ct",
  },
};

function criteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return { ...defaultCriteria("2026-11-10"), stay: weekend, ...overrides };
}

beforeEach(() => {
  mocks.calls = [];
  mocks.io.mockReset().mockImplementation(async () => {
    mocks.calls.push("io");
  });
  // Results stay loading unless a test resolves them.
  mocks.searchHotels.mockReset().mockReturnValue(new Promise(() => {}));
  mocks.getCityTiles.mockReset().mockResolvedValue([tile]);
  mocks.getCityNamed.mockReset().mockResolvedValue(null);
  setViewportWidth(1280);
});

describe("SearchPage", () => {
  it("prerenders a skeleton shell and reads nothing until the URL resolves", () => {
    const { container } = render(
      <SearchPage searchParams={new Promise(() => {})} params={Promise.resolve({})} />,
    );

    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    // The skeleton is aria-hidden, so no role or text can find it.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mocks.calls).toEqual([]);
  });
});

describe("generateMetadata", () => {
  it("titles a City search after the City", async () => {
    mocks.getCityNamed.mockResolvedValue("Cape Town");

    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ q: "cape town" }),
      params: Promise.resolve({}),
    });

    expect(mocks.getCityNamed).toHaveBeenCalledWith("cape town");
    expect(metadata.title).toBe("Cape Town hotels");
  });

  it("titles any other search Search results", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({}),
      params: Promise.resolve({}),
    });

    expect(mocks.getCityNamed).toHaveBeenCalledWith("");
    expect(metadata.title).toBe("Search results");
  });
});

describe("SearchResults", () => {
  it("parses the URL after io(), and fills the search bar from it", async () => {
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          q: "Cape Town",
          checkIn: weekend.checkIn,
          checkOut: weekend.checkOut,
          adults: "3",
          children: "0",
          rooms: "1",
        }),
      }),
    );

    expect(mocks.calls).toEqual(["io", "todayIn"]);
    const bar = screen.getByRole("search", { name: "Search hotels" });
    expect(within(bar).getByRole("textbox", { name: "Destination" })).toHaveValue("Cape Town");
    expect(
      within(bar).getByRole("button", { name: "Dates Fri 13 – Sun 15 Nov 2026" }),
    ).toBeInTheDocument();
    expect(mocks.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "Cape Town",
        stay: weekend,
        party: { adults: 3, children: 0, rooms: 1 },
      }),
    );
  });

  it("collapses the bar to a summary on phones", async () => {
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          q: "Cape Town",
          checkIn: weekend.checkIn,
          checkOut: weekend.checkOut,
        }),
      }),
    );

    expect(
      screen.getByRole("button", { name: "Change search: Cape Town · 13–15 Nov · 2 adults" }),
    ).toBeInTheDocument();
  });

  it("searches the default Stay when the URL has no dates", async () => {
    render(await SearchResults({ searchParams: Promise.resolve({}) }));

    expect(mocks.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "",
        stay: { checkIn: "2026-11-11", checkOut: "2026-11-12" },
      }),
    );
  });

  it("shows the stale-link state for past dates and runs no search", async () => {
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          q: "Durban",
          checkIn: "2026-11-01",
          checkOut: "2026-11-03",
          adults: "4",
        }),
      }),
    );

    expect(mocks.searchHotels).not.toHaveBeenCalled();
    const dates = screen.getByRole("button", { name: "Dates Add dates" });
    expect(dates).toHaveAccessibleDescription(STALE);
    expect(screen.getByRole("textbox", { name: "Destination" })).toHaveValue("Durban");
    expect(
      screen.getByRole("button", { name: "Occupancy 4 adults · 0 children · 1 room" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Change search/ })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Search results" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

  it("replaces an invalid Party with the default and shows the stale state", async () => {
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          checkIn: weekend.checkIn,
          checkOut: weekend.checkOut,
          rooms: "9",
        }),
      }),
    );

    expect(mocks.searchHotels).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Occupancy 2 adults · 0 children · 1 room" }),
    ).toBeInTheDocument();
    expect(screen.getByText(STALE)).toBeInTheDocument();
  });
});

describe("Results", () => {
  it("shows the FR-7 heading and the cards in order, each linking with the criteria", async () => {
    mocks.searchHotels.mockResolvedValue({
      heading: "Cape Town: 2 properties found",
      cards: capeTownCards,
    });

    render(await Results({ criteria: criteria({ q: "Cape Town" }) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Cape Town: 2 properties found" }),
    ).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards.map((article) => within(article).getByRole("link").textContent)).toEqual([
      "Harbourlight Retreat",
      "Table View City Lodge",
    ]);
    expect(screen.getByRole("link", { name: "Harbourlight Retreat" })).toHaveAttribute(
      "href",
      "/hotels/hotel-001?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1",
    );
    expect(mocks.getCityTiles).not.toHaveBeenCalled();
  });

  it("shows the no-results copy and the City tiles when nothing matches", async () => {
    mocks.searchHotels.mockResolvedValue({ heading: null, cards: [] });

    render(await Results({ criteria: criteria({ q: "Bloemfontein" }) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Nothing matches that search." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Try another city, other dates or fewer rooms."),
    ).toBeInTheDocument();
    const explore = screen.getByRole("region", { name: "Explore a city" });
    expect(
      within(explore).getByRole("link", { name: "Cape Town, 2 hotels" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });
});
