import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatZar } from "@/lib/format";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");
import { MobileSummaryBar } from "./mobile-summary-bar";

function renderBar(roomCount: number, totalRand: number, block = null as null | { kind: "empty"; message: string }) {
  const onReserve = vi.fn();
  render(
    <MobileSummaryBar
      roomCount={roomCount}
      totalRand={totalRand}
      reserve={{ block, onReserve, error: null }}
      summary={<p>Full summary content</p>}
    />,
  );
  return onReserve;
}

describe("MobileSummaryBar", () => {
  it("shows the rooms, the total and Reserve", () => {
    renderBar(1, 4900);

    const bar = screen.getByRole("region", { name: "Booking summary" });
    expect(within(bar).getByText(`1 room · ${sp(formatZar(4900, { cents: true }))}`)).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Reserve" })).toBeInTheDocument();
  });

  it("still shows 0 rooms with nothing selected, with the reason above Reserve", () => {
    renderBar(0, 0, { kind: "empty", message: "Select at least one room." });

    const bar = screen.getByRole("region", { name: "Booking summary" });
    expect(within(bar).getByText(`0 rooms · ${sp(formatZar(0, { cents: true }))}`)).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Reserve" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(bar).getByText("Select at least one room.")).toBeInTheDocument();
  });

  it("names its trigger and opens the full summary as a sheet", () => {
    renderBar(2, 9800);

    const trigger = screen.getByRole("button", { name: /^2 rooms, 9\s800 rand\. Show full summary$/ });
    fireEvent.click(trigger);

    const sheet = screen.getByRole("dialog", { name: "Booking summary" });
    expect(within(sheet).getByText("Full summary content")).toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tells the toast to sit above it while it is shown", () => {
    const { unmount } = render(
      <MobileSummaryBar
        roomCount={0}
        totalRand={0}
        reserve={{ block: null, onReserve: vi.fn(), error: null }}
        summary={null}
      />,
    );
    expect(document.body.style.getPropertyValue("--toast-offset")).toBe("7rem");
    unmount();
    expect(document.body.style.getPropertyValue("--toast-offset")).toBe("");
  });
});
