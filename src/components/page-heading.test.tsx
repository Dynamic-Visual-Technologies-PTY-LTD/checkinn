import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { PageHeading } from "./page-heading";

const heading = <PageHeading>Cape Town: 2 properties found</PageHeading>;

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

it("takes another type style", () => {
  render(<PageHeading className="text-headline-display-responsive">You&apos;re booked!</PageHeading>);

  expect(screen.getByRole("heading", { name: "You're booked!" })).toHaveClass(
    "text-headline-display-responsive",
  );
});

it("takes focus again when its refocus key changes, not on its first render", () => {
  const { rerender } = render(
    <>
      <PageHeading focusOnArrival={false} refocusKey={0}>
        Cape Town: 2 properties found
      </PageHeading>
      <button type="button">Try again</button>
    </>,
  );
  const button = screen.getByRole("button", { name: "Try again" });
  button.focus();

  rerender(
    <>
      <PageHeading focusOnArrival={false} refocusKey={0}>
        Cape Town: 2 properties found
      </PageHeading>
      <button type="button">Try again</button>
    </>,
  );
  expect(button).toHaveFocus();

  rerender(
    <>
      <PageHeading focusOnArrival={false} refocusKey={1}>
        Cape Town: 2 properties found
      </PageHeading>
      <button type="button">Try again</button>
    </>,
  );
  expect(screen.getByRole("heading")).toHaveFocus();
});
