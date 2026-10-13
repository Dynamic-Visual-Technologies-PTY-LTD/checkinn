import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AvailabilityAlert } from "./availability-alert";

it("shows the message and takes focus once on mount", () => {
  render(
    <AvailabilityAlert message="Sorry, the last Standard Double was just booked. Pick another room." />,
  );

  const alert = screen.getByRole("group", { name: "Room no longer available" });
  expect(alert).toHaveTextContent(
    "Sorry, the last Standard Double was just booked. Pick another room.",
  );
  expect(alert).toHaveFocus();
});
