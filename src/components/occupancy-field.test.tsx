import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Party } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { OccupancyField } from "./occupancy-field";

function Harness({
  initial = { adults: 2, children: 0, rooms: 1 },
  onChange = () => {},
}: {
  initial?: Party;
  onChange?: (party: Party) => void;
}) {
  const [party, setParty] = useState<Party>(initial);
  return (
    <>
      <OccupancyField
        value={party}
        onChange={(next) => {
          setParty(next);
          onChange(next);
        }}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: /^Occupancy/ });
const button = (name: string) => screen.getByRole("button", { name });

describe("OccupancyField on desktop", () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  it("shows the Party on a trigger that announces its popover", () => {
    render(<Harness />);
    expect(trigger()).toHaveAccessibleName("Occupancy 2 adults · 0 children · 1 room");
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("steps values, announces them and emits on Done", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(trigger());
    expect(screen.getByRole("dialog", { name: "Occupancy" })).not.toHaveAttribute("aria-modal");
    expect(screen.getByRole("group", { name: "Adults" })).toHaveTextContent("2");

    fireEvent.click(button("Increase adults"));
    expect(screen.getByRole("status")).toHaveTextContent("3 adults");
    fireEvent.click(button("Increase children"));
    expect(screen.getByRole("status")).toHaveTextContent("1 child");
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(button("Done"));

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ adults: 3, children: 1, rooms: 1 });
    expect(trigger()).toHaveAccessibleName("Occupancy 3 adults · 1 child · 1 room");
    expect(trigger()).toHaveFocus();
  });

  it("opens with Down arrow and keeps changes on Escape", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    expect(button("Decrease adults")).toHaveFocus();
    fireEvent.click(button("Increase rooms"));
    fireEvent.keyDown(button("Increase rooms"), { key: "Escape" });

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ adults: 2, children: 0, rooms: 2 });
    expect(trigger()).toHaveFocus();
  });

  it("stops adults at 10 and announces the limit, keeping focus", () => {
    render(<Harness initial={{ adults: 9, children: 0, rooms: 1 }} />);
    fireEvent.click(trigger());
    const plus = button("Increase adults");
    plus.focus();

    fireEvent.click(plus);
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 10 adults");
    expect(plus).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(plus);
    expect(screen.getByRole("group", { name: "Adults" })).toHaveTextContent("10");
    expect(plus).toHaveFocus();
    expect(plus).not.toBeDisabled();
  });

  it("stops children at 0 and rooms at the number of adults", () => {
    render(<Harness initial={{ adults: 2, children: 0, rooms: 2 }} />);
    fireEvent.click(trigger());

    const minus = button("Decrease children");
    expect(minus).toHaveAttribute("aria-disabled", "true");
    minus.focus();
    fireEvent.click(minus);
    expect(minus).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("Minimum 0 children");

    const rooms = button("Increase rooms");
    expect(rooms).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(rooms);
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 2 rooms");
    expect(screen.getByRole("group", { name: "Rooms" })).toHaveTextContent("2");
  });

  it("shows the changing Party on the trigger while open", () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.click(button("Increase adults"));

    expect(trigger()).toHaveAccessibleName("Occupancy 3 adults · 0 children · 1 room");
  });

  it("re-announces a limit on each press", () => {
    render(<Harness initial={{ adults: 10, children: 0, rooms: 1 }} />);
    fireEvent.click(trigger());
    const plus = button("Increase adults");
    const status = screen.getByRole("status");

    fireEvent.click(plus);
    const first = status.textContent;
    fireEvent.click(plus);

    expect(first).toContain("Maximum 10 adults");
    expect(status).toHaveTextContent("Maximum 10 adults");
    expect(status.textContent).not.toBe(first);
  });

  it("keeps focus on the rooms stepper at the adults limit", () => {
    render(<Harness initial={{ adults: 2, children: 0, rooms: 1 }} />);
    fireEvent.click(trigger());
    const plus = button("Increase rooms");
    plus.focus();

    fireEvent.click(plus);
    expect(plus).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(plus);

    expect(plus).toHaveFocus();
    expect(screen.getByRole("group", { name: "Rooms" })).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 2 rooms");
  });

  it("does not step past a limit from an out-of-range value", () => {
    render(<Harness initial={{ adults: 12, children: 0, rooms: 1 }} />);
    fireEvent.click(trigger());

    fireEvent.click(button("Increase adults"));

    expect(screen.getByRole("group", { name: "Adults" })).toHaveTextContent("12");
    expect(screen.getByRole("status")).toHaveTextContent("Maximum 10 adults");
  });

  it("lowers rooms when adults drop below them", () => {
    const onChange = vi.fn();
    render(<Harness initial={{ adults: 3, children: 0, rooms: 3 }} onChange={onChange} />);
    fireEvent.click(trigger());

    fireEvent.click(button("Decrease adults"));

    expect(screen.getByRole("group", { name: "Rooms" })).toHaveTextContent("2");
    expect(screen.getByRole("status")).toHaveTextContent("2 adults, 2 rooms");
    fireEvent.pointerDown(button("Elsewhere"));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ adults: 2, children: 0, rooms: 2 });
  });

  it("does not emit when the Party is unchanged", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.click(button("Increase adults"));
    fireEvent.click(button("Decrease adults"));
    fireEvent.click(button("Done"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("OccupancyField on phone", () => {
  beforeEach(() => {
    setViewportWidth(375);
  });

  it("opens a modal sheet with a title, Close and Done", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());

    expect(screen.getByRole("dialog", { name: "Select occupancy" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(button("Close")).toBeInTheDocument();
    fireEvent.click(button("Increase adults"));
    fireEvent.click(button("Done"));

    expect(onChange).toHaveBeenCalledExactlyOnceWith({ adults: 3, children: 0, rooms: 1 });
    expect(trigger()).toHaveFocus();
  });
});
