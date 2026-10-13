import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { ResultsHeading } from "./results-heading";

const heading = <ResultsHeading>Cape Town: 2 properties found</ResultsHeading>;

it("is the page headline and can take focus", () => {
  render(heading);

  expect(
    screen.getByRole("heading", { level: 1, name: "Cape Town: 2 properties found" }),
  ).toHaveAttribute("tabindex", "-1");
});

it("takes focus when it arrives by client navigation", () => {
  render(heading);

  expect(screen.getByRole("heading")).toHaveFocus();
});

it("leaves focus alone when hydrated on a full page load", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(heading);
  document.body.appendChild(container);

  render(heading, { container, hydrate: true });

  expect(screen.getByRole("heading")).not.toHaveFocus();
});
