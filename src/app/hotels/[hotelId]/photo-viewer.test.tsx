import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HotelPhotos } from "./photo-viewer";

const photos = [
  { url: "https://images.unsplash.com/photo-1?w=1200", alt: "Resort exterior and swimming pool" },
  { url: "https://images.unsplash.com/photo-2?w=1200", alt: "Hotel bedroom" },
];

function renderPhotos() {
  render(
    <HotelPhotos photos={photos} hotelName="Harbourlight Retreat" photoClassName="h-60 w-full" />,
  );
}

function openAt(name: string) {
  const button = screen.getByRole("button", { name });
  button.focus();
  fireEvent.click(button);
  return button;
}

function viewer() {
  return screen.getByRole("dialog", { name: "Harbourlight Retreat photos" });
}

/** The photo shown in the viewer and the live counter. */
function expectShowing(alt: string, position: string) {
  const dialog = within(viewer());
  expect(dialog.getByRole("img", { name: alt })).toBeInTheDocument();
  expect(dialog.getByText(`Photo ${position}`)).toHaveAttribute("aria-live", "polite");
  expect(dialog.getByText(position.replace(" of ", " / "))).toHaveAttribute("aria-hidden", "true");
}

function swipe(dx: number, dy = 0) {
  const area = within(viewer()).getByRole("img").parentElement as HTMLElement;
  fireEvent.touchStart(area, { touches: [{ clientX: 200, clientY: 300 }] });
  fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200 + dx, clientY: 300 + dy }] });
}

describe("HotelPhotos", () => {
  it("renders each photo as a button named by its seed alt text", () => {
    renderPhotos();
    const list = within(screen.getByRole("list", { name: "Photos" }));
    expect(list.getAllByRole("button")).toHaveLength(2);
    expect(list.getByRole("button", { name: "Hotel bedroom" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the viewer at the clicked photo", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");

    expectShowing("Resort exterior and swimming pool", "1 of 2");
    const image = within(viewer()).getByRole("img", { name: "Resort exterior and swimming pool" });
    expect(image).toHaveClass("object-contain");
  });

  it("opens at the second photo", () => {
    renderPhotos();
    // A native button, so Enter and Space open it too (checked end to end).
    openAt("Hotel bedroom");

    expectShowing("Hotel bedroom", "2 of 2");
  });

  it("steps with Next and Previous, wrapping at both ends", () => {
    renderPhotos();
    openAt("Hotel bedroom");
    const dialog = within(viewer());

    fireEvent.click(dialog.getByRole("button", { name: "Next photo" }));
    expectShowing("Resort exterior and swimming pool", "1 of 2");

    fireEvent.click(dialog.getByRole("button", { name: "Previous photo" }));
    expectShowing("Hotel bedroom", "2 of 2");
  });

  it("steps with the arrow keys, wrapping at both ends", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowLeft" });
    expectShowing("Hotel bedroom", "2 of 2");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "ArrowRight" });
    expectShowing("Resort exterior and swimming pool", "1 of 2");
  });

  it("ignores the arrow keys while closed", () => {
    renderPhotos();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("steps on a horizontal swipe of at least 50px", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");

    swipe(-60);
    expectShowing("Hotel bedroom", "2 of 2");

    swipe(60);
    expectShowing("Resort exterior and swimming pool", "1 of 2");
  });

  it("ignores short and mostly vertical drags", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");

    swipe(-40);
    expectShowing("Resort exterior and swimming pool", "1 of 2");

    swipe(-60, 120);
    expectShowing("Resort exterior and swimming pool", "1 of 2");
  });

  it("ignores a two-finger drag and a cancelled touch", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");
    const area = within(viewer()).getByRole("img").parentElement as HTMLElement;

    fireEvent.touchStart(area, {
      touches: [
        { clientX: 200, clientY: 300 },
        { clientX: 240, clientY: 300 },
      ],
    });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 120, clientY: 300 }] });
    expectShowing("Resort exterior and swimming pool", "1 of 2");

    fireEvent.touchStart(area, { touches: [{ clientX: 200, clientY: 300 }] });
    fireEvent.touchCancel(area);
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 100, clientY: 300 }] });
    expectShowing("Resort exterior and swimming pool", "1 of 2");
  });

  it("closes on Escape and returns focus to the photo that opened it", () => {
    renderPhotos();
    const second = openAt("Hotel bedroom");
    expect(within(viewer()).getByRole("button", { name: "Close" })).toHaveFocus();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(second).toHaveFocus();
  });

  it("closes on Close and returns focus to the photo that opened it", () => {
    renderPhotos();
    const first = openAt("Resort exterior and swimming pool");

    fireEvent.click(within(viewer()).getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(first).toHaveFocus();
  });

  it("shows the placeholder when a photo fails and still steps", () => {
    renderPhotos();
    openAt("Resort exterior and swimming pool");
    const dialog = within(viewer());

    fireEvent.error(dialog.getByRole("img", { name: "Resort exterior and swimming pool" }));
    const placeholder = dialog.getByRole("img", { name: "Resort exterior and swimming pool" });
    expect(placeholder.tagName).toBe("DIV");
    expect(placeholder).toHaveTextContent("Harbourlight Retreat");

    fireEvent.click(dialog.getByRole("button", { name: "Next photo" }));
    expectShowing("Hotel bedroom", "2 of 2");
  });
});
