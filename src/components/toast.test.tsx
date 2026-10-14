import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOAST_DURATION_MS, Toast, useToast } from "./toast";

function Harness() {
  const { toast, show, dismiss } = useToast();
  return (
    <>
      <button type="button" onClick={() => show("Link copied")}>
        Share
      </button>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function showToast() {
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  return screen.getByText("Link copied");
}

describe("Toast", () => {
  it("keeps an empty status region in the page", () => {
    render(<Harness />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("shows the message in the status region for 5 seconds", () => {
    render(<Harness />);
    showToast();

    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("stays while hovered, then gets 5 more seconds", () => {
    render(<Harness />);
    const panel = showToast();

    fireEvent.mouseEnter(panel);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS * 3));
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");

    fireEvent.mouseLeave(panel);
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("restarts the timer when shown again", () => {
    render(<Harness />);
    showToast();
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1000));

    showToast();
    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS - 1));
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });
});
