import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { availabilityHeadingId } from "@/domain/hotel";
import { HotelActions, SAVED_KEY, parseSaved } from "./hotel-actions";

const SHARE_PATH = "/hotels/hotel-001?q=Cape+Town&checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1";
const SHARE_URL = `${window.location.origin}${SHARE_PATH}`;

function renderActions() {
  return render(
    <>
      <HotelActions hotelId="hotel-001" hotelName="Harbourlight Retreat" sharePath={SHARE_PATH} />
      <section>
        <h2 id={availabilityHeadingId("hotel-001")} tabIndex={-1}>
          Availability
        </h2>
      </section>
    </>,
  );
}

function stubClipboard(clipboard: unknown) {
  vi.stubGlobal("navigator", { ...navigator, clipboard });
}

beforeEach(() => {
  window.localStorage.clear();
});

const originalScrollIntoView = Element.prototype.scrollIntoView;

afterEach(() => {
  window.localStorage.clear();
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe("parseSaved", () => {
  it("reads a JSON array of ids", () => {
    expect(parseSaved('["hotel-001","hotel-002"]')).toEqual(["hotel-001", "hotel-002"]);
  });

  it("reads anything unreadable as empty", () => {
    expect(parseSaved(null)).toEqual([]);
    expect(parseSaved("{not json")).toEqual([]);
    expect(parseSaved('{"hotel-001":true}')).toEqual([]);
    expect(parseSaved('["hotel-001",3]')).toEqual(["hotel-001"]);
  });
});

describe("Save", () => {
  it("toggles aria-pressed and stores the id in this browser", () => {
    renderActions();
    const save = screen.getByRole("button", { name: "Save Harbourlight Retreat" });
    expect(save).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(save);
    expect(save).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null")).toEqual(["hotel-001"]);

    fireEvent.click(save);
    expect(save).toHaveAttribute("aria-pressed", "false");
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null")).toEqual([]);
  });

  it("starts saved when the id is already stored, keeping other ids", () => {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(["hotel-002", "hotel-001"]));
    renderActions();
    const save = screen.getByRole("button", { name: "Save Harbourlight Retreat" });
    expect(save).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(save);
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null")).toEqual(["hotel-002"]);
  });

  it("treats a corrupt stored value as nothing saved", () => {
    window.localStorage.setItem(SAVED_KEY, "{oops");
    renderActions();
    const save = screen.getByRole("button", { name: "Save Harbourlight Retreat" });
    expect(save).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(save);
    expect(save).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "null")).toEqual(["hotel-001"]);
  });

  it("shows no toast", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Save Harbourlight Retreat" }));

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("Share", () => {
  it("copies the absolute Hotel page URL and shows the toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    renderActions();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the fallback dialog with the URL selected when copying is blocked", async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });
    renderActions();
    const share = screen.getByRole("button", { name: "Share" });
    share.focus();

    await act(async () => {
      fireEvent.click(share);
    });

    expect(screen.getByRole("dialog", { name: "Copy this link" })).toBeInTheDocument();
    expect(
      screen.getByText("Your browser blocked copying. Select the link and copy it."),
    ).toBeInTheDocument();
    const field = screen.getByRole<HTMLInputElement>("textbox", { name: "Hotel page link" });
    expect(field).toHaveValue(SHARE_URL);
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe(SHARE_URL.length);
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    fireEvent.keyDown(screen.getByRole("button", { name: "Close" }), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(share).toHaveFocus();
  });

  it("opens the fallback dialog when there is no Clipboard API", async () => {
    stubClipboard(undefined);
    renderActions();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Share" }));
    });

    expect(screen.getByRole("dialog", { name: "Copy this link" })).toBeInTheDocument();
  });
});

describe("We Price Match", () => {
  it("opens the price-match dialog with focus on Close", () => {
    renderActions();
    const chip = screen.getByRole("button", { name: "We Price Match" });
    chip.focus();
    fireEvent.click(chip);

    expect(screen.getByRole("dialog", { name: "We Price Match" })).toBeInTheDocument();
    expect(
      screen.getByText("CheckInn is a demo, so no price matching happens. Prices shown are fictional."),
    ).toBeInTheDocument();
    const close = screen.getByRole("button", { name: "Close" });
    expect(close).toHaveFocus();

    fireEvent.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });
});

describe("See rooms", () => {
  it("scrolls to the Availability section and focuses its heading", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "See rooms" }));

    expect(screen.getByRole("heading", { name: "Availability" })).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("scrolls instantly under reduced motion", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      media: query,
    }));
    renderActions();

    fireEvent.click(screen.getByRole("button", { name: "See rooms" }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "instant", block: "start" });
  });
});
