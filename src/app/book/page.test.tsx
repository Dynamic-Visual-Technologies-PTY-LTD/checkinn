import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingQuote, BookingView } from "@/domain/types";
import {
  ALREADY_CONFIRMED_HEADLINE,
  BookContent,
  bookPageTitle,
  loadBookPage,
  type BookPageState,
} from "./book-content";
import BookRoute, { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  getBookingByKey: vi.fn(),
  getBookingQuote: vi.fn(),
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
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
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
vi.mock("@/features/booking/queries", () => ({
  getBookingByKey: mocks.getBookingByKey,
  getBookingQuote: mocks.getBookingQuote,
}));
vi.mock("@/features/booking/actions", () => ({ confirmBooking: vi.fn() }));

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const party = { adults: 2, children: 0, rooms: 1 };
const KEY = "0b9f3c2e-4a5d-4e6f-8a7b-9c0d1e2f3a4b";

const quote: BookingQuote = {
  hotelId: "hotel-001",
  hotelName: "Harbourlight Retreat",
  checkInTime: "14:00",
  cancellationPolicy: "non_refundable",
  stay,
  party,
  lines: [
    { roomTypeId: "hotel-001-standard", name: "Standard Double", quantity: 1, lineTotalRand: 4900 },
  ],
  roomCount: 1,
  totalRand: 4900,
};

const booking: BookingView = {
  reference: "CI-7K3P9Q",
  hotelId: "hotel-001",
  hotelName: "Harbourlight Retreat",
  status: "confirmed",
  stay,
  party,
  guestName: "Thandi Nkosi",
  lines: quote.lines,
  roomCount: 1,
  bookingTotalRand: 4900,
  cancellationPolicy: "non_refundable",
  cancellationDeadline: null,
};

/** A `/book` query as `startBooking` builds it. */
function query(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {
    q: "Cape Town",
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: "2",
    children: "0",
    rooms: "1",
    hotel: "hotel-001",
    sel: "hotel-001-standard:1",
    k: KEY,
  };
  return { ...base, ...overrides };
}

const KEPT = "q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.redirect.mockClear();
  mocks.getBookingByKey.mockReset();
  mocks.getBookingByKey.mockResolvedValue(null);
  mocks.getBookingQuote.mockReset();
  mocks.getBookingQuote.mockResolvedValue({ kind: "ok", quote });
});

async function redirectHref(q: Record<string, string | undefined>): Promise<string> {
  const state = await loadBookPage(q);
  if (state.kind !== "redirect") throw new Error(`expected a redirect, got ${state.kind}`);
  return state.href;
}

describe("loadBookPage", () => {
  it("reads the clock after io(), and prices the URL's selection", async () => {
    const state = await loadBookPage(query());

    expect(mocks.calls).toEqual(["io", "todayIn", "nowIso"]);
    expect(mocks.getBookingByKey).toHaveBeenCalledWith(KEY);
    expect(mocks.getBookingQuote).toHaveBeenCalledWith({
      hotelId: "hotel-001",
      stay,
      party,
      sel: [{ roomTypeId: "hotel-001-standard", quantity: 1 }],
    });
    expect(state).toMatchObject({
      kind: "form",
      quote,
      q: "Cape Town",
      k: KEY,
      cancellation: { kind: "non-refundable", text: "Non-refundable. This booking can't be cancelled." },
      backHref: `/hotels/hotel-001?${KEPT}&sel=hotel-001-standard%3A1#availability-hotel-001`,
    });
  });

  it("words a passed free-cancellation deadline as ended", async () => {
    mocks.getBookingQuote.mockResolvedValue({
      kind: "ok",
      quote: {
        ...quote,
        cancellationPolicy: "free_until_48_hours_before_check_in",
        stay: { checkIn: "2026-11-11", checkOut: "2026-11-12" },
      },
    });

    const state = await loadBookPage(query({ checkIn: "2026-11-11", checkOut: "2026-11-12" }));

    expect(state).toMatchObject({
      kind: "form",
      cancellation: { kind: "ended", text: "Free cancellation ended on Mon 9 Nov 2026, 14:00." },
    });
  });

  it("shows the Booking for a used key when this browser holds its token (Already booked)", async () => {
    mocks.getBookingByKey.mockResolvedValue({ access: true, booking });

    const state = await loadBookPage(query());

    expect(state).toMatchObject({ kind: "booked", booking });
    expect(mocks.getBookingQuote).not.toHaveBeenCalled();
  });

  it("shows only that a used key was confirmed, to any other browser", async () => {
    mocks.getBookingByKey.mockResolvedValue({ access: false });

    expect(await loadBookPage(query())).toEqual({ kind: "already-confirmed" });
  });

  it("checks a used key before anything else, even when the dates have passed", async () => {
    mocks.getBookingByKey.mockResolvedValue({ access: true, booking });

    const state = await loadBookPage(query({ checkIn: "2026-11-01", checkOut: "2026-11-03" }));

    expect(state.kind).toBe("booked");
  });

  it("sends a missing or unknown Hotel to Search results with the criteria", async () => {
    expect(await redirectHref(query({ hotel: undefined }))).toBe(`/search?${KEPT}`);

    mocks.getBookingQuote.mockResolvedValue({ kind: "no-hotel" });
    expect(await redirectHref(query({ hotel: "nope" }))).toBe(`/search?${KEPT}`);
  });

  it("sends a missing key back to the room table with the criteria and selection", async () => {
    expect(await redirectHref(query({ k: undefined }))).toBe(
      `/hotels/hotel-001?${KEPT}&sel=hotel-001-standard%3A1#availability-hotel-001`,
    );
  });

  it("sends a selection that does not price back to the room table", async () => {
    mocks.getBookingQuote.mockResolvedValue({ kind: "invalid" });

    expect(await redirectHref(query({ sel: "hotel-005-standard:1" }))).toBe(
      `/hotels/hotel-001?${KEPT}&sel=hotel-005-standard%3A1#availability-hotel-001`,
    );
  });

  it("drops a malformed selection on the way back", async () => {
    mocks.getBookingQuote.mockResolvedValue({ kind: "invalid" });

    expect(await redirectHref(query({ sel: "hotel-001-standard:0" }))).toBe(
      `/hotels/hotel-001?${KEPT}#availability-hotel-001`,
    );
    expect(mocks.getBookingQuote).toHaveBeenCalledWith(expect.objectContaining({ sel: null }));
  });

  it("sends past dates back to the Hotel page without them", async () => {
    mocks.getBookingQuote.mockResolvedValue({ kind: "invalid" });

    const href = await redirectHref(query({ checkIn: "2026-11-01", checkOut: "2026-11-03" }));

    expect(href).toBe(
      "/hotels/hotel-001?q=Cape+Town&adults=2&children=0&rooms=1&sel=hotel-001-standard%3A1#availability-hotel-001",
    );
    expect(mocks.getBookingQuote).toHaveBeenCalledWith(expect.objectContaining({ stay: null }));
  });

  it("sends Rooms that ran out to the Hotel page with the room-unavailable notice", async () => {
    mocks.getBookingQuote.mockResolvedValue({
      kind: "unavailable",
      roomTypeIds: ["hotel-001-standard"],
    });

    expect(await redirectHref(query())).toBe(
      `/hotels/hotel-001?${KEPT}&sel=hotel-001-standard%3A1&notice=room-unavailable&rt=hotel-001-standard`,
    );
  });
});

