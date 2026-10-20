import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultCriteria, smartCriteria } from "@/domain/criteria";
import type { CityTile, ListingCard, SearchCriteria } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import SearchPage, { generateMetadata } from "./page";
import { Results, SearchResults } from "./search-results";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  searchHotels: vi.fn(),
  getCityTiles: vi.fn(),
  getCityNamed: vi.fn(),
  getSmartSearchConfig: vi.fn(),
  submitQuery: vi.fn(),
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
  getSmartSearchConfig: mocks.getSmartSearchConfig,
}));
vi.mock("@/features/search/actions", () => ({ submitQuery: mocks.submitQuery }));
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
  // Smart search is off unless a test turns it on.
  mocks.getSmartSearchConfig.mockReset().mockResolvedValue(false);
  mocks.submitQuery.mockReset().mockReturnValue(new Promise(() => {}));
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

describe("SearchResults with Smart search", () => {
  const smartParams = {
    q: "Stellenbosch",
    checkIn: weekend.checkIn,
    checkOut: weekend.checkOut,
    adults: "4",
    children: "0",
    rooms: "1",
    sq: "pet friendly family place in Stellenbosch for 4",
    smart: "1",
  };

  it("has no Smart search box without a Provider, and ignores Smart parameters", async () => {
    render(await SearchResults({ searchParams: Promise.resolve(smartParams) }));

    expect(screen.queryByRole("textbox", { name: "Describe your stay" })).not.toBeInTheDocument();
    expect(mocks.searchHotels).toHaveBeenCalledWith(expect.objectContaining({ smart: null }));
  });

  it("shows the box above the search bar, filled with the submitted Query", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    render(await SearchResults({ searchParams: Promise.resolve(smartParams) }));

    const box = screen.getByRole("textbox", { name: "Describe your stay" });
    expect(box).toHaveValue("pet friendly family place in Stellenbosch for 4");
    const bar = screen.getByRole("search", { name: "Search hotels" });
    expect(box.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(bar).getByRole("textbox", { name: "Destination" })).toHaveValue("Stellenbosch");
    expect(mocks.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        smart: smartCriteria("pet friendly family place in Stellenbosch for 4", true),
      }),
    );
  });

  it("leaves the box empty when the URL has no Query", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    render(await SearchResults({ searchParams: Promise.resolve({ q: "Durban" }) }));

    expect(screen.getByRole("textbox", { name: "Describe your stay" })).toHaveValue("");
  });

  it("shows the skeleton cards in place of results while a Query is read", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    mocks.searchHotels.mockResolvedValue({
      heading: "Stellenbosch: 2 properties found",
      cards: [],
      notices: [],
    });
    // Settled at the end: React entangles async transitions across tests.
    let settle: (value: undefined) => void = () => {};
    mocks.submitQuery.mockReturnValue(
      new Promise<undefined>((resolve) => {
        settle = resolve;
      }),
    );
    const { container } = render(
      await SearchResults({ searchParams: Promise.resolve(smartParams) }),
    );
    expect(await screen.findByRole("heading", { name: "Stellenbosch: 2 properties found" })).toBeInTheDocument();

    fireEvent.change(screen.getByRole("textbox", { name: "Describe your stay" }), {
      target: { value: "quiet hotel in Durban" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search by description" }));

    expect(await screen.findByText("Reading your search…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /properties found/ })).not.toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(mocks.submitQuery).toHaveBeenCalledWith({
      query: "quiet hotel in Durban",
      current: {
        q: "Stellenbosch",
        stay: weekend,
        party: { adults: 4, children: 0, rooms: 1 },
      },
    });
    await act(async () => settle(undefined));
  });

  it("shows the Criteria chips under the Search bar, and an empty results status", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    render(
      await SearchResults({
        searchParams: Promise.resolve({ ...smartParams, maxPrice: "2000", policy: "pets" }),
      }),
    );

    const chips = screen.getByRole("list", { name: "Your filters" });
    expect(within(chips).getAllByRole("button").map((chip) => chip.textContent)).toEqual([
      "Remove Max R 2 000 per night",
      "Remove Pets allowed",
    ]);
    const bar = screen.getByRole("search", { name: "Search hotels" });
    expect(bar.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("status", { name: "Result count" })).toBeEmptyDOMElement();
  });

  it("shows no chips on a stale link, where no search runs", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          ...smartParams,
          checkIn: "2026-11-01",
          checkOut: "2026-11-02",
          maxPrice: "2000",
          policy: "pets",
        }),
      }),
    );

    expect(screen.getByText(STALE, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Your filters" })).not.toBeInTheDocument();
    expect(mocks.searchHotels).not.toHaveBeenCalled();
  });

  it("shows no chips for a Query that was not interpreted, or without a Provider", async () => {
    const params = { ...smartParams, maxPrice: "2000", policy: "pets" };
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    const { unmount } = render(
      await SearchResults({ searchParams: Promise.resolve({ ...params, smart: "0" }) }),
    );
    expect(screen.queryByRole("list", { name: "Your filters" })).not.toBeInTheDocument();
    unmount();

    mocks.getSmartSearchConfig.mockResolvedValue(false);
    render(await SearchResults({ searchParams: Promise.resolve(params) }));
    expect(screen.queryByRole("list", { name: "Your filters" })).not.toBeInTheDocument();
  });

  it("drops stale Smart values silently and keeps the Query in the box", async () => {
    mocks.getSmartSearchConfig.mockResolvedValue(true);
    render(
      await SearchResults({
        searchParams: Promise.resolve({
          ...smartParams,
          maxPrice: "abc",
          policy: "pets,wifi",
          place: "a".repeat(61),
          prefs: "a".repeat(301),
        }),
      }),
    );

    expect(screen.getByRole("textbox", { name: "Describe your stay" })).toHaveValue(smartParams.sq);
    expect(mocks.searchHotels).toHaveBeenCalledWith(
      expect.objectContaining({
        smart: smartCriteria(smartParams.sq, true, { policies: ["pets"] }),
      }),
    );
  });
});

