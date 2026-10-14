import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemoteImage, sizedPhotoUrl } from "./remote-image";

const photo = {
  src: "https://commons.wikimedia.org/wiki/Special:FilePath/Cape%20Town%20Skyline.jpg",
  alt: "Cape Town destination photograph",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RemoteImage", () => {
  it("renders the photo with its seed alt text", () => {
    render(<RemoteImage {...photo} />);

    const image = screen.getByRole("img", { name: photo.alt });
    expect(image.tagName).toBe("IMG");
    expect(image).toHaveAttribute("src", `${photo.src}?width=800`);
  });

  it("crops to cover by default and can contain the whole photo", () => {
    const { rerender } = render(<RemoteImage {...photo} />);
    expect(screen.getByRole("img", { name: photo.alt })).toHaveClass("object-cover");

    rerender(<RemoteImage {...photo} fit="contain" />);
    const image = screen.getByRole("img", { name: photo.alt });
    expect(image).toHaveClass("object-contain");
    expect(image).not.toHaveClass("object-cover");
  });

  it("asks Wikimedia for an 800px photo and leaves other URLs alone", () => {
    expect(sizedPhotoUrl(photo.src)).toBe(`${photo.src}?width=800`);
    expect(sizedPhotoUrl(`${photo.src}?width=400`)).toBe(
      `${photo.src}?width=400`,
    );
    const unsplash =
      "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1200&q=80";
    expect(sizedPhotoUrl(unsplash)).toBe(unsplash);
    expect(sizedPhotoUrl("/local.png")).toBe("/local.png");
  });

  it("swaps to the placeholder when the photo fails", () => {
    render(<RemoteImage {...photo} label="Cape Town" />);

    fireEvent.error(screen.getByRole("img", { name: photo.alt }));

    const placeholder = screen.getByRole("img", { name: photo.alt });
    expect(placeholder.tagName).toBe("DIV");
    expect(placeholder).toHaveTextContent("Cape Town");
    // Proves the failed <img> is gone; the placeholder also has role img.
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows the placeholder when the photo failed before hydration", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
      true,
    );
    vi.spyOn(
      HTMLImageElement.prototype,
      "naturalWidth",
      "get",
    ).mockReturnValue(0);

    render(<RemoteImage {...photo} />);

    expect(screen.getByRole("img", { name: photo.alt }).tagName).toBe("DIV");
  });

  it("keeps a photo that has already loaded", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
      true,
    );
    vi.spyOn(
      HTMLImageElement.prototype,
      "naturalWidth",
      "get",
    ).mockReturnValue(1200);

    render(<RemoteImage {...photo} />);

    expect(screen.getByRole("img", { name: photo.alt }).tagName).toBe("IMG");
  });
});
