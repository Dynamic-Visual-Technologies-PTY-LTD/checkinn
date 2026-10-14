import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatZar } from "@/lib/format";
import { MobileSummaryBar } from "./mobile-summary-bar";

/** Intl separates digit groups with non-breaking spaces; text matchers see plain spaces. */
const sp = (text: string) => text.replace(/\s/g, " ");

function renderBar(roomCount: number, totalRand: number, label = "Reserve") {
  render(
    <MobileSummaryBar
      roomCount={roomCount}
      totalRand={totalRand}
      action={<button type="button">{label}</button>}
      summary={<p>Full summary content</p>}
    />,
  );
}

describe("MobileSummaryBar", () => {
  it("shows the rooms, the total and the step's action", () => {
    renderBar(1, 4900);

    const bar = screen.getByRole("region", { name: "Booking summary" });
    expect(within(bar).getByText(`1 room · ${sp(formatZar(4900, { cents: true }))}`)).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Reserve" })).toBeInTheDocument();
  });

  it("takes any action, such as Confirm booking", () => {
    renderBar(2, 24750, "Confirm booking");

    const bar = screen.getByRole("region", { name: "Booking summary" });
    expect(within(bar).getByText(`2 rooms · ${sp(formatZar(24750, { cents: true }))}`)).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Confirm booking" })).toBeInTheDocument();
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
      <MobileSummaryBar roomCount={0} totalRand={0} action={null} summary={null} />,
    );
    expect(document.body.style.getPropertyValue("--toast-offset")).toBe("7rem");
    unmount();
    expect(document.body.style.getPropertyValue("--toast-offset")).toBe("");
  });
});
