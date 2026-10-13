import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./dialog";

function Harness({ variant }: { variant?: "dialog" | "sheet" }) {
  const [open, setOpen] = useState(false);
  const safest = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel booking"
        variant={variant}
        initialFocusRef={safest}
      >
        <p>This can&apos;t be undone.</p>
        <a href="#terms">Terms</a>
        <button ref={safest} type="button" onClick={() => setOpen(false)}>
          Keep booking
        </button>
      </Dialog>
    </>
  );
}

function openDialog() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a titled modal with focus on the chosen element", () => {
    render(<Harness />);
    openDialog();

    const dialog = screen.getByRole("dialog", { name: "Cancel booking" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Cancel booking" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep booking" })).toHaveFocus();
  });

  it("keeps Tab inside the dialog", () => {
    render(<Harness />);
    openDialog();
    const first = screen.getByRole("link", { name: "Terms" });
    const last = screen.getByRole("button", { name: "Keep booking" });

    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("makes the rest of the page inert while open", () => {
    const { container } = render(<Harness />);
    openDialog();
    expect(container).toHaveAttribute("inert");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(container).not.toHaveAttribute("inert");
  });

  it("pulls focus back if it lands outside", () => {
    render(<Harness />);
    const opener = openDialog();
    opener.focus();
    expect(opener).not.toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<Harness />);
    const opener = openDialog();

    fireEvent.keyDown(screen.getByRole("button", { name: "Keep booking" }), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("dims the page behind a dialog", () => {
    render(<Harness />);
    openDialog();
    expect(screen.getByRole("dialog").parentElement).toHaveClass("bg-neutral/70");
  });

  it("gives a sheet a Close button", () => {
    render(<Harness variant="sheet" />);
    const opener = openDialog();

    expect(screen.getByRole("dialog", { name: "Cancel booking" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Share">
        <button type="button">Copy</button>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Copy" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Copy" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
