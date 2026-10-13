import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// The tiles read the database at request time. Here they stay loading, so
// these tests cover the hero and the section around the Suspense boundary.
vi.mock("@/features/search/queries", () => ({
  getCityTiles: () => new Promise(() => {}),
}));

describe("Home", () => {
  it("renders the Find your stay heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Find your stay." }),
    ).toBeInTheDocument();
  });

  it("leaves the main landmark to the layout", () => {
    render(<Home />);
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
  });

  it("tells the guest what CheckInn offers", () => {
    render(<Home />);
    expect(
      screen.getByText(
        "Twelve hotels in six South African cities. Pick your dates and book in a few steps.",
      ),
    ).toBeInTheDocument();
  });

  it("has an Explore a city section that shows a skeleton while loading", () => {
    render(<Home />);
    const section = screen.getByRole("region", { name: "Explore a city" });
    expect(
      screen.getByRole("heading", { level: 2, name: "Explore a city" }),
    ).toBeInTheDocument();
    expect(section.querySelector('[aria-hidden="true"]')?.children).toHaveLength(
      6,
    );
  });
});
