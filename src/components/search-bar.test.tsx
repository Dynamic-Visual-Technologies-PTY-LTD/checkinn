import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Party, Stay } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { SearchBar, searchSummary } from "./search-bar";
import { SearchStateProvider } from "./search-state";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const today = "2026-11-10";
const tomorrow: Stay = { checkIn: "2026-11-11", checkOut: "2026-11-12" };
const defaultParty: Party = { adults: 2, children: 0, rooms: 1 };

function renderBar({
  stay = tomorrow,
  party = defaultParty,
  getToday = () => today,
  ...props
}: {
  stay?: Stay | null;
  party?: Party;
  getToday?: () => string;
  initialQuery?: string;
  collapsible?: boolean;
  datesError?: string;
} = {}) {
  return render(
    <SearchStateProvider initialStay={stay} initialParty={party}>
      <SearchBar today={today} getToday={getToday} {...props} />
    </SearchStateProvider>,
  );
}

const destination = () => screen.getByRole("textbox", { name: "Destination" });
const datesTrigger = () => screen.getByRole("button", { name: /^Dates/ });
const occupancyTrigger = () => screen.getByRole("button", { name: /^Occupancy/ });
const search = () => screen.getByRole("button", { name: "Search" });

beforeEach(() => {
  push.mockReset();
  setViewportWidth(1280);
});

