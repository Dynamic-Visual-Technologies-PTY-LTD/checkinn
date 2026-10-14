import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ManageContent } from "./manage-content";
import ManagePage, { metadata } from "./page";

vi.mock("@/features/booking/actions", () => ({ findBooking: vi.fn() }));

describe("ManagePage", () => {
  it("is titled Manage booking", () => {
    expect(metadata.title).toBe("Manage booking");
  });

  it("prerenders the headline and a skeleton until the URL resolves", () => {
    const never = new Promise<never>(() => {});
    const { container } = render(
      <ManagePage params={never} searchParams={never as PageProps<"/manage">["searchParams"]} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Manage booking" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    // The skeleton is aria-hidden, so no role or text can find it.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("ManageContent", () => {
  async function prefilled(query: Record<string, string | string[]>) {
    render(await ManageContent({ searchParams: Promise.resolve(query) }));
    return screen.getByRole("textbox", { name: "Booking reference" });
  }

  it("fills in the URL's reference, normalised, and never an email", async () => {
    expect(await prefilled({ reference: "ci-7k3p9q", email: "thandi@example.com" })).toHaveValue(
      "CI-7K3P9Q",
    );
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("");
  });

  it("cuts a long reference to the field's limit", async () => {
    const field = await prefilled({ reference: "B".repeat(20) });
    expect(field).toHaveValue(`CI-${"B".repeat(17)}`);
    expect(field).toHaveAttribute("maxlength", "20");
  });

  it("leaves the field empty without a reference", async () => {
    expect(await prefilled({})).toHaveValue("");
  });
});
