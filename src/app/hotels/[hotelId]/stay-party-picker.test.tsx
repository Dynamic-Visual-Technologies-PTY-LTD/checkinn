import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DatesFieldProvider, StayPartyPicker, useDatesField } from "./stay-party-picker";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-15" };
const party = { adults: 2, children: 0, rooms: 1 };

function renderPicker(props: Partial<React.ComponentProps<typeof StayPartyPicker>> = {}) {
  return render(
    <StayPartyPicker
      hotelId="hotel-001"
      today="2026-11-10"
      q="Cape Town"
      stay={stay}
      party={party}
      {...props}
    />,
  );
}

beforeEach(() => {
  push.mockClear();
  window.history.replaceState(null, "", "/hotels/hotel-001?sel=hotel-001-standard:1");
});

describe("StayPartyPicker", () => {
  it("pre-fills Dates and Occupancy", () => {
    renderPicker();

    expect(screen.getByRole("button", { name: /Dates/ })).toHaveTextContent("Fri 13 – Sun 15 Nov 2026");
    expect(screen.getByRole("button", { name: /Occupancy/ })).toHaveTextContent(
      "2 adults · 0 children · 1 room",
    );
  });

  it("pushes a new URL, keeping the selection, when Occupancy closes changed", () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /Occupancy/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase adults" }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(push).toHaveBeenCalledTimes(1);
    const [url, options] = push.mock.calls[0];
    expect(url).toContain("/hotels/hotel-001?");
    expect(url).toContain("adults=3");
    expect(url).toContain("checkIn=2026-11-13");
    expect(url).toContain("sel=hotel-001-standard%3A1");
    expect(url).not.toContain("notice");
    expect(options).toEqual({ scroll: false });
  });

  it("pushes nothing when it closes unchanged", () => {
    renderPicker();

    fireEvent.click(screen.getByRole("button", { name: /Occupancy/ }));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(push).not.toHaveBeenCalled();
  });

  it("shows the stale-link message under Dates, tied to the field", () => {
    renderPicker({ stay: null, datesError: "Those dates have passed. Pick new ones." });

    expect(screen.getByRole("button", { name: /Dates/ })).toHaveAccessibleDescription(
      "Those dates have passed. Pick new ones.",
    );
    expect(screen.getByRole("button", { name: /Dates/ })).toHaveTextContent("Add dates");
  });

  it("reaches its own Dates field when an earlier copy is still in the document", () => {
    function Controls({ label }: { label: string }) {
      const dates = useDatesField();
      return (
        <>
          <button type="button" onClick={dates.focus}>
            Focus {label}
          </button>
          <button type="button" onClick={dates.open}>
            Open {label}
          </button>
        </>
      );
    }
    const copy = (label: string) => (
      <section aria-label={label}>
        <DatesFieldProvider>
          <StayPartyPicker hotelId="hotel-001" today="2026-11-10" q="" stay={stay} party={party} />
          <Controls label={label} />
        </DatesFieldProvider>
      </section>
    );
    render(
      <>
        {copy("old")}
        {copy("new")}
      </>,
    );
    const datesOf = (label: string) =>
      within(screen.getByRole("region", { name: label })).getByRole("button", { name: /Dates/ });

    fireEvent.click(screen.getByRole("button", { name: "Focus new" }));
    expect(datesOf("new")).toHaveFocus();
    expect(datesOf("old")).not.toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Open new" }));
    expect(datesOf("new")).toHaveAttribute("aria-expanded", "true");
    expect(datesOf("old")).toHaveAttribute("aria-expanded", "false");
  });
});