describe("Results", () => {
  it("shows the FR-7 heading and the cards in order, each linking with the criteria", async () => {
    mocks.searchHotels.mockResolvedValue({
      heading: "Cape Town: 2 properties found",
      cards: capeTownCards,
      notices: [],
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
    mocks.searchHotels.mockResolvedValue({ heading: null, cards: [], notices: [] });

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

  it("names the Hard criteria in the no-results body under Smart search", async () => {
    const summary =
      "We looked for Pets allowed and Max R 1 999 per night in Stellenbosch. Remove a filter, or try other dates or another city.";
    mocks.searchHotels.mockResolvedValue({
      heading: null,
      cards: [],
      notices: [],
      mode: "smart",
      criteriaSummary: summary,
    });

    render(await Results({ criteria: criteria({ q: "Stellenbosch" }) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Nothing matches that search." }),
    ).toBeInTheDocument();
    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(screen.queryByText("Try another city, other dates or fewer rooms.")).toBeNull();
    expect(screen.getByRole("region", { name: "Explore a city" })).toBeInTheDocument();
  });

  it("has no notices and no heading description for an MVP search", async () => {
    mocks.searchHotels.mockResolvedValue({
      heading: "Cape Town: 2 properties found",
      cards: capeTownCards,
      notices: [],
    });

    render(await Results({ criteria: criteria({ q: "Cape Town" }) }));

    expect(screen.getByRole("heading", { level: 1 })).not.toHaveAttribute("aria-describedby");
  });

  it("shows the place and ignored notices after the heading, which they describe", async () => {
    mocks.searchHotels.mockResolvedValue({
      heading: "All destinations: 2 properties found",
      cards: capeTownCards,
      notices: [
        { kind: "place", place: "Kruger" },
        { kind: "ignored", text: "last Tuesday", about: "dates" },
      ],
    });

    render(await Results({ criteria: criteria() }));

    const heading = screen.getByRole("heading", {
      level: 1,
      name: "All destinations: 2 properties found",
    });
    expect(heading).toHaveAttribute("aria-describedby", "notice-place notice-value");
    expect(heading).toHaveAccessibleDescription(
      "We don't have hotels in Kruger, so we're showing all cities. " +
        "We couldn't use 'last Tuesday', so check your dates.",
    );
    const place = screen.getByText("We don't have hotels in Kruger, so we're showing all cities.");
    const value = screen.getByText("We couldn't use 'last Tuesday', so check your dates.");
    expect(heading.compareDocumentPosition(place) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(place.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const [firstCard] = screen.getAllByRole("article");
    expect(value.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("names an ignored Party with check who's staying", async () => {
    mocks.searchHotels.mockResolvedValue({
      heading: "Cape Town: 2 properties found",
      cards: capeTownCards,
      notices: [{ kind: "ignored", text: "for 0", about: "party" }],
    });

    render(await Results({ criteria: criteria({ q: "Cape Town" }) }));

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("aria-describedby", "notice-value");
    expect(heading).toHaveAccessibleDescription(
      "We couldn't use 'for 0', so check who's staying.",
    );
  });
});
