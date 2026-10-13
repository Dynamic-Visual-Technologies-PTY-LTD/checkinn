import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { SiteHeader } from "./site-header";

it("renders a banner with navigation", () => {
  render(<SiteHeader />);
  const banner = screen.getByRole("banner");
  expect(within(banner).getByRole("navigation")).toBeInTheDocument();
});

it("links the logo home with the name CheckInn home", () => {
  render(<SiteHeader />);
  expect(screen.getByRole("link", { name: "CheckInn home" })).toHaveAttribute(
    "href",
    "/",
  );
});

it("keeps the logo images decorative", () => {
  render(<SiteHeader />);
  expect(screen.queryAllByRole("img")).toHaveLength(0);
});

it("links to Manage booking", () => {
  render(<SiteHeader />);
  expect(screen.getByRole("link", { name: "Manage booking" })).toHaveAttribute(
    "href",
    "/manage",
  );
});
