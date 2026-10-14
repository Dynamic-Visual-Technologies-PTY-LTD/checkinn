import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingView } from "@/domain/types";
import { BookingContent } from "./booking-content";
import BookingRoute, { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getBooking: vi.fn(),
  justBooked: false,
  now: "2026-11-10T08:00:00.000Z",
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  io: async () => {
    mocks.calls.push("io");
  },
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/domain/clock", () => ({
  nowIso: () => {
    mocks.calls.push("nowIso");
    return mocks.now;
  },
}));
vi.mock("@/features/booking/queries", () => ({
  getBooking: async (reference: string) => {
    mocks.calls.push("getBooking");
    return mocks.getBooking(reference);
  },
  wasJustBooked: async () => {
    mocks.calls.push("wasJustBooked");
    return mocks.justBooked;
  },
}));
vi.mock("@/features/booking/actions", () => ({ cancelBooking: vi.fn() }));

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
  cancelledAt: null,
};

/** The definition paired with a term in the details list, as a screen reader pairs them. */
function definitionOf(term: string): HTMLElement {
  const index = screen.getAllByRole("term").findIndex((element) => element.textContent === term);
  return screen.getAllByRole("definition")[index];
}

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.justBooked = false;
  mocks.now = "2026-11-10T08:00:00.000Z";
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

    // The skeleton is aria-hidden, so no role or text can find it.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mocks.getBooking).not.toHaveBeenCalled();
  });
});

const NO_QUERY = Promise.resolve({});

function content(reference: string, query: Record<string, string> = {}) {
  return BookingContent({
    params: Promise.resolve({ reference }),
    searchParams: Promise.resolve(query),
  });
}

describe("BookingContent", () => {
  it("shows the confirmation from the snapshot right after confirming", async () => {
    mocks.getBooking.mockResolvedValue(booking);
    mocks.justBooked = true;

    render(await content(" ci-7k3p9q"));

    expect(mocks.getBooking).toHaveBeenCalledWith("CI-7K3P9Q");
    expect(mocks.calls).toEqual(["getBooking", "wasJustBooked", "io", "nowIso"]);
    expect(screen.getByRole("heading", { level: 1, name: "You're booked!" })).toBeInTheDocument();
    expect(screen.getByText("CI-7K3P9Q")).toBeInTheDocument();
    expect(screen.getByText("Guest: Thandi Nkosi")).toBeInTheDocument();
    // The stored deadline has passed at "now".
    expect(screen.getByText("Free cancellation ended on Mon 9 Nov 2026, 14:00.")).toBeInTheDocument();
  });

  it("shows the Booking view otherwise, with its status and the open cancellation", async () => {
    mocks.getBooking.mockResolvedValue(booking);
    mocks.now = "2026-11-05T08:00:00.000Z";

    render(await content("CI-7K3P9Q"));

    expect(screen.getByRole("heading", { level: 1, name: "Your booking" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "You're booked!" })).toBeNull();
    expect(definitionOf("Status")).toHaveTextContent("Confirmed");
    expect(screen.getByText("Free cancellation")).toBeInTheDocument();
    expect(screen.getByText("until Mon 9 Nov 2026, 14:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel booking" })).toBeInTheDocument();
  });

  it("shows no cancel button once the deadline has passed", async () => {
    mocks.getBooking.mockResolvedValue(booking);

    render(await content("CI-7K3P9Q"));

    expect(screen.getByText("Free cancellation ended on Mon 9 Nov 2026, 14:00.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
  });

  it("shows no cancel button for a Non-refundable Booking", async () => {
    mocks.getBooking.mockResolvedValue({
      ...booking,
      cancellationPolicy: "non_refundable",
      cancellationDeadline: null,
    });
    mocks.now = "2026-10-14T08:00:00.000Z";

    render(await content("CI-7K3P9Q"));

    expect(screen.getByText("Non-refundable. This booking can't be cancelled.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
  });

  it("shows a cancelled Booking with its date and no cancel button, even when just booked", async () => {
    mocks.getBooking.mockResolvedValue({
      ...booking,
      status: "cancelled",
      cancelledAt: "2026-11-05T08:00:00.000Z",
    });
    mocks.justBooked = true;
    mocks.now = "2026-11-05T09:00:00.000Z";

    render(await content("CI-7K3P9Q"));

    expect(screen.getByRole("heading", { level: 1, name: "Your booking" })).toBeInTheDocument();
    expect(definitionOf("Status")).toHaveTextContent(
      "Cancelled on Thu 5 Nov 2026",
    );
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
    expect(screen.queryByText("Free cancellation")).toBeNull();
    // No notice in the URL: no alert.
    expect(screen.queryByText("Your booking is cancelled.")).toBeNull();
  });

  it("shows the cancelled alert with notice=cancelled, and takes focus", async () => {
    window.history.replaceState(null, "", "/bookings/CI-7K3P9Q?notice=cancelled");
    mocks.getBooking.mockResolvedValue({
      ...booking,
      status: "cancelled",
      cancelledAt: "2026-11-05T08:00:00.000Z",
    });

    render(await content("CI-7K3P9Q", { notice: "cancelled" }));

    const alert = screen.getByRole("group", { name: "Your booking is cancelled." });
    expect(alert).toHaveFocus();
    // The notice leaves the address bar, so a reload doesn't show it again.
    expect(window.location.search).toBe("");
    expect(mocks.calls).not.toContain("wasJustBooked");
  });

  it("ignores notice=cancelled on a Booking that is still Confirmed", async () => {
    mocks.getBooking.mockResolvedValue(booking);
    mocks.justBooked = true;

    render(await content("CI-7K3P9Q", { notice: "cancelled" }));

    expect(screen.getByRole("heading", { level: 1, name: "You're booked!" })).toBeInTheDocument();
    expect(screen.queryByText("Your booking is cancelled.")).toBeNull();
  });

  it("sends a browser without the token, or an unknown reference, to Manage booking", async () => {
    mocks.getBooking.mockResolvedValue(null);

    await expect(
      BookingContent({ params: Promise.resolve({ reference: "ci-7k3p9q" }), searchParams: NO_QUERY }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/manage?reference=CI-7K3P9Q");
    expect(mocks.calls).not.toContain("wasJustBooked");
  });
});