describe("bookPageTitle", () => {
  it("names each state", () => {
    const states: [BookPageState, string][] = [
      [
        {
          kind: "form",
          quote,
          cancellation: { kind: "non-refundable", text: "" },
          q: "",
          k: KEY,
          backHref: "",
        },
        "Your details · Harbourlight Retreat",
      ],
      [
        { kind: "booked", booking, cancellation: { kind: "non-refundable", text: "" } },
        "Booking CI-7K3P9Q",
      ],
      [{ kind: "already-confirmed" }, ALREADY_CONFIRMED_HEADLINE],
      [{ kind: "redirect", href: "/" }, "Your details"],
    ];
    for (const [state, title] of states) expect(bookPageTitle(state)).toBe(title);
  });
});

describe("generateMetadata", () => {
  it("titles the page from the URL", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve(query()),
    } as PageProps<"/book">);

    expect(metadata.title).toBe("Your details · Harbourlight Retreat");
  });
});

describe("BookRoute", () => {
  it("prerenders a skeleton shell and reads nothing until the URL resolves", () => {
    const never = new Promise<never>(() => {});
    const { container } = render(<BookRoute searchParams={never} params={never} />);

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(mocks.getBookingQuote).not.toHaveBeenCalled();
  });
});

describe("BookContent", () => {
  it("redirects when the URL has no valid selection", async () => {
    mocks.getBookingQuote.mockResolvedValue({ kind: "invalid" });
    await expect(
      BookContent({ searchParams: Promise.resolve(query({ sel: undefined })) }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(`/hotels/hotel-001?${KEPT}#availability-hotel-001`);
  });

  it("renders step 2: Back to rooms, the headline, the statement, the form and summary", async () => {
    render(await BookContent({ searchParams: Promise.resolve(query()) }));

    expect(screen.getByText("2 Your details")).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("link", { name: "Back to rooms" })).toHaveAttribute(
      "href",
      `/hotels/hotel-001?${KEPT}&sel=hotel-001-standard%3A1#availability-hotel-001`,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Your details" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByText("No payment is taken. This hotel is fictional.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Your details" })).toBeInTheDocument();
    const summary = within(screen.getByRole("complementary", { name: "Booking summary" }));
    expect(summary.getByText("Non-refundable. This booking can't be cancelled.")).toBeInTheDocument();
    expect(summary.getByRole("button", { name: "Confirm booking" })).toBeInTheDocument();
  });

  it("shows the existing confirmation instead of the form for a used key", async () => {
    mocks.getBookingByKey.mockResolvedValue({ access: true, booking });

    render(await BookContent({ searchParams: Promise.resolve(query()) }));

    expect(screen.getByRole("heading", { level: 1, name: "You're booked!" })).toBeInTheDocument();
    expect(screen.getByText("CI-7K3P9Q")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm booking" })).toBeNull();
  });

  it("shows no Booking data and no form to another browser with a used key", async () => {
    mocks.getBookingByKey.mockResolvedValue({ access: false });

    render(await BookContent({ searchParams: Promise.resolve(query()) }));

    expect(
      screen.getByRole("heading", { level: 1, name: ALREADY_CONFIRMED_HEADLINE }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage booking" })).toHaveAttribute(
      "href",
      "/manage",
    );
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByText(/CI-/)).toBeNull();
    expect(screen.queryByText("Harbourlight Retreat")).toBeNull();
  });
});
