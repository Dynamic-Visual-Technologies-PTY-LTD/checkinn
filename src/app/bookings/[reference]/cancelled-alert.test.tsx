import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { CancelledAlert } from "./cancelled-alert";

beforeEach(() => {
  window.history.replaceState(null, "", "/bookings/CI-7K3P9Q?notice=cancelled");
});

describe("CancelledAlert", () => {
  it("shows, takes focus and takes the notice out of the address bar", () => {
    render(<CancelledAlert />);

    expect(screen.getByRole("group", { name: "Your booking is cancelled." })).toHaveFocus();
    expect(window.location.search).toBe("");
  });

  it("stays shown when StrictMode runs its effect twice (npm run dev)", () => {
    render(
      <StrictMode>
        <CancelledAlert />
      </StrictMode>,
    );

    expect(screen.getByRole("group", { name: "Your booking is cancelled." })).toHaveFocus();
    expect(window.location.search).toBe("");
  });

  it("hides on a page restored without the notice", () => {
    window.history.replaceState(null, "", "/bookings/CI-7K3P9Q");
    render(<CancelledAlert />);

    expect(screen.queryByText("Your booking is cancelled.")).toBeNull();
  });
});
