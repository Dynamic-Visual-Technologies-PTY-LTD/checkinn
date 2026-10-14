import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BookingSteps } from "./booking-steps";

describe("BookingSteps", () => {
  it("lists the three steps in order", () => {
    render(<BookingSteps current={1} />);

    const steps = within(screen.getByRole("list", { name: "Booking steps" }));
    expect(steps.getAllByRole("listitem").map((step) => step.textContent)).toEqual([
      "1 Your selection",
      "2 Your details",
      "3 Confirmation",
    ]);
  });

  it.each([1, 2, 3] as const)("marks step %i, and only it, as the current step", (current) => {
    render(<BookingSteps current={current} />);

    const steps = screen.getAllByRole("listitem");
    steps.forEach((step, index) => {
      if (index + 1 === current) expect(step).toHaveAttribute("aria-current", "step");
      else expect(step).not.toHaveAttribute("aria-current");
    });
  });
});
