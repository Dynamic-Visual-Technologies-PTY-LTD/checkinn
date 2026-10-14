import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sizedPhotoUrl } from "@/components/remote-image";
import type { CityTile } from "@/domain/types";
import { CityTiles, CityTilesSkeleton } from "./city-tiles";
import { SearchStateProvider } from "./search-state";

const tiles: CityTile[] = [
  {
    id: "cape-town",
    name: "Cape Town",
    hotelCount: 2,
    image: {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/Cape%20Town%20Skyline.jpg",
      alt: "Cape Town destination photograph",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Cape%20Town%20Skyline.jpg",
    },
  },
  {
    id: "gqeberha",
    name: "Gqeberha",
    hotelCount: 1,
    image: {
      url: "https://commons.wikimedia.org/wiki/Special:FilePath/Gqeberha.jpg",
      alt: "Gqeberha destination photograph",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Gqeberha.jpg",
    },
  },
];

describe("CityTiles", () => {
  it("links each tile to a search for its City with the current Stay and Party", () => {
    render(
      <SearchStateProvider
        initialStay={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }}
        initialParty={{ adults: 2, children: 3, rooms: 2 }}
      >
        <CityTiles tiles={tiles} />
      </SearchStateProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Cape Town, 2 hotels" }),
    ).toHaveAttribute(
      "href",
      "/search?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=3&rooms=2",
    );
    expect(
      screen.getByRole("link", { name: "Gqeberha, 1 hotel" }),
    ).toHaveAttribute(
      "href",
      "/search?q=Gqeberha&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=3&rooms=2",
    );
  });

  it("links with the default Party and no dates outside a search", () => {
    render(<CityTiles tiles={tiles} />);

    expect(
      screen.getByRole("link", { name: "Cape Town, 2 hotels" }),
    ).toHaveAttribute("href", "/search?q=Cape+Town&adults=2&children=0&rooms=1");
  });

  it("shows the City name, count and photo in the tile", () => {
    render(<CityTiles tiles={tiles} />);

    const tile = screen.getByRole("link", { name: "Cape Town, 2 hotels" });
    expect(within(tile).getByText("Cape Town")).toBeInTheDocument();
    expect(within(tile).getByText("2 hotels")).toBeInTheDocument();
    expect(
      within(tile).getByRole("img", { name: "Cape Town destination photograph" }),
    ).toHaveAttribute("src", sizedPhotoUrl(tiles[0].image.url));
  });

  it("puts the photo credit outside the tile link", () => {
    render(<CityTiles tiles={tiles} />);

    const credit = screen.getByRole("link", { name: "Photo credit: Cape Town" });
    expect(credit).toHaveAttribute("href", tiles[0].image.sourceUrl);
    const tile = screen.getByRole("link", { name: "Cape Town, 2 hotels" });
    expect(within(tile).queryByRole("link", { name: "Photo credit: Cape Town" })).toBeNull();
  });

  it("keeps the name, count and credit when the photo fails", () => {
    render(<CityTiles tiles={tiles} />);

    const tile = screen.getByRole("link", { name: "Cape Town, 2 hotels" });
    fireEvent.error(
      within(tile).getByRole("img", { name: "Cape Town destination photograph" }),
    );

    const placeholder = within(tile).getByRole("img", {
      name: "Cape Town destination photograph",
    });
    expect(placeholder.tagName).toBe("DIV");
    expect(within(tile).getByText("Cape Town")).toBeVisible();
    expect(within(tile).getByText("2 hotels")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Photo credit: Cape Town" }),
    ).toBeInTheDocument();
  });
});

describe("CityTilesSkeleton", () => {
  it("renders six blocks hidden from assistive technology", () => {
    const { container } = render(<CityTilesSkeleton />);

    // The skeleton is aria-hidden, so no role or text can find it.
    const skeleton = container.firstElementChild;
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton?.children).toHaveLength(6);
  });
});
