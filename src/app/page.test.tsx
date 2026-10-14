import { cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBarSkeleton } from "@/components/search-bar";
import Home from "./page";

// Today is read after `io()`, and the tiles read the database. Both stay
// loading here, so these tests cover the static shell. `home-search.test.tsx`
// covers what renders once they resolve.
const todayIn = vi.hoisted(() => vi.fn(() => "2026-11-10"));
vi.mock("next/cache", () => ({ io: () => new Promise(() => {}) }));
vi.mock("@/features/search/queries", () => ({ getCityTiles: () => new Promise(() => {}) }));
vi.mock("@/domain/clock", () => ({ todayIn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

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

  it("shows a search bar skeleton and reads no clock until io() resolves", () => {
    const skeleton = render(<SearchBarSkeleton />).container.innerHTML;
    cleanup();
    const { container } = render(<Home />);
    expect(skeleton).not.toBe("");
    expect(container.innerHTML).toContain(skeleton);
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(todayIn).not.toHaveBeenCalled();
  });
});
