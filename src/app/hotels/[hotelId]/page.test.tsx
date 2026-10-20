import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelPage } from "@/domain/types";
import type { ReactElement } from "react";
import { AvailabilityResults, type AvailabilityContext } from "./availability-section";
import { HotelContent, HotelDetails } from "./hotel-details";
import HotelRoute, { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getHotelPage: vi.fn(),
  getAvailability: vi.fn(),
  io: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/cache", () => ({ io: mocks.io }));
vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/booking/actions", () => ({ startBooking: vi.fn() }));
vi.mock("@/domain/clock", () => ({
  todayIn: () => {
    mocks.calls.push("todayIn");
    return "2026-11-10";
  },
  nowIso: () => {
    mocks.calls.push("nowIso");
    return "2026-11-10T08:00:00.000Z";
  },
}));
vi.mock("@/features/hotels/queries", () => ({
  getHotelPage: mocks.getHotelPage,
  getAvailability: mocks.getAvailability,
}));

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
  rooms: [
    {
      id: "hotel-001-standard",
      name: "Standard Double",
      maxGuests: 2,
      bedsLabel: "1 double bed",
      amenities: [{ key: "private_bathroom", label: "Private bathroom" }],
      nightlyRand: 2450,
    },
    {
      id: "hotel-001-family",
      name: "Family Room",
      maxGuests: 4,
      bedsLabel: "1 double bed, 2 single beds",
      amenities: [{ key: "private_bathroom", label: "Private bathroom" }],
      nightlyRand: 3000,
    },
  ],
  cancellationPolicy: "non_refundable",
  checkInTime: "14:00",
};

const NO_DATES = {
  today: "2026-11-10",
  now: "2026-11-10T08:00:00.000Z",
  stale: false,
  criteria: {
    q: "",
    stay: null,
    party: { adults: 2, children: 0, rooms: 1 },
    hotel: null,
    sel: null,
    k: null,
    notice: null,
    smart: null,
    bestFit: null,
  },
} satisfies AvailabilityContext;

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

    // The skeleton is aria-hidden, so no role or text can find it.
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
          adults: "2",
          children: "0",
          rooms: "1",
        }),
      }),
    );

    expect(mocks.calls).toEqual(["io", "todayIn", "nowIso"]);
    expect(mocks.getHotelPage).toHaveBeenCalledWith("hotel-001");
    expect(
      screen.getByRole("heading", { level: 1, name: "Harbourlight Retreat" }),
    ).toBeInTheDocument();
  });

  it("passes the URL's Stay to the Availability section, which shows priced rows", async () => {
    mocks.getHotelPage.mockResolvedValue(harbourlight);
    mocks.getAvailability.mockResolvedValue(
      new Map([
        ["hotel-001-standard", 10],
        ["hotel-001-family", 4],
      ]),
    );

    // Async server components can't render in jsdom, so read what HotelContent
    // hands the section and render the section's data part from it.
    const page = await HotelContent({
      params: Promise.resolve({ hotelId: "hotel-001" }),
      searchParams: Promise.resolve({
        checkIn: "2026-11-13",
        checkOut: "2026-11-15",
        adults: "2",
        children: "0",
        rooms: "1",
      }),
    });
    const { availability } = (page as ReactElement<{ availability: AvailabilityContext }>).props;
    expect(availability.today).toBe("2026-11-10");
    expect(availability.now).toBe("2026-11-10T08:00:00.000Z");
    expect(availability.stale).toBe(false);
    const { stay } = availability.criteria;
    expect(stay).toEqual({ checkIn: "2026-11-13", checkOut: "2026-11-15" });

    render(
      await AvailabilityResults({
        hotel: harbourlight,
        stay: stay!,
        today: availability.today,
        now: availability.now,
        criteria: availability.criteria,
      }),
    );

    expect(screen.getByRole("columnheader", { name: "Price for 2 nights" })).toBeInTheDocument();
    expect(mocks.getAvailability).toHaveBeenCalledWith("hotel-001", stay);
    expect(screen.getByRole("combobox", { name: "Rooms of Standard Double" })).toBeInTheDocument();
    expect(screen.getByText("4 900 rand")).toBeInTheDocument();
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
    return render(
      <HotelDetails
        hotel={{ ...harbourlight, ...hotel }}
        sharePath={SHARE_PATH}
        availability={NO_DATES}
      />,
    );
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
      // Proves the visible parts are aria-hidden; no role query can see that.
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

  it("ends with the Availability section: steps, its focusable heading and the no-dates table", () => {
    renderDetails();

    const section = screen.getByRole("region", { name: "Availability" });
    const heading = within(section).getByRole("heading", { level: 2, name: "Availability" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(within(section).getByText("1 Your selection")).toHaveAttribute("aria-current", "step");
    expect(
      within(section).getByText("Select dates to see this property's availability and prices"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("region").at(-1)).toBe(section);
  });
});
