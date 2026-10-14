import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReserveBlock } from "@/domain/selection";
import { ReserveButton } from "./reserve-button";

function renderReserve({
  block = null as ReserveBlock | null,
  error = null as string | null,
} = {}) {
  const onReserve = vi.fn();
  render(<ReserveButton block={block} onReserve={onReserve} error={error} />);
  return onReserve;
}

describe("ReserveButton", () => {
  it("calls onReserve when Reserve is enabled", () => {
    const onReserve = renderReserve();

    const reserve = screen.getByRole("button", { name: "Reserve" });
    expect(reserve).not.toHaveAttribute("aria-disabled");
    fireEvent.click(reserve);
    expect(onReserve).toHaveBeenCalledTimes(1);
  });

  it("keeps a blocked Reserve focusable, described by its reason, and inert", () => {
    const onReserve = renderReserve({
      block: { kind: "empty", message: "Select at least one room." },
    });

    const reserve = screen.getByRole("button", { name: "Reserve" });
    expect(reserve).toHaveAttribute("aria-disabled", "true");
    expect(reserve).toHaveAccessibleDescription("Select at least one room.");
    reserve.focus();
    expect(reserve).toHaveFocus();
    fireEvent.click(reserve);
    expect(onReserve).not.toHaveBeenCalled();
  });

  it("shows the party-fit reason", () => {
    renderReserve({
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
    renderReserve({ error: "Pick rooms from this hotel." });

    expect(screen.getByText("Pick rooms from this hotel.")).toBeInTheDocument();
  });
});
