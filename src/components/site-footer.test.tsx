import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { SiteFooter } from "./site-footer";

it("shows the fictional-demo notice in the contentinfo landmark", () => {
  render(<SiteFooter />);
  const footer = screen.getByRole("contentinfo");
  expect(
    within(footer).getByText(
      "CheckInn is a demo. Hotels, prices and reviews are fictional. Photos are illustrative. No payment is taken.",
    ),
  ).toBeInTheDocument();
});

it("links to Photo credits", () => {
  render(<SiteFooter />);
  expect(screen.getByRole("link", { name: "Photo credits" })).toHaveAttribute(
    "href",
    "/credits",
  );
});
