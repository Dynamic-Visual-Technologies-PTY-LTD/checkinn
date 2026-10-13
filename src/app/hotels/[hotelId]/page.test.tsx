import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelPage } from "@/domain/types";
import { HotelContent, HotelDetails } from "./hotel-details";
import HotelRoute, { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getHotelPage: vi.fn(),
  io: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/domain/clock", () => ({
  todayIn: () => {
    mocks.calls.push("todayIn");
    return "2026-11-10";
  },
}));
vi.mock("@/features/hotels/queries", () => ({ getHotelPage: mocks.getHotelPage }));

const harbourlight: HotelPage = {
  hotelId: "hotel-001",
  name: "Harbourlight Retreat",
  category: "luxury",
  starRating: 5,
  area: "V&A Waterfront",
  cityName: "Cape Town",
  province: "Western Cape",
  description: "A fictional coastal retreat with spacious rooms and a relaxed pool terrace.",
  reviewScore: 4.8,
  reviewLabel: "Superb",
  reviewCount: 248,
  facilities: [
    { key: "wifi", label: "Free Wi-Fi" },
    { key: "pool", label: "Swimming pool" },
    { key: "spa", label: "Spa" },
    { key: "restaurant", label: "Restaurant" },
    { key: "parking", label: "Free parking" },
  ],
  photos: [
    { url: "https://images.unsplash.com/photo-1?w=1200", alt: "Resort exterior and swimming pool" },
    { url: "https://images.unsplash.com/photo-2?w=1200", alt: "Hotel bedroom" },
  ],
  houseRules: [
    { term: "Check-in", value: "From 14:00" },
    { term: "Check-out", value: "Until 10:00" },
    { term: "Children", value: "Children are welcome" },
    { term: "Pets", value: "Pets are not allowed" },
    { term: "Smoking", value: "Smoking is not allowed" },
    { term: "Cancellation", value: "Non-refundable. This booking can't be cancelled." },
  ],
};

const SHARE_PATH = "/hotels/hotel-001?adults=2&children=0&rooms=1";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.getHotelPage.mockReset();
  mocks.notFound.mockClear();
  mocks.io.mockReset();
  mocks.io.mockImplementation(async () => {
    mocks.calls.push("io");
  });
});

describe("HotelRoute", () => {
  it("prerenders a skeleton shell and reads nothing until the URL resolves", () => {
    const never = new Promise<never>(() => {});
    const { container } = render(
      <HotelRoute
        params={never as PageProps<"/hotels/[hotelId]">["params"]}
        searchParams={never}
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mocks.getHotelPage).not.toHaveBeenCalled();
  });
});

describe("generateMetadata", () => {
  it("titles the page after the Hotel", async () => {
    mocks.getHotelPage.mockResolvedValue(harbourlight);

    const metadata = await generateMetadata({
      params: Promise.resolve({ hotelId: "hotel-001" }),
      searchParams: Promise.resolve({}),
    } as PageProps<"/hotels/[hotelId]">);

    expect(metadata.title).toBe("Harbourlight Retreat");
    expect(mocks.getHotelPage).toHaveBeenCalledWith("hotel-001");
  });

  it("titles an unknown Hotel Page not found", async () => {
    mocks.getHotelPage.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ hotelId: "nope" }),
      searchParams: Promise.resolve({}),
    } as PageProps<"/hotels/[hotelId]">);

    expect(metadata.title).toBe("Page not found");
  });
});

describe("HotelContent", () => {
  it("reads today after io() and loads the Hotel by id", async () => {
    mocks.getHotelPage.mockResolvedValue(harbourlight);

    render(
      await HotelContent({
        params: Promise.resolve({ hotelId: "hotel-001" }),
        searchParams: Promise.resolve({
          q: "Cape Town",
          checkIn: "2026-11-13",
          checkOut: "2026-11-15",
          adults: "2",
          children: "0",
          rooms: "1",
        }),
      }),
    );

    expect(mocks.calls).toEqual(["io", "todayIn"]);
    expect(mocks.getHotelPage).toHaveBeenCalledWith("hotel-001");
    expect(
      screen.getByRole("heading", { level: 1, name: "Harbourlight Retreat" }),
    ).toBeInTheDocument();
  });

  it("calls notFound for an unknown id", async () => {
    mocks.getHotelPage.mockResolvedValue(null);

    await expect(
      HotelContent({
        params: Promise.resolve({ hotelId: "nope" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalled();
  });
});

describe("HotelDetails", () => {
  function renderDetails(hotel: Partial<HotelPage> = {}) {
    return render(<HotelDetails hotel={{ ...harbourlight, ...hotel }} sharePath={SHARE_PATH} />);
  }

  it("shows the header: category, name, stars, location and actions", () => {
    renderDetails();

    expect(screen.getByText("luxury")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Harbourlight Retreat" }),
    ).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("img", { name: "5-star hotel" })).toBeInTheDocument();
    expect(screen.getByText("V&A Waterfront, Cape Town, Western Cape")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Harbourlight Retreat" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "We Price Match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See rooms" })).toBeInTheDocument();
  });

  it("shows both photos with their seed alt text", () => {
    renderDetails();

    const photos = within(screen.getByRole("list", { name: "Photos" }));
    expect(photos.getByRole("img", { name: "Resort exterior and swimming pool" })).toBeInTheDocument();
    expect(photos.getByRole("img", { name: "Hotel bedroom" })).toBeInTheDocument();
  });

  it("shows the review panel with one spoken sentence", () => {
    renderDetails();

    const panel = screen.getByRole("region", { name: "Guest reviews" });
    for (const text of ["4.8", "/ 5", "Superb", "248 reviews"]) {
      expect(within(panel).getByText(text).closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(within(panel).getByText("Rated 4.8 out of 5, Superb, 248 reviews")).toBeInTheDocument();
  });

  it("leaves the label out below 3.0", () => {
    renderDetails({ reviewScore: 2.9, reviewLabel: null, reviewCount: 1 });

    const panel = within(screen.getByRole("region", { name: "Guest reviews" }));
    expect(panel.getByText("2.9")).toBeInTheDocument();
    expect(panel.getByText("Rated 2.9 out of 5, 1 review")).toBeInTheDocument();
  });

  it("lists every Facility with its seed label", () => {
    renderDetails();

    const facilities = within(screen.getByRole("region", { name: "Most popular facilities" }));
    expect(facilities.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Free Wi-Fi",
      "Swimming pool",
      "Spa",
      "Restaurant",
      "Free parking",
    ]);
  });

  it("shows the description and the house rules as a definition list", () => {
    renderDetails();

    expect(screen.getByRole("heading", { level: 2, name: "About this property" })).toBeInTheDocument();
    expect(screen.getByText(harbourlight.description)).toBeInTheDocument();

    const rules = within(screen.getByRole("region", { name: "House rules" }));
    const terms = rules.getAllByRole("term").map((term) => term.textContent);
    const values = rules.getAllByRole("definition").map((value) => value.textContent);
    expect(terms).toEqual(["Check-in", "Check-out", "Children", "Pets", "Smoking", "Cancellation"]);
    expect(values).toEqual(harbourlight.houseRules.map((rule) => rule.value));
  });

  it("ends with an Availability section holding only its focusable heading", () => {
    renderDetails();

    const section = screen.getByRole("region", { name: "Availability" });
    const heading = within(section).getByRole("heading", { level: 2, name: "Availability" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(section.children).toHaveLength(1);
    expect(screen.getAllByRole("region").at(-1)).toBe(section);
  });
});
