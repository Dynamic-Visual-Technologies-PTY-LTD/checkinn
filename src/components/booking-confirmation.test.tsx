import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { snapshotCancellationLine } from "@/domain/cancellation";
import type { BookingView } from "@/domain/types";
import { formatZar } from "@/lib/format";
import { BookingConfirmation } from "./booking-confirmation";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");

const booking: BookingView = {
  reference: "CI-4M8D2X",
  hotelId: "hotel-005",
  hotelName: "Coral Coast Resort",
  status: "confirmed",
  stay: { checkIn: "2026-11-13", checkOut: "2026-11-18" },
  party: { adults: 2, children: 3, rooms: 2 },
  guestName: "Sipho Dlamini",
  lines: [
    { roomTypeId: "hotel-005-standard", name: "Standard Double", quantity: 1, lineTotalRand: 11000 },
    { roomTypeId: "hotel-005-family", name: "Family Room", quantity: 1, lineTotalRand: 13750 },
  ],
  roomCount: 2,
  bookingTotalRand: 24750,
  cancellationPolicy: "free_until_48_hours_before_check_in",
  cancellationDeadline: "2026-11-11T12:00:00.000Z",
  cancelledAt: null,
};

function renderConfirmation() {
  render(
    <BookingConfirmation
      booking={booking}
      cancellation={snapshotCancellationLine(
        booking.cancellationPolicy,
        booking.cancellationDeadline,
        "2026-11-01T08:00:00.000Z",
      )}
    />,
  );
}

describe("BookingConfirmation", () => {
  it("is step 3 with the headline and the reference block", () => {
    renderConfirmation();

    expect(screen.getByText("3 Confirmation")).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { level: 1, name: "You're booked!" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    expect(screen.getByText("CI-4M8D2X")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy booking reference CI-4M8D2X" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage this booking" })).toHaveAttribute(
      "href",
      "/manage?reference=CI-4M8D2X",
    );
  });

  it("shows the stored summary: Hotel, Stay, guest, both lines, total and policy", () => {
    renderConfirmation();

    const summary = within(screen.getByRole("complementary", { name: "Booking summary" }));
    expect(summary.getByRole("heading", { name: "Coral Coast Resort" })).toBeInTheDocument();
    expect(summary.getByText("Fri 13 – Wed 18 Nov 2026")).toBeInTheDocument();
    expect(summary.getByText("5 nights, 2 adults, 3 children")).toBeInTheDocument();
    expect(summary.getByText("Guest: Sipho Dlamini")).toBeInTheDocument();
    expect(summary.getByText("1 × Standard Double")).toBeInTheDocument();
    expect(summary.getByText("1 × Family Room")).toBeInTheDocument();
    expect(summary.getByText(sp(formatZar(24750, { cents: true })))).toBeInTheDocument();
    expect(summary.getByText("until Wed 11 Nov 2026, 14:00")).toBeInTheDocument();
    expect(summary.queryByRole("button")).toBeNull();
  });
});
