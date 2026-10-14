import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { cancellationLine } from "@/domain/cancellation";
import { formatZar } from "@/lib/format";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");
import { BookingSummary } from "./booking-summary";

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
  block = null as { kind: "empty" | "capacity"; message: string } | null,
  cancellation = free,
  reserve = true,
  onReserve = vi.fn(),
  error = null as string | null,
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
      reserve={reserve ? { block, onReserve, error } : null}
    />,
  );
  return onReserve;
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

  it("announces the total in a polite live region", () => {
    renderSummary();

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

  it("calls onReserve when Reserve is enabled", () => {
    const onReserve = renderSummary();

    const reserve = screen.getByRole("button", { name: "Reserve" });
    expect(reserve).not.toHaveAttribute("aria-disabled");
    fireEvent.click(reserve);
    expect(onReserve).toHaveBeenCalledTimes(1);
  });

  it("keeps a blocked Reserve focusable, described by its reason, and inert", () => {
    const onReserve = renderSummary({
      lines: [],
      block: { kind: "empty", message: "Select at least one room." },
    });

    const reserve = screen.getByRole("button", { name: "Reserve" });
    expect(reserve).toHaveAttribute("aria-disabled", "true");
    expect(reserve).toHaveAccessibleDescription("Select at least one room.");
    reserve.focus();
    expect(reserve).toHaveFocus();
    fireEvent.click(reserve);
    expect(onReserve).not.toHaveBeenCalled();
    expect(screen.getByText("0 rooms selected")).toBeInTheDocument();
  });

  it("shows the party-fit reason", () => {
    renderSummary({
      block: {
        kind: "capacity",
        message: "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
      },
    });

    expect(screen.getByRole("button", { name: "Reserve" })).toHaveAccessibleDescription(
      "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.",
    );
  });

  it("shows a failure message from the server action", () => {
    renderSummary({ error: "Pick rooms from this hotel." });

    expect(screen.getByText("Pick rooms from this hotel.")).toBeInTheDocument();
  });

  it("has no Reserve when every Room type is sold out", () => {
    renderSummary({ reserve: false });

    expect(screen.queryByRole("button", { name: "Reserve" })).toBeNull();
  });
});
