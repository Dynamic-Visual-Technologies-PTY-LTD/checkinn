import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageBookingForm } from "./manage-booking-form";

const mocks = vi.hoisted(() => ({ findBooking: vi.fn() }));

vi.mock("@/features/booking/actions", () => ({ findBooking: mocks.findBooking }));

const NOT_FOUND = "We couldn't find that booking. Check the reference and email.";

const field = (name: string) => screen.getByRole("textbox", { name });

function fill(reference: string, email: string) {
  fireEvent.change(field("Booking reference"), { target: { value: reference } });
  fireEvent.change(field("Email"), { target: { value: email } });
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name: "Find your booking" }));
  });
  // Let the action's result settle.
  await act(async () => {});
}

beforeEach(() => {
  mocks.findBooking.mockReset();
});

describe("ManageBookingForm", () => {
  it("has labelled Reference and Email fields and Find booking", () => {
    render(<ManageBookingForm initialReference="" />);
    expect(field("Booking reference")).toHaveValue("");
    expect(field("Email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("button", { name: "Find booking" })).toBeInTheDocument();
  });

  it("starts with the pre-filled reference and an empty email", () => {
    render(<ManageBookingForm initialReference="CI-7K3P9Q" />);
    expect(field("Booking reference")).toHaveValue("CI-7K3P9Q");
    expect(field("Email")).toHaveValue("");
  });

  it("shows an error summary on an empty submit, focuses it and looks nothing up", async () => {
    render(<ManageBookingForm initialReference="" />);
    await submit();

    const summary = screen.getByRole("group", { name: "2 details need fixing" });
    expect(summary).toHaveFocus();
    expect(screen.getByRole("link", { name: "Enter your booking reference." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter your email address." })).toBeInTheDocument();
    expect(field("Booking reference")).toHaveAttribute("aria-describedby", "manage-reference-error");
    expect(field("Email")).toHaveAttribute("aria-invalid", "true");
    expect(mocks.findBooking).not.toHaveBeenCalled();
  });

  it("checks a field when the guest leaves it", () => {
    render(<ManageBookingForm initialReference="" />);
    fireEvent.change(field("Email"), { target: { value: "thandi" } });
    fireEvent.blur(field("Email"));
    expect(screen.getByText("Enter an email address like name@example.com.")).toBeInTheDocument();

    fireEvent.change(field("Email"), { target: { value: "thandi@example.com" } });
    fireEvent.blur(field("Email"));
    expect(screen.queryByText("Enter an email address like name@example.com.")).toBeNull();
  });

  it("sends what the guest typed and reads Finding… while it looks", async () => {
    mocks.findBooking.mockReturnValue(new Promise(() => {}));
    render(<ManageBookingForm initialReference="" />);
    fill(" ci-7k3p9q ", " Thandi@Example.COM ");
    await submit();

    expect(mocks.findBooking).toHaveBeenCalledWith({
      reference: " ci-7k3p9q ",
      // An email input trims its own value; the server normalises the rest.
      email: "Thandi@Example.COM",
    });
    expect(screen.getByRole("button", { name: "Finding…" })).toBeDisabled();
    expect(field("Email")).toHaveAttribute("readonly");
  });

  it("shows the not-found alert, keeps the values and focuses the alert", async () => {
    mocks.findBooking.mockResolvedValue({ ok: false, code: "NOT_FOUND", message: NOT_FOUND });
    render(<ManageBookingForm initialReference="" />);
    fill("CI-AAAAAA", "thandi@example.com");
    await submit();

    expect(screen.getByRole("group", { name: NOT_FOUND })).toHaveFocus();
    expect(field("Booking reference")).toHaveValue("CI-AAAAAA");
    expect(field("Email")).toHaveValue("thandi@example.com");
    expect(screen.getByRole("button", { name: "Find booking" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("offers Try again after a server error", async () => {
    mocks.findBooking.mockResolvedValueOnce({
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    });
    mocks.findBooking.mockReturnValueOnce(new Promise(() => {}));
    render(<ManageBookingForm initialReference="" />);
    fill("CI-7K3P9Q", "thandi@example.com");
    await submit();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(mocks.findBooking).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Something went wrong on our side. Try again.")).toBeNull();
  });

  it("shows the server's field errors", async () => {
    mocks.findBooking.mockResolvedValue({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { email: "Enter an email address like name@example.com." },
      message: "Check the reference and email and try again.",
    });
    render(<ManageBookingForm initialReference="" />);
    fill("CI-7K3P9Q", "thandi@example.com");
    await submit();

    expect(screen.getByRole("group", { name: "1 detail needs fixing" })).toHaveFocus();
  });

  it("is ready again after a lookup redirected, for Back", async () => {
    mocks.findBooking.mockRejectedValue(
      Object.assign(new Error("NEXT_REDIRECT"), {
        digest: "NEXT_REDIRECT;push;/bookings/CI-7K3P9Q;303;",
      }),
    );
    render(<ManageBookingForm initialReference="" />);
    fill("CI-7K3P9Q", "thandi@example.com");
    await submit();

    expect(screen.getByRole("button", { name: "Find booking" })).toBeEnabled();
    expect(screen.queryByRole("group")).toBeNull();
  });
});
