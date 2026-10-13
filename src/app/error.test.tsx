import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ErrorPage from "./error";

afterEach(() => {
  vi.restoreAllMocks();
});

it("shows the server error message and logs the error", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = new Error("boom");

  render(<ErrorPage error={error} retry={() => {}} />);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Something went wrong on our side. Try again.",
  );
  expect(log).toHaveBeenCalledWith(error);
});

it("retries when Try again is pressed", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const retry = vi.fn();

  render(<ErrorPage error={new Error("boom")} retry={retry} />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(retry).toHaveBeenCalledOnce();
});
