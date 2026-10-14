import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CopyFallbackDialog } from "./copy-fallback-dialog";

const LINK = "http://localhost:3000/hotels/hotel-001?adults=2&children=0&rooms=1";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Share
      </button>
      <CopyFallbackDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Copy this link"
        body="Your browser blocked copying. Select the link and copy it."
        label="Hotel page link"
        value={LINK}
      />
    </>
  );
}

function openDialog() {
  const trigger = screen.getByRole("button", { name: "Share" });
  trigger.focus();
  fireEvent.click(trigger);
  return trigger;
}

describe("CopyFallbackDialog", () => {
  it("shows the title, body and the text selected in a read-only field", () => {
    render(<Harness />);
    openDialog();

    expect(screen.getByRole("dialog", { name: "Copy this link" })).toBeInTheDocument();
    expect(
      screen.getByText("Your browser blocked copying. Select the link and copy it."),
    ).toBeInTheDocument();
    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Hotel page link" });
    expect(field).toHaveValue(LINK);
    expect(field).toHaveAttribute("readonly");
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(LINK.length);
  });

  it("starts focus on Close", () => {
    render(<Harness />);
    openDialog();

    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("closes on Close and returns focus to the trigger", () => {
    render(<Harness />);
    const trigger = openDialog();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<Harness />);
    const trigger = openDialog();

    fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
