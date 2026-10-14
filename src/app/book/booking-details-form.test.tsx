import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancellationLine } from "@/domain/cancellation";
import type { ActionResult, BookingQuote } from "@/domain/types";
import { BookingDetailsForm } from "./booking-details-form";

const mocks = vi.hoisted(() => ({
  confirmBooking: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/booking/actions", () => ({ confirmBooking: mocks.confirmBooking }));

const stay = { checkIn: "2026-11-13", checkOut: "2026-11-18" };
const party = { adults: 2, children: 3, rooms: 2 };
const quote: BookingQuote = {
  hotelId: "hotel-005",
  hotelName: "Coral Coast Resort",
  checkInTime: "14:00",
  cancellationPolicy: "free_until_48_hours_before_check_in",
  stay,
  party,
  lines: [
    { roomTypeId: "hotel-005-standard", name: "Standard Double", quantity: 1, lineTotalRand: 11000 },
    { roomTypeId: "hotel-005-family", name: "Family Room", quantity: 1, lineTotalRand: 13750 },
  ],
  roomCount: 2,
  totalRand: 24750,
};

const cancellation = cancellationLine(
  quote.cancellationPolicy,
  stay.checkIn,
  "14:00",
  "2026-11-01T08:00:00.000Z",
);

function renderForm() {
  return render(
    <BookingDetailsForm quote={quote} cancellation={cancellation} q="Durban" k="key-1" />,
  );
}

const field = (name: string) => screen.getByRole("textbox", { name });

function fillRequired() {
  fireEvent.change(field("First name"), { target: { value: "Sipho" } });
  fireEvent.change(field("Last name"), { target: { value: "Dlamini" } });
  fireEvent.change(field("Email"), { target: { value: "sipho@example.com" } });
}

/** The summary panel's Confirm booking (the bar has its own). */
function confirmButton() {
  return within(screen.getByRole("complementary", { name: "Booking summary" })).getByRole(
    "button",
    { name: /Confirm booking|Confirming…/ },
  );
}

/** What a server action that redirected rejects with, once the router has navigated. */
function redirectError(url = "/bookings/CI-4M8D2X") {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;push;${url};303;`,
    handled: true,
  });
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name: "Your details" }));
  });
  // Let the action's result settle.
  await act(async () => {});
}

beforeEach(() => {
  mocks.confirmBooking.mockReset();
  mocks.refresh.mockReset();
});

describe("BookingDetailsForm", () => {
  it("has the FR-21 fields, optional ones marked, and arrival times from check-in", () => {
    renderForm();

    for (const name of ["First name", "Last name", "Email", "Mobile number (optional)", "Special requests (optional)"]) {
      expect(field(name)).toBeInTheDocument();
    }
    expect(field("Email")).toHaveAttribute("type", "email");
    expect(field("Mobile number (optional)")).toHaveAttribute("type", "tel");
    const arrival = screen.getByRole("combobox", { name: "Estimated arrival time (optional)" });
    const options = within(arrival).getAllByRole("option").map((option) => option.textContent);
    expect(options[0]).toBe("Not sure yet");
    expect(options[1]).toBe("14:00 – 15:00");
    expect(options.at(-1)).toBe("23:00 – 00:00");
  });

  it("ties every Confirm booking to the form", () => {
    renderForm();

    const buttons = screen.getAllByRole("button", { name: "Confirm booking" });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toHaveAttribute("type", "submit");
      expect(button).toHaveAttribute("form", screen.getByRole("form").id);
    }
  });

  it("shows the summary with both lines and the total, and the phone bar", () => {
    renderForm();

    const summary = within(screen.getByRole("complementary", { name: "Booking summary" }));
    expect(summary.getByText("1 × Standard Double")).toBeInTheDocument();
    expect(summary.getByText("1 × Family Room")).toBeInTheDocument();
    expect(summary.getByText("until Wed 11 Nov 2026, 14:00")).toBeInTheDocument();
    const bar = within(screen.getByRole("region", { name: "Booking summary" }));
    expect(bar.getByText(/^2 rooms · R\s24\s750,00$/)).toBeInTheDocument();
    expect(bar.getByRole("button", { name: "Confirm booking" })).toBeInTheDocument();
  });

  it("an empty submit makes no Booking and focuses a summary linking to the 3 fields", async () => {
    renderForm();

    await submit();

    expect(mocks.confirmBooking).not.toHaveBeenCalled();
    const summary = screen.getByRole("group", { name: "3 details need fixing" });
    expect(summary).toHaveFocus();
    const links = within(summary).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Enter your first name.",
      "Enter your last name.",
      "Enter your email address.",
    ]);
    fireEvent.click(links[1]);
    expect(field("Last name")).toHaveFocus();
    expect(field("Last name")).toHaveAttribute("aria-invalid", "true");
    expect(field("Last name")).toHaveAccessibleDescription("Enter your last name.");
  });

  it("checks the email when the guest leaves it", () => {
    renderForm();

    fireEvent.change(field("Email"), { target: { value: "thandi@" } });
    fireEvent.blur(field("Email"));

    expect(field("Email")).toHaveAccessibleDescription(
      "Enter an email address like name@example.com.",
    );
    // No summary until the guest submits.
    expect(screen.queryByRole("group", { name: /need/ })).toBeNull();

    fireEvent.change(field("Email"), { target: { value: "thandi@example.com" } });
    fireEvent.blur(field("Email"));
    expect(field("Email")).not.toHaveAttribute("aria-invalid");
  });

  it("flags a required field the guest tabs through empty", () => {
    renderForm();

    fireEvent.blur(field("First name"));

    expect(field("First name")).toHaveAttribute("aria-invalid", "true");
    expect(field("First name")).toHaveAccessibleDescription("Enter your first name.");
    expect(field("Mobile number (optional)")).not.toHaveAttribute("aria-invalid");
  });

  it("confirms with the quote's criteria, the key and what the guest typed", async () => {
    mocks.confirmBooking.mockReturnValue(new Promise(() => {}));
    renderForm();
    fillRequired();
    fireEvent.change(screen.getByRole("combobox", { name: /arrival/ }), {
      target: { value: "15:00 – 16:00" },
    });

    await submit();

    expect(mocks.confirmBooking).toHaveBeenCalledWith({
      hotelId: "hotel-005",
      q: "Durban",
      stay,
      party,
      sel: [
        { roomTypeId: "hotel-005-standard", quantity: 1 },
        { roomTypeId: "hotel-005-family", quantity: 1 },
      ],
      k: "key-1",
      guest: {
        firstName: "Sipho",
        lastName: "Dlamini",
        email: "sipho@example.com",
        phone: "",
        arrivalTime: "15:00 – 16:00",
        specialRequests: "",
      },
    });
  });

  it("reads Confirming… and is read-only while confirming, and ignores a second press", async () => {
    mocks.confirmBooking.mockReturnValue(new Promise(() => {}));
    renderForm();
    fillRequired();

    await submit();

    expect(confirmButton()).toHaveTextContent("Confirming…");
    expect(confirmButton()).toBeDisabled();
    expect(field("First name")).toHaveAttribute("readonly");
    expect(screen.getByRole("combobox", { name: /arrival/ })).toBeDisabled();

    await submit();
    expect(mocks.confirmBooking).toHaveBeenCalledTimes(1);
  });

  it("keeps what the guest typed on a server error, and Try again repeats the confirm", async () => {
    const failure: ActionResult = {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    };
    mocks.confirmBooking.mockResolvedValue(failure);
    renderForm();
    fillRequired();

    await submit();

    const alert = screen.getByRole("group", { name: "Something went wrong on our side. Try again." });
    expect(alert).toHaveFocus();
    expect(field("First name")).toHaveValue("Sipho");
    expect(confirmButton()).toHaveTextContent("Confirm booking");

    await act(async () => {
      fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    });
    expect(mocks.confirmBooking).toHaveBeenCalledTimes(2);
  });

  it("treats a failed request like a server error", async () => {
    mocks.confirmBooking.mockRejectedValue(new TypeError("Failed to fetch"));
    renderForm();
    fillRequired();

    await submit();

    expect(
      screen.getByRole("group", { name: "Something went wrong on our side. Try again." }),
    ).toHaveFocus();
    expect(field("Email")).toHaveValue("sipho@example.com");
  });

  it("swallows the redirect error of a confirm that succeeded", async () => {
    mocks.confirmBooking.mockRejectedValue(redirectError());
    renderForm();
    fillRequired();

    await submit();

    expect(screen.queryByRole("group")).toBeNull();
    expect(field("First name")).toHaveValue("Sipho");
  });

  it("shows the server's field errors in the summary", async () => {
    mocks.confirmBooking.mockResolvedValue({
      ok: false,
      code: "VALIDATION",
      fieldErrors: { email: "Enter an email address like name@example.com." },
      message: "Check your details and try again.",
    } satisfies ActionResult);
    renderForm();
    fillRequired();

    await submit();

    const summary = screen.getByRole("group", { name: "1 detail needs fixing" });
    expect(summary).toHaveFocus();
    expect(field("Email")).toHaveAccessibleDescription(
      "Enter an email address like name@example.com.",
    );
  });

  it("after a confirm that navigated away, coming Back refreshes instead of showing the form", async () => {
    mocks.confirmBooking.mockRejectedValue(redirectError());
    // Next hides a page it navigates away from with Activity and shows it on Back.
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <BookingDetailsForm quote={quote} cancellation={cancellation} q="Durban" k="key-1" />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    fillRequired();
    await submit();

    await act(async () => rerender(page("hidden")));
    await act(async () => rerender(page("visible")));

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByText("Opening your booking…")).toBeInTheDocument();
  });

  it("coming Back after a redirect to the Hotel page shows the form again, with no refresh", async () => {
    // Rooms ran out, or the input was rejected: nothing was booked.
    mocks.confirmBooking.mockRejectedValue(
      redirectError("/hotels/hotel-005?notice=room-unavailable&rt=hotel-005-family"),
    );
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <BookingDetailsForm quote={quote} cancellation={cancellation} q="Durban" k="key-1" />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    fillRequired();
    await submit();

    await act(async () => rerender(page("hidden")));
    await act(async () => rerender(page("visible")));

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByText("Opening your booking…")).toBeNull();
    expect(confirmButton()).toHaveTextContent("Confirm booking");
    expect(confirmButton()).toBeEnabled();
    expect(field("First name")).toHaveValue("Sipho");
  });

  it("coming Back after a refused try shows the form as it was, with no refresh", async () => {
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <BookingDetailsForm quote={quote} cancellation={cancellation} q="Durban" k="key-1" />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    await submit();

    await act(async () => rerender(page("hidden")));
    await act(async () => rerender(page("visible")));

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("form", { name: "Your details" })).toBeInTheDocument();
  });

  it("a refused try, then a confirm that navigated away, still refreshes on Back", async () => {
    mocks.confirmBooking
      .mockResolvedValueOnce({
        ok: false,
        code: "SERVER_ERROR",
        message: "Something went wrong on our side. Try again.",
      } satisfies ActionResult)
      .mockRejectedValueOnce(redirectError());
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <BookingDetailsForm quote={quote} cancellation={cancellation} q="Durban" k="key-1" />
      </Activity>
    );
    const { rerender } = render(page("visible"));
    fillRequired();
    await submit();
    await submit();

    await act(async () => rerender(page("hidden")));
    await act(async () => rerender(page("visible")));

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("form")).toBeNull();
  });
});
