import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stay } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { DateRangeField } from "./date-range-field";

const today = "2026-11-10";

function Harness({
  initial = null,
  onChange = () => {},
}: {
  initial?: Stay | null;
  onChange?: (stay: Stay) => void;
}) {
  const [stay, setStay] = useState<Stay | null>(initial);
  return (
    <>
      <DateRangeField
        today={today}
        value={stay}
        onChange={(next) => {
          setStay(next);
          onChange(next);
        }}
      />
      <button type="button">Elsewhere</button>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: /^Dates/ });
const day = (name: string) => screen.getByRole("button", { name });
// The phone sheet renders 12 months; scoping to one keeps queries fast.
const novemberDay = (name: string) =>
  within(screen.getByRole("grid", { name: "November 2026" })).getByRole("button", { name });

function press(key: string) {
  fireEvent.keyDown(document.activeElement as HTMLElement, { key });
}

describe("DateRangeField on desktop", () => {
  beforeEach(() => {
    setViewportWidth(1280);
  });

  it("shows the label and value on a trigger that announces its popover", () => {
    render(<Harness initial={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }} />);

    const button = screen.getByRole("button", { name: "Dates Fri 13 – Sun 15 Nov 2026" });
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("picks a range by click and emits it on Done", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    expect(trigger()).toHaveAccessibleName("Dates Add dates");

    fireEvent.click(trigger());
    const popover = screen.getByRole("dialog", { name: "Dates" });
    expect(popover).not.toHaveAttribute("aria-modal");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", popover.id);

    fireEvent.click(day("Friday 13 November 2026"));
    fireEvent.click(day("Sunday 15 November 2026"));
    expect(screen.getByText("2 nights · Fri 13 Nov – Sun 15 Nov")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      checkIn: "2026-11-13",
      checkOut: "2026-11-15",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Dates Fri 13 – Sun 15 Nov 2026");
    expect(trigger()).toHaveFocus();
  });

  it("picks a range by keyboard and keeps it on Escape", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    trigger().focus();

    press("ArrowDown");
    expect(day("Tuesday 10 November 2026, today")).toHaveFocus();
    press("ArrowRight");
    press("ArrowRight");
    press("ArrowRight");
    press("Enter");
    press("ArrowRight");
    press("ArrowRight");
    press("Enter");
    press("Escape");

    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      checkIn: "2026-11-13",
      checkOut: "2026-11-15",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("keeps a complete range on an outside press", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.click(day("Friday 13 November 2026"));
    fireEvent.click(day("Sunday 15 November 2026"));

    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("discards a check-in-only range on an outside press", () => {
    const onChange = vi.fn();
    render(
      <Harness initial={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }} onChange={onChange} />,
    );
    fireEvent.click(trigger());
    fireEvent.click(day("Friday 20 November 2026"));

    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Dates Fri 13 – Sun 15 Nov 2026");
  });

  it("keeps a complete range and closes when focus moves to another control", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(trigger());
    fireEvent.click(day("Friday 13 November 2026"));
    fireEvent.click(day("Sunday 15 November 2026"));
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });

    act(() => elsewhere.focus());

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it("discards a check-in-only range and keeps the previous Stay", () => {
    const onChange = vi.fn();
    render(
      <Harness initial={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }} onChange={onChange} />,
    );
    fireEvent.click(trigger());
    fireEvent.click(day("Friday 20 November 2026"));
    expect(day("Friday 20 November 2026, check-in")).toBeInTheDocument();

    press("Escape");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName("Dates Fri 13 – Sun 15 Nov 2026");

    fireEvent.click(trigger());
    expect(day("Friday 13 November 2026, check-in")).toBeInTheDocument();
    expect(day("Sunday 15 November 2026, check-out")).toBeInTheDocument();
  });

  it("does not emit when the Stay is unchanged", () => {
    const onChange = vi.fn();
    render(
      <Harness initial={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }} onChange={onChange} />,
    );
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("can be opened and closed by its parent", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <DateRangeField
        today={today}
        value={null}
        onChange={() => {}}
        open
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Dates" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <DateRangeField
        today={today}
        value={null}
        onChange={() => {}}
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("DateRangeField on phone", () => {
  beforeEach(() => {
    setViewportWidth(375);
  });

  it("opens a modal sheet with a title, Close and Done", () => {
    render(<Harness />);
    fireEvent.click(trigger());

    const sheet = screen.getByRole("dialog", { name: "Select dates" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getAllByRole("grid")).toHaveLength(12);
    expect(novemberDay("Tuesday 10 November 2026, today")).toHaveFocus();
  });

  it("emits a complete range on Done and discards a partial one on Close", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(trigger());
    fireEvent.click(novemberDay("Friday 13 November 2026"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();

    fireEvent.click(trigger());
    fireEvent.click(novemberDay("Friday 13 November 2026"));
    fireEvent.click(novemberDay("Sunday 15 November 2026"));
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      checkIn: "2026-11-13",
      checkOut: "2026-11-15",
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
