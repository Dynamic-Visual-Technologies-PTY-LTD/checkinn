import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RoomSelection } from "@/domain/types";
import { RoomSelectionPanel, replaceSelectionInUrl } from "./room-selection";

vi.mock("@/features/booking/actions", () => ({ startBooking: vi.fn() }));

it("writes the selection into the URL and drops sq and smart (AD-21)", () => {
  window.history.replaceState(
    null,
    "",
    "/hotels/hotel-001?checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1" +
      "&sq=quiet+hotel&smart=1",
  );

  replaceSelectionInUrl([{ roomTypeId: "hotel-001-standard", quantity: 1 }], "2026-11-10");

  expect(`${window.location.pathname}${window.location.search}`).toBe(
    "/hotels/hotel-001?checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1" +
      "&sel=hotel-001-standard%3A1",
  );
});

it("keeps bestFit when it writes the selection (AD-21)", () => {
  window.history.replaceState(
    null,
    "",
    "/hotels/hotel-010?checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1" +
      "&bestFit=hotel-010-family",
  );

  replaceSelectionInUrl([{ roomTypeId: "hotel-010-family", quantity: 2 }], "2026-11-10");

  expect(`${window.location.pathname}${window.location.search}`).toBe(
    "/hotels/hotel-010?checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1" +
      "&sel=hotel-010-family%3A2&bestFit=hotel-010-family",
  );
});

it("writes no sel for an empty selection, keeping bestFit, so a reload pre-selects again (AD-26)", () => {
  const base =
    "/hotels/hotel-010?checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1";
  window.history.replaceState(null, "", `${base}&sel=hotel-010-family%3A1&bestFit=hotel-010-family`);

  replaceSelectionInUrl([], "2026-11-10");

  expect(`${window.location.pathname}${window.location.search}`).toBe(
    `${base}&bestFit=hotel-010-family`,
  );
});

describe("RoomSelectionPanel and a new server selection", () => {
  const PICKED = "Family Room picked for your search. Change it in the table.";
  const URL_BASE =
    "/hotels/hotel-010?checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1";
  const family1: RoomSelection[] = [{ roomTypeId: "hotel-010-family", quantity: 1 }];

  function props(
    initialSelection: RoomSelection[],
    preselected: boolean,
  ): ComponentProps<typeof RoomSelectionPanel> {
    return {
      hotelId: "hotel-010",
      hotelName: "Winelands Family Lodge",
      rooms: [
        {
          id: "hotel-010-standard",
          name: "Standard Double",
          maxGuests: 2,
          bedsLabel: "1 double bed",
          amenities: [],
          nightlyRand: 1450,
        },
        {
          id: "hotel-010-family",
          name: "Family Room",
          maxGuests: 4,
          bedsLabel: "1 double bed, 2 single beds",
          amenities: [],
          nightlyRand: 2000,
        },
      ],
      cancellationPolicy: "non_refundable",
      checkInTime: "14:00",
      today: "2026-11-10",
      now: "2026-11-10T08:00:00.000Z",
      q: "",
      stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
      party: { adults: 4, children: 0, rooms: 1 },
      availability: { "hotel-010-standard": 5, "hotel-010-family": 3 },
      initialSelection,
      loweredNotice: "",
      selectionLowered: false,
      bestFitRoomTypeId: "hotel-010-family",
      preselected,
    };
  }

  const familySelect = () => screen.getByRole("combobox", { name: "Rooms of Family Room" });
  const aside = () => screen.getByRole("complementary", { name: "Booking summary" });

  it("re-applies the same Best-fit pre-selection after the Guest cleared it (a Party change)", () => {
    window.history.replaceState(null, "", `${URL_BASE}&bestFit=hotel-010-family`);
    const { rerender } = render(<RoomSelectionPanel {...props(family1, true)} />);
    expect(familySelect()).toHaveValue("1");

    fireEvent.change(familySelect(), { target: { value: "0" } });
    expect(familySelect()).toHaveValue("0");
    expect(within(aside()).queryByText(PICKED)).toBeNull();

    // The Party changes; the server pre-selects the Family Room × 1 again.
    rerender(<RoomSelectionPanel {...props([...family1], true)} />);

    expect(familySelect()).toHaveValue("1");
    expect(within(aside()).getByText(PICKED)).toBeInTheDocument();
  });

  it("keeps the Guest's selection when the server echoes it back (MVP)", () => {
    window.history.replaceState(null, "", URL_BASE);
    const { rerender } = render(<RoomSelectionPanel {...props([], false)} />);

    fireEvent.change(familySelect(), { target: { value: "2" } });
    expect(new URLSearchParams(window.location.search).get("sel")).toBe("hotel-010-family:2");
    fireEvent.change(screen.getByRole("combobox", { name: "Rooms of Standard Double" }), {
      target: { value: "1" },
    });

    // A re-render from the URL whose sel is the Guest's own selection.
    rerender(
      <RoomSelectionPanel
        {...props(
          [
            { roomTypeId: "hotel-010-standard", quantity: 1 },
            { roomTypeId: "hotel-010-family", quantity: 2 },
          ],
          false,
        )}
      />,
    );

    expect(familySelect()).toHaveValue("2");
    expect(screen.getByRole("combobox", { name: "Rooms of Standard Double" })).toHaveValue("1");
    expect(within(aside()).getByText("3 rooms selected")).toBeInTheDocument();
  });
});
