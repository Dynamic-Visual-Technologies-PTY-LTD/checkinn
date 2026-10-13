import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import NotFound, { metadata } from "./not-found";

it("says the page can't be found", () => {
  render(<NotFound />);
  expect(
    screen.getByRole("heading", { level: 1, name: "We can't find that page." }),
  ).toBeInTheDocument();
});

it("offers a way back to Home and to search", () => {
  render(<NotFound />);
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "Back to search" })).toHaveAttribute(
    "href",
    "/search",
  );
});

it("has an absolute page title", () => {
  expect(metadata.title).toEqual({ absolute: "Page not found · CheckInn" });
});
