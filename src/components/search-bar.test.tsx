import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Party, Stay } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { SearchBar } from "./search-bar";
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
}: { stay?: Stay | null; party?: Party; getToday?: () => string } = {}) {
  return render(
    <SearchStateProvider initialStay={stay} initialParty={party}>
      <SearchBar today={today} getToday={getToday} />
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
