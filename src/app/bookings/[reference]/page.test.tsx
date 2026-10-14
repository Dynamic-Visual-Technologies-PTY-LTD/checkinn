import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingView } from "@/domain/types";
import { BookingContent } from "./booking-content";
import BookingRoute, { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getBooking: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  io: async () => {
    mocks.calls.push("io");
  },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/domain/clock", () => ({
  nowIso: () => {
    mocks.calls.push("nowIso");
    return "2026-11-10T08:00:00.000Z";
  },
}));
vi.mock("@/features/booking/queries", () => ({
  getBooking: async (reference: string) => {
    mocks.calls.push("getBooking");
    return mocks.getBooking(reference);
  },
}));

const booking: BookingView = {
  reference: "CI-7K3P9Q",
  hotelId: "hotel-005",
  hotelName: "Coral Coast Resort",
  status: "confirmed",
  stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
  party: { adults: 2, children: 0, rooms: 1 },
  guestName: "Thandi Nkosi",
  lines: [
    { roomTypeId: "hotel-005-standard", name: "Standard Double", quantity: 1, lineTotalRand: 4400 },
  ],
  roomCount: 1,
  bookingTotalRand: 4400,
  cancellationPolicy: "free_until_48_hours_before_check_in",
  // The stored deadline, not one recomputed from the catalog.
  cancellationDeadline: "2026-11-09T12:00:00.000Z",
};

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.redirect.mockClear();
  mocks.getBooking.mockReset();
});

describe("generateMetadata", () => {
  it("names the reference, normalised", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ reference: "ci-7k3p9q" }),
    } as PageProps<"/bookings/[reference]">);

    expect(metadata.title).toBe("Booking CI-7K3P9Q");
  });
});

describe("BookingRoute", () => {
  it("prerenders a skeleton shell and reads nothing until the URL resolves", () => {
    const never = new Promise<never>(() => {});
    const { container } = render(
      <BookingRoute
        params={never as PageProps<"/bookings/[reference]">["params"]}
        searchParams={never}
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mocks.getBooking).not.toHaveBeenCalled();
  });
});

describe("BookingContent", () => {
  it("normalises the reference and shows the confirmation from the snapshot", async () => {
    mocks.getBooking.mockResolvedValue(booking);

    render(await BookingContent({ params: Promise.resolve({ reference: " ci-7k3p9q" }) }));

    expect(mocks.getBooking).toHaveBeenCalledWith("CI-7K3P9Q");
    expect(mocks.calls).toEqual(["getBooking", "io", "nowIso"]);
    expect(screen.getByRole("heading", { level: 1, name: "You're booked!" })).toBeInTheDocument();
    expect(screen.getByText("CI-7K3P9Q")).toBeInTheDocument();
    expect(screen.getByText("Guest: Thandi Nkosi")).toBeInTheDocument();
    // The stored deadline has passed at "now".
    expect(screen.getByText("Free cancellation ended on Mon 9 Nov 2026, 14:00.")).toBeInTheDocument();
  });

  it("sends a browser without the token, or an unknown reference, to Manage booking", async () => {
    mocks.getBooking.mockResolvedValue(null);

    await expect(
      BookingContent({ params: Promise.resolve({ reference: "ci-7k3p9q" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/manage?reference=CI-7K3P9Q");
  });
});
