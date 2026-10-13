import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { Popover } from "./popover";

function Harness() {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div ref={anchor}>
        <button ref={trigger} type="button" onClick={() => setOpen(true)}>
          Dates
        </button>
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          label="Dates"
          anchorRef={anchor}
          returnFocusRef={trigger}
        >
          <button type="button">Inside</button>
        </Popover>
      </div>
      <button type="button">Elsewhere</button>
    </>
  );
}

function openPopover() {
  fireEvent.click(screen.getByRole("button", { name: "Dates" }));
  return screen.getByRole("dialog", { name: "Dates" });
}

describe("Popover", () => {
  it("opens as a non-modal dialog named by its field, with focus inside", () => {
    render(<Harness />);
    const popover = openPopover();

    expect(popover).not.toHaveAttribute("aria-modal");
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<Harness />);
    openPopover();

    fireEvent.keyDown(screen.getByRole("button", { name: "Inside" }), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dates" })).toHaveFocus();
  });

  it("closes on a press outside its field", () => {
    render(<Harness />);
    openPopover();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dates" })).toHaveFocus();
  });

  it("closes without taking focus back when focus moves outside its field", () => {
    render(<Harness />);
    openPopover();
    const elsewhere = screen.getByRole("button", { name: "Elsewhere" });

    act(() => elsewhere.focus());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(elsewhere).toHaveFocus();
  });

  it("stays open while focus moves inside its field", () => {
    render(<Harness />);
    openPopover();

    act(() => screen.getByRole("button", { name: "Dates" }).focus());

    expect(screen.getByRole("dialog", { name: "Dates" })).toBeInTheDocument();
  });

  it("stays open on a press inside", () => {
    render(<Harness />);
    openPopover();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Inside" }));

    expect(screen.getByRole("dialog", { name: "Dates" })).toBeInTheDocument();
  });
});
