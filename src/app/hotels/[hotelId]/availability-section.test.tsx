import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HotelPage, SearchCriteria } from "@/domain/types";
import { formatZar } from "@/lib/format";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");
import {
  AvailabilitySection,
  AvailabilityResults,
  type AvailabilityContext,
} from "./availability-section";
import { DatesFieldProvider, StayPartyPicker } from "./stay-party-picker";

const mocks = vi.hoisted(() => ({
  getAvailability: vi.fn(),
  startBooking: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/booking/actions", () => ({ startBooking: mocks.startBooking }));
vi.mock("@/features/hotels/queries", () => ({ getAvailability: mocks.getAvailability }));

const hotel: HotelPage = {
  hotelId: "hotel-005",
  name: "Coral Coast Resort",
  category: "family",
  starRating: 4,
  area: "Umhlanga",
  cityName: "Durban",
  province: "KwaZulu-Natal",
  description: "",
  reviewScore: 4.2,
  reviewLabel: "Very good",
  reviewCount: 10,
  facilities: [],
  photos: [],
  houseRules: [],
  rooms: [
    {
      id: "hotel-005-standard",
      name: "Standard Double",
      maxGuests: 2,
      bedsLabel: "1 double bed",
      amenities: [],
      nightlyRand: 2200,
    },
    {
      id: "hotel-005-family",
      name: "Family Room",
      maxGuests: 4,
      bedsLabel: "1 double bed, 2 single beds",
      amenities: [],
      nightlyRand: 2750,
    },
  ],
  cancellationPolicy: "free_until_48_hours_before_check_in",
  checkInTime: "14:00",
};

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };

function criteria(overrides: Partial<SearchCriteria> = {}): SearchCriteria {
  return {
    q: "",
    stay,
    party: { adults: 3, children: 2, rooms: 1 },
    hotel: null,
    sel: null,
    k: null,
    notice: null,
    ...overrides,
  };
}

const context = (c: SearchCriteria, stale = false): AvailabilityContext => ({
  today: "2026-11-10",
  criteria: c,
  stale,
});

async function renderResults(c: SearchCriteria) {
  render(await AvailabilityResults({ hotel, stay, today: "2026-11-10", criteria: c }));
}

beforeEach(() => {
  mocks.getAvailability.mockReset();
  mocks.startBooking.mockReset();
  mocks.push.mockReset();
  mocks.getAvailability.mockResolvedValue(
    new Map([
      ["hotel-005-standard", 14],
      ["hotel-005-family", 5],
    ]),
  );
  window.history.replaceState(null, "", "/hotels/hotel-005?adults=3&children=2&rooms=1");
});

describe("AvailabilitySection", () => {
  it("shows the stale-link message with the no-dates table", () => {
    render(
      <AvailabilitySection
        hotel={hotel}
        context={context(criteria({ stay: null }), true)}
      />,
    );

    expect(screen.getByText("Those dates have passed. Pick new ones.")).toBeInTheDocument();
    expect(
      screen.getByText("Select dates to see this property's availability and prices"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reserve" })).toBeNull();
  });

  it("names the Room type that ran out in an alert at the top", () => {
    render(
      <AvailabilitySection
        hotel={hotel}
        context={context(
          criteria({
            stay: null,
            notice: { type: "room-unavailable", roomTypeIds: ["hotel-005-standard"] },
          }),
        )}
      />,
    );

    const section = screen.getByRole("region", { name: "Availability" });
    expect(section.firstElementChild).toBe(
      screen.getByRole("group", { name: "Room no longer available" }),
    );
    expect(screen.getByRole("group", { name: "Room no longer available" })).toHaveTextContent(
      "Sorry, the last Standard Double was just booked. Pick another room.",
    );
  });
});

describe("AvailabilityResults and the selection", () => {
  it("drops foreign Room types and clamps the URL selection to Availability", async () => {
    await renderResults(
      criteria({
        sel: [
          { roomTypeId: "hotel-002-standard", quantity: 1 },
          { roomTypeId: "hotel-005-family", quantity: 9 },
        ],
      }),
    );

    expect(screen.getByRole("combobox", { name: "Rooms of Family Room" })).toHaveValue("5");
    expect(screen.getByRole("combobox", { name: "Rooms of Standard Double" })).toHaveValue("0");
    expect(screen.getByRole("status", { hidden: true })).toHaveTextContent(
      "Family Room lowered to 5, the most available for your dates.",
    );
    // The address bar follows the clamp: only the Family Room, at 5.
    expect(new URLSearchParams(window.location.search).get("sel")).toBe("hotel-005-family:5");
  });

  it("blocks Reserve with nothing selected", async () => {
    await renderResults(criteria());

    const aside = screen.getByRole("complementary", { name: "Booking summary" });
    const reserve = within(aside).getByRole("button", { name: "Reserve" });
    expect(reserve).toHaveAttribute("aria-disabled", "true");
    expect(reserve).toHaveAccessibleDescription("Select at least one room.");
    fireEvent.click(reserve);
    expect(mocks.startBooking).not.toHaveBeenCalled();
  });

  it("selects rooms, totals them, replaces the URL and enables Reserve once the party fits", async () => {
    const replace = vi.spyOn(window.history, "replaceState");
    const pushState = vi.spyOn(window.history, "pushState");
    await renderResults(criteria());
    const aside = screen.getByRole("complementary", { name: "Booking summary" });

    fireEvent.change(screen.getByRole("combobox", { name: "Rooms of Family Room" }), {
      target: { value: "1" },
    });

    expect(within(aside).getByText("1 room selected")).toBeInTheDocument();
    expect(within(aside).getAllByText(sp(formatZar(5500, { cents: true })))).toHaveLength(2);
    expect(replace).toHaveBeenLastCalledWith(
      null,
      "",
      expect.stringContaining("sel=hotel-005-family%3A1"),
    );
    const blocked = within(aside).getByRole("button", { name: "Reserve" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription(
      "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Rooms of Standard Double" }), {
      target: { value: "1" },
    });

    expect(within(aside).getByText("2 rooms selected")).toBeInTheDocument();
    expect(within(aside).getByRole("button", { name: "Reserve" })).not.toHaveAttribute(
      "aria-disabled",
    );
    expect(pushState).not.toHaveBeenCalled();
    replace.mockRestore();
    pushState.mockRestore();
  });

  it("calls startBooking with the selection when Reserve is enabled", async () => {
    mocks.startBooking.mockResolvedValue({ ok: false, code: "VALIDATION", message: "Nope." });
    await renderResults(
      criteria({
        sel: [
          { roomTypeId: "hotel-005-standard", quantity: 1 },
          { roomTypeId: "hotel-005-family", quantity: 1 },
        ],
      }),
    );
    const aside = screen.getByRole("complementary", { name: "Booking summary" });

    await act(async () => {
      fireEvent.click(within(aside).getByRole("button", { name: "Reserve" }));
    });

    expect(mocks.startBooking).toHaveBeenCalledWith({
      hotelId: "hotel-005",
      q: "",
      stay,
      party: { adults: 3, children: 2, rooms: 1 },
      sel: [
        { roomTypeId: "hotel-005-standard", quantity: 1 },
        { roomTypeId: "hotel-005-family", quantity: 1 },
      ],
    });
    expect(within(aside).getByText("Nope.")).toBeInTheDocument();
  });

  it("offers Change dates and no Reserve when everything is sold out", async () => {
    mocks.getAvailability.mockResolvedValue(
      new Map([
        ["hotel-005-standard", 0],
        ["hotel-005-family", 0],
      ]),
    );
    render(
      <DatesFieldProvider>
        <StayPartyPicker
          hotelId="hotel-005"
          today="2026-11-10"
          q=""
          stay={stay}
          party={criteria().party}
        />
        {await AvailabilityResults({ hotel, stay, today: "2026-11-10", criteria: criteria() })}
      </DatesFieldProvider>,
    );

    expect(screen.getByText(/No rooms left for these dates. Try other dates./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reserve" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Change dates" }));
    expect(screen.getAllByRole("button", { name: /Dates/ })[0]).toHaveFocus();
  });

  it("shows the phone bar with 0 rooms and R 0,00", async () => {
    await renderResults(criteria());

    const bar = screen.getByRole("region", { name: "Booking summary" });
    expect(bar).toHaveTextContent(`0 rooms · ${sp(formatZar(0, { cents: true }))}`);
  });
});
