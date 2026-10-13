import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CityTiles } from "@/components/city-tiles";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import type { CityTile } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { HomeSearch } from "./home-search";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  push: vi.fn(),
}));

// The clock is injected; the tiles stay loading.
vi.mock("next/cache", () => ({
  io: async () => {
    mocks.calls.push("io");
  },
}));
vi.mock("@/domain/clock", () => ({
  todayIn: () => {
    mocks.calls.push("todayIn");
    return "2026-11-10";
  },
}));
vi.mock("@/features/search/queries", () => ({ getCityTiles: () => new Promise(() => {}) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const capeTown: CityTile = {
  id: "cape-town",
  name: "Cape Town",
  hotelCount: 2,
  image: {
    url: "https://commons.wikimedia.org/wiki/Special:FilePath/Cape%20Town.jpg",
    alt: "Cape Town destination photograph",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Cape%20Town.jpg",
  },
};

beforeEach(() => {
  mocks.calls = [];
  mocks.push.mockReset();
  setViewportWidth(1280);
});

describe("HomeSearch", () => {
  it("reads today only after io()", async () => {
    await HomeSearch();
    expect(mocks.calls).toEqual(["io", "todayIn"]);
  });

  it("renders the search bar with tomorrow and the default Party", async () => {
    render(await HomeSearch());

    const bar = screen.getByRole("search", { name: "Search hotels" });
    expect(
      within(bar).getByRole("button", { name: "Dates Wed 11 – Thu 12 Nov 2026" }),
    ).toBeInTheDocument();
    expect(
      within(bar).getByRole("button", { name: "Occupancy 2 adults · 0 children · 1 room" }),
    ).toBeInTheDocument();
  });

  it("puts the search bar before Explore a city, which keeps its skeleton", async () => {
    render(await HomeSearch());

    const bar = screen.getByRole("search");
    const section = screen.getByRole("region", { name: "Explore a city" });
    expect(bar.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(section.querySelector('[aria-hidden="true"]')?.children).toHaveLength(6);
  });
});

describe("Search bar and City tiles", () => {
  it("share the live, unsubmitted Stay and Party", () => {
    render(
      <SearchStateProvider
        initialStay={{ checkIn: "2026-11-11", checkOut: "2026-11-12" }}
        initialParty={{ adults: 2, children: 0, rooms: 1 }}
      >
        <SearchBar today="2026-11-10" />
        <CityTiles tiles={[capeTown]} />
      </SearchStateProvider>,
    );

    const tile = screen.getByRole("link", { name: "Cape Town, 2 hotels" });
    expect(tile).toHaveAttribute(
      "href",
      "/search?q=Cape+Town&checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=0&rooms=1",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Occupancy/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase adults" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(screen.getByRole("button", { name: /^Dates/ }));
    const november = within(screen.getByRole("grid", { name: "November 2026" }));
    fireEvent.click(november.getByRole("button", { name: /^Friday 13 November 2026/ }));
    fireEvent.click(november.getByRole("button", { name: /^Sunday 15 November 2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(tile).toHaveAttribute(
      "href",
      "/search?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=3&children=0&rooms=1",
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
