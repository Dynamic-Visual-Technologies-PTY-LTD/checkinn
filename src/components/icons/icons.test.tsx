import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, iconNames } from "./icons";

describe("Icon", () => {
  it("covers the 27 DESIGN.md icons plus info and the Smart search spinner", () => {
    expect(iconNames).toHaveLength(29);
  });

  it("is decorative when it has no title", () => {
    const { container } = render(<Icon name="search" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    // A decorative icon has no role or name, so only its tag can find it.
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("has an accessible name when it has a title", () => {
    render(<Icon name="close" title="Close" />);
    expect(screen.getByRole("img", { name: "Close" })).toBeInTheDocument();
  });

  it.each(iconNames)("draws %s as a 20px line icon", (name) => {
    const { container } = render(<Icon name={name} />);
    // A decorative icon has no role or name, so only its tag can find it.
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(svg).toHaveAttribute("width", "20");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.5");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg?.childElementCount).toBeGreaterThan(0);
  });
});
