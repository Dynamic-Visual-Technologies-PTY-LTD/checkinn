import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PhotoCredits } from "@/domain/types";
import CreditsPage, { metadata } from "./page";
import { PhotoCreditsList } from "./photo-credits";

const getPhotoCredits = vi.hoisted(() => vi.fn());
vi.mock("@/features/hotels/queries", () => ({ getPhotoCredits }));

const NOTE = "Stock images are illustrative and do not depict these fictional hotels.";
const INSTRUCTIONS = "Use the photographer credit and licence on the source page.";

const credits: PhotoCredits = {
  cities: [
    {
      cityId: "cape-town",
      cityName: "Cape Town",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Cape.jpg",
      creditInstructions: INSTRUCTIONS,
    },
    {
      cityId: "durban",
      cityName: "Durban",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Durban.jpg",
      creditInstructions: INSTRUCTIONS,
    },
  ],
  hotels: [
    {
      hotelId: "hotel-001",
      hotelName: "Harbourlight Retreat",
      photos: [
        {
          alt: "Resort exterior and swimming pool",
          provider: "Unsplash",
          sourceUrl: "https://images.unsplash.com/photo-1",
          licenseUrl: "https://unsplash.com/license",
        },
        {
          alt: "Hotel bedroom",
          provider: "Unsplash",
          sourceUrl: "https://images.unsplash.com/photo-2",
          licenseUrl: "https://unsplash.com/license",
        },
      ],
      note: NOTE,
    },
  ],
};

beforeEach(() => {
  getPhotoCredits.mockReset().mockReturnValue(new Promise(() => {}));
});

describe("CreditsPage", () => {
  it("has the Photo credits title and headline, and a skeleton while loading", () => {
    const { container } = render(<CreditsPage />);

    expect(metadata.title).toBe("Photo credits");
    expect(
      screen.getByRole("heading", { level: 1, name: "Photo credits" }),
    ).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("PhotoCreditsList", () => {
  it("gives each City a row with its source and licence link and instructions", async () => {
    getPhotoCredits.mockResolvedValue(credits);
    render(await PhotoCreditsList());

    const cities = within(screen.getByRole("region", { name: "Cities" }));
    expect(
      cities.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent),
    ).toEqual(["Cape Town", "Durban"]);
    expect(
      cities.getByRole("link", { name: "Source and licence: Cape Town" }),
    ).toHaveAttribute("href", credits.cities[0].sourceUrl);
    expect(cities.getAllByText(INSTRUCTIONS)).toHaveLength(2);
  });

  it("gives each Hotel a row linking both photos, the provider licence and the note", async () => {
    getPhotoCredits.mockResolvedValue(credits);
    render(await PhotoCreditsList());

    const hotels = within(screen.getByRole("region", { name: "Hotels" }));
    expect(
      hotels.getByRole("heading", { level: 3, name: "Harbourlight Retreat" }),
    ).toBeInTheDocument();
    expect(
      hotels.getByRole("link", {
        name: "Resort exterior and swimming pool, Harbourlight Retreat",
      }),
    ).toHaveAttribute("href", "https://images.unsplash.com/photo-1");
    expect(
      hotels.getByRole("link", { name: "Hotel bedroom, Harbourlight Retreat" }),
    ).toHaveAttribute("href", "https://images.unsplash.com/photo-2");
    const licences = hotels.getAllByRole("link", { name: "Unsplash licence" });
    expect(licences).toHaveLength(2);
    expect(licences[0]).toHaveAttribute("href", "https://unsplash.com/license");
    expect(hotels.getByText(NOTE)).toBeInTheDocument();
  });

  it("shows no images", async () => {
    getPhotoCredits.mockResolvedValue(credits);
    render(await PhotoCreditsList());

    expect(screen.queryByRole("img")).toBeNull();
  });
});