describe("SearchBar", () => {
  it("is a search landmark with three labelled fields and Search", () => {
    renderBar();

    expect(screen.getByRole("search", { name: "Search hotels" })).toBeInTheDocument();
    expect(destination()).toHaveAttribute("placeholder", "Where are you going?");
    expect(destination()).toHaveValue("");
    expect(datesTrigger()).toHaveAccessibleName("Dates Wed 11 – Thu 12 Nov 2026");
    expect(occupancyTrigger()).toHaveAccessibleName(
      "Occupancy 2 adults · 0 children · 1 room",
    );
    expect(search()).toHaveAttribute("type", "submit");
  });

  it("pushes the /search URL with every criterion", () => {
    renderBar();

    fireEvent.change(destination(), { target: { value: "Cape Town" } });
    fireEvent.click(search());

    expect(push).toHaveBeenCalledWith(
      "/search?q=Cape+Town&checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=0&rooms=1",
    );
  });

  it("searches anyway with an empty Destination", () => {
    renderBar();

    fireEvent.change(destination(), { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("search"));

    expect(push).toHaveBeenCalledWith(
      "/search?checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=0&rooms=1",
    );
  });

  it("searches with the Party picked in the occupancy picker", () => {
    renderBar();

    fireEvent.click(occupancyTrigger());
    fireEvent.click(screen.getByRole("button", { name: "Increase children" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.click(search());

    expect(push).toHaveBeenCalledWith(
      "/search?checkIn=2026-11-11&checkOut=2026-11-12&adults=2&children=1&rooms=1",
    );
  });

  it("clears the Destination and keeps focus in it", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: "Clear destination" })).toBeNull();

    fireEvent.change(destination(), { target: { value: "Durban" } });
    const clear = screen.getByRole("button", { name: "Clear destination" });
    clear.focus();
    fireEvent.click(clear);

    expect(destination()).toHaveValue("");
    expect(destination()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear destination" })).toBeNull();
  });

  it("blocks a Stay that is now in the past and focuses Dates", () => {
    // The page was rendered on the 10th; the guest searches on the 12th.
    renderBar({ getToday: () => "2026-11-12" });

    fireEvent.change(destination(), { target: { value: "Cape Town" } });
    fireEvent.click(search());

    expect(push).not.toHaveBeenCalled();
    expect(datesTrigger()).toHaveFocus();
    expect(datesTrigger()).toHaveAccessibleDescription("Check-in can't be in the past.");
    expect(screen.getByText("Check-in can't be in the past.")).toHaveClass("text-error");
    // The field around the trigger takes the 1px Coral border (DESIGN.md Input).
    // That wrapper has no role or name, so it is reached from the trigger.
    const field = datesTrigger().parentElement?.parentElement;
    expect(field).toHaveClass("border", "border-error");
  });

  it("asks for dates when the Stay is missing", () => {
    renderBar({ stay: null });

    fireEvent.click(search());

    expect(push).not.toHaveBeenCalled();
    expect(datesTrigger()).toHaveFocus();
    expect(datesTrigger()).toHaveAccessibleDescription(
      "Those dates have passed. Pick new ones.",
    );
  });

  it("clears the date error once new dates are picked", () => {
    renderBar({ getToday: () => "2026-11-12" });
    fireEvent.click(search());
    expect(datesTrigger()).toHaveAccessibleDescription("Check-in can't be in the past.");

    fireEvent.click(datesTrigger());
    const november = within(screen.getByRole("grid", { name: "November 2026" }));
    fireEvent.click(november.getByRole("button", { name: /^Friday 13 November 2026/ }));
    fireEvent.click(november.getByRole("button", { name: /^Sunday 15 November 2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(datesTrigger()).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Check-in can't be in the past.")).toBeNull();
  });

  it("keeps only one picker open at a time", () => {
    renderBar();

    fireEvent.click(datesTrigger());
    expect(screen.getByRole("dialog", { name: "Dates" })).toBeInTheDocument();

    // An outside press closes Dates first, then the click opens Occupancy.
    fireEvent.pointerDown(occupancyTrigger());
    fireEvent.click(occupancyTrigger());

    expect(screen.queryByRole("dialog", { name: "Dates" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Occupancy" })).toBeInTheDocument();
    expect(datesTrigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("needs a SearchStateProvider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<SearchBar today={today} />)).toThrow(/SearchStateProvider/);
    quiet.mockRestore();
  });
});

describe("SearchBar with criteria from the URL", () => {
  it("starts from the URL's Destination", () => {
    renderBar({ initialQuery: "Cape Town" });

    expect(destination()).toHaveValue("Cape Town");
  });

  it("shows a stale-link message under Dates from the start", () => {
    renderBar({ stay: null, datesError: "Those dates have passed. Pick new ones." });

    expect(datesTrigger()).toHaveAccessibleName("Dates Add dates");
    expect(datesTrigger()).toHaveAccessibleDescription(
      "Those dates have passed. Pick new ones.",
    );
    expect(screen.getByText("Those dates have passed. Pick new ones.")).toHaveClass(
      "text-error",
    );
    // Not after an action, so focus stays where it is.
    expect(datesTrigger()).not.toHaveFocus();
  });
});

describe("collapsible SearchBar", () => {
  const capeTownWeekend: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };

  it("starts as a phone-only summary button over a bar shown from 768px", () => {
    renderBar({ collapsible: true, initialQuery: "Cape Town", stay: capeTownWeekend });

    const summary = screen.getByRole("button", {
      name: "Change search: Cape Town · 13–15 Nov · 2 adults",
    });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary).toHaveClass("md:hidden");
    const bar = screen.getByRole("search", { name: "Search hotels" });
    expect(summary).toHaveAttribute("aria-controls", bar.id);
    // The wrapper that hides the bar on phones has no role or name.
    expect(bar.parentElement).toHaveClass("hidden", "md:block");
  });

  it("expands to the full bar on tap and moves focus to Destination", () => {
    renderBar({ collapsible: true, initialQuery: "Cape Town", stay: capeTownWeekend });

    fireEvent.click(screen.getByRole("button", { name: /^Change search/ }));

    expect(screen.queryByRole("button", { name: /^Change search/ })).toBeNull();
    // The wrapper that hides the bar on phones has no role or name.
    expect(screen.getByRole("search").parentElement).not.toHaveClass("hidden");
    expect(destination()).toHaveFocus();
    expect(destination()).toHaveValue("Cape Town");
  });

  it("starts expanded when there is a date error to see", () => {
    renderBar({
      collapsible: true,
      stay: null,
      datesError: "Those dates have passed. Pick new ones.",
    });

    expect(screen.queryByRole("button", { name: /^Change search/ })).toBeNull();
  });
});

describe("searchSummary", () => {
  const weekend: Stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };

  it("reads Destination, dates and adults", () => {
    expect(searchSummary("Cape Town", weekend, defaultParty)).toBe(
      "Cape Town · 13–15 Nov · 2 adults",
    );
  });

  it("names an empty Destination, missing dates and any children", () => {
    expect(searchSummary(" ", null, { adults: 1, children: 2, rooms: 1 })).toBe(
      "All destinations · Add dates · 1 adult, 2 children",
    );
  });
});
