import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { cancellationLine } from "@/domain/cancellation";
import { formatZar } from "@/lib/format";
import { BookingSummary } from "./booking-summary";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const now = "2026-11-10T08:00:00.000Z";
const free = cancellationLine("free_until_48_hours_before_check_in", stay.checkIn, "14:00", now);
const ended = cancellationLine(
  "free_until_48_hours_before_check_in",
  stay.checkIn,
  "14:00",
  "2026-11-12T08:00:00.000Z",
);
const nonRefundable = cancellationLine("non_refundable", stay.checkIn, "14:00", now);

function renderSummary({
  lines = [{ roomTypeId: "std", name: "Standard Double", quantity: 1, lineTotalRand: 4900 }],
  cancellation = free,
  guestName = undefined as string | undefined,
  action = null as ReactNode,
} = {}) {
  const roomCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  render(
    <BookingSummary
      hotelName="Harbourlight Retreat"
      stay={stay}
      party={{ adults: 2, children: 1, rooms: 1 }}
      lines={lines}
      roomCount={roomCount}
      totalRand={lines.reduce((sum, line) => sum + line.lineTotalRand, 0)}
      cancellation={cancellation}
      guestName={guestName}
      action={action}
    />,
  );
}

describe("BookingSummary", () => {
  it("shows the hotel, dates, party, lines, total and policy", () => {
    renderSummary();

    expect(screen.getByRole("heading", { name: "Harbourlight Retreat" })).toBeInTheDocument();
    expect(screen.getByText("Fri 13 – Sun 15 Nov 2026")).toBeInTheDocument();
    expect(screen.getByText("2 nights, 2 adults, 1 child")).toBeInTheDocument();
    expect(screen.getByText("1 room selected")).toBeInTheDocument();
    expect(screen.getByText("1 × Standard Double")).toBeInTheDocument();
    expect(screen.getAllByText(sp(formatZar(4900, { cents: true })))).toHaveLength(2);
    expect(screen.getByText("Includes taxes. No extra fees.")).toBeInTheDocument();
    expect(screen.getByText("Free cancellation")).toBeInTheDocument();
    expect(screen.getByText("until Wed 11 Nov 2026, 14:00")).toBeInTheDocument();
  });

  it("lists lines in the order given, each with its total", () => {
    renderSummary({
      lines: [
        { roomTypeId: "std", name: "Standard Double", quantity: 1, lineTotalRand: 11000 },
        { roomTypeId: "fam", name: "Family Room", quantity: 1, lineTotalRand: 13750 },
      ],
    });

    const items = screen.getAllByRole("listitem").map((item) => sp(item.textContent ?? ""));
    expect(items).toEqual([
      `1 × Standard Double${sp(formatZar(11000, { cents: true }))}`,
      `1 × Family Room${sp(formatZar(13750, { cents: true }))}`,
    ]);
    expect(screen.getByText("2 rooms selected")).toBeInTheDocument();
  });

  it("announces the total in a polite live region", () => {
    renderSummary();

    // A bare aria-live region has no role or name; it is found through its label.
    const total = screen.getByText("Total").parentElement;
    expect(total).toHaveAttribute("aria-live", "polite");
    expect(total).toHaveTextContent(sp(formatZar(4900, { cents: true })));
  });

  it("states a non-refundable policy", () => {
    renderSummary({ cancellation: nonRefundable });

    expect(screen.getByText("Non-refundable. This booking can't be cancelled.")).toBeInTheDocument();
    expect(screen.queryByText("Free cancellation")).toBeNull();
  });

  it("says when free cancellation ended, with no Mint badge", () => {
    renderSummary({ cancellation: ended });

    expect(
      screen.getByText("Free cancellation ended on Wed 11 Nov 2026, 14:00."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Free cancellation")).toBeNull();
  });

  it("names the guest once the Booking exists", () => {
    renderSummary({ guestName: "Thandi Nkosi" });

    expect(screen.getByText("Guest: Thandi Nkosi")).toBeInTheDocument();
  });

  it("holds the step's primary action, or none", () => {
    renderSummary({ action: <button type="button">Confirm booking</button> });
    expect(screen.getByRole("button", { name: "Confirm booking" })).toBeInTheDocument();
  });

  it("has no button without an action", () => {
    renderSummary();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
