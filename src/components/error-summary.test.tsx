import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorSummary, errorSummaryTitle } from "./error-summary";

describe("errorSummaryTitle", () => {
  it("counts the details", () => {
    expect(errorSummaryTitle(1)).toBe("1 detail needs fixing");
    expect(errorSummaryTitle(3)).toBe("3 details need fixing");
  });
});

describe("ErrorSummary", () => {
  function renderSummary() {
    render(
      <>
        <ErrorSummary
          errors={[
            { fieldId: "first", message: "Enter your first name." },
            { fieldId: "email", message: "Enter your email address." },
          ]}
        />
        <input id="first" aria-label="First name" />
        <input id="email" aria-label="Email" />
      </>,
    );
  }

  it("is a focusable group named by its title, not a live region", () => {
    renderSummary();

    const summary = screen.getByRole("group", { name: "2 details need fixing" });
    expect(summary).toHaveAttribute("tabindex", "-1");
    expect(summary).not.toHaveAttribute("aria-live");
    expect(summary).not.toHaveAttribute("role", "alert");
  });

  it("links each message to its field and moves focus there", () => {
    renderSummary();

    const link = screen.getByRole("link", { name: "Enter your email address." });
    expect(link).toHaveAttribute("href", "#email");
    fireEvent.click(link);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveFocus();
  });
});
