import { act, fireEvent, render, screen } from "@testing-library/react";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CancellationLine } from "@/domain/cancellation";
import { CancelBooking } from "./cancel-booking";

const mocks = vi.hoisted(() => ({
  cancelBooking: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/features/booking/actions", () => ({ cancelBooking: mocks.cancelBooking }));

const line: Extract<CancellationLine, { kind: "free" }> = {
  kind: "free",
  until: "until Wed 11 Nov 2026, 14:00",
  text: "Free cancellation until Wed 11 Nov 2026, 14:00",
};

const QUESTION =
  "Cancel your booking at Coral Coast Resort for Fri 13 – Wed 18 Nov 2026? This can't be undone.";

// A cancel that was sent is remembered for the page's life, so each test
// uses its own reference.
let count = 0;
let reference = "";

function renderCancel(visible = true) {
  return render(
    <Activity mode={visible ? "visible" : "hidden"}>
      <CancelBooking
        reference={reference}
        hotelName="Coral Coast Resort"
        stay={{ checkIn: "2026-11-13", checkOut: "2026-11-18" }}
        line={line}
      />
    </Activity>,
  );
}

/** What a server action that redirected rejects with, once the router has navigated. */
function redirectError(url: string) {
  return Object.assign(new Error("NEXT_REDIRECT"), {
    digest: `NEXT_REDIRECT;push;${url};303;`,
  });
}

const trigger = () => screen.getByRole("button", { name: "Cancel booking" });
const dialog = () => screen.queryByRole("dialog", { name: "Cancel booking" });

async function openAndConfirm() {
  fireEvent.click(trigger());
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel booking" }).at(-1)!);
  });
  // Let the action's result settle.
  await act(async () => {});
}

beforeEach(() => {
  count += 1;
  reference = `CI-TEST${count}`;
  mocks.cancelBooking.mockReset();
  mocks.refresh.mockReset();
});

describe("CancelBooking", () => {
  it("shows the free-cancellation badge, the deadline and a Cancel booking button", () => {
    renderCancel();
    expect(screen.getByText("Free cancellation")).toBeInTheDocument();
    expect(screen.getByText("until Wed 11 Nov 2026, 14:00")).toBeInTheDocument();
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("opens the dialog with the question and Keep booking focused first", () => {
    renderCancel();
    fireEvent.click(trigger());

    expect(dialog()).toHaveTextContent(QUESTION);
    expect(screen.getByRole("button", { name: "Keep booking" })).toHaveFocus();
  });

  it("closes on Keep booking or Escape with no change, and focus goes back to the trigger", () => {
    renderCancel();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Keep booking" }));
    expect(dialog()).toBeNull();
    expect(trigger()).toHaveFocus();

    fireEvent.click(trigger());
    fireEvent.keyDown(dialog()!, { key: "Escape" });
    expect(dialog()).toBeNull();
    expect(trigger()).toHaveFocus();
    expect(mocks.cancelBooking).not.toHaveBeenCalled();
  });

  it("reads Cancelling… and disables both buttons while the cancel runs", async () => {
    mocks.cancelBooking.mockReturnValue(new Promise(() => {}));
    renderCancel();
    fireEvent.click(trigger());
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Cancel booking" }).at(-1)!);
    });

    expect(mocks.cancelBooking).toHaveBeenCalledWith({ reference });
    expect(screen.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep booking" })).toBeDisabled();
    // Escape does not close it mid-cancel.
    fireEvent.keyDown(dialog()!, { key: "Escape" });
    expect(dialog()).not.toBeNull();
  });

  it("never shows the dialog again after a cancel redirected, and refreshes on Back", async () => {
    mocks.cancelBooking.mockRejectedValue(redirectError("/bookings/CI-4M8D2X?notice=cancelled"));
    const { rerender } = renderCancel();
    await openAndConfirm();

    expect(dialog()).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();

    // Next hides the page (Activity) and shows it again on Back.
    rerender(
      <Activity mode="hidden">
        <CancelBooking
          reference={reference}
          hotelName="Coral Coast Resort"
          stay={{ checkIn: "2026-11-13", checkOut: "2026-11-18" }}
          line={line}
        />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <CancelBooking
          reference={reference}
          hotelName="Coral Coast Resort"
          stay={{ checkIn: "2026-11-13", checkOut: "2026-11-18" }}
          line={line}
        />
      </Activity>,
    );
    expect(mocks.refresh).toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it("offers no dialog when the same Booking's view mounts again after its cancel was sent", async () => {
    mocks.cancelBooking.mockRejectedValue(redirectError(`/bookings/${reference}?notice=cancelled`));
    const { unmount } = renderCancel();
    await openAndConfirm();
    unmount();
    mocks.refresh.mockReset();

    // Back may render the page afresh from the router's cache.
    renderCancel();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows a passed deadline in place of the button, with focus, and cancels nothing", async () => {
    mocks.cancelBooking.mockResolvedValue({
      ok: false,
      code: "DEADLINE_PASSED",
      message: "Free cancellation ended on Wed 11 Nov 2026, 14:00.",
    });
    renderCancel();
    await openAndConfirm();

    expect(dialog()).toBeNull();
    const alert = screen.getByRole("group", {
      name: "Free cancellation ended on Wed 11 Nov 2026, 14:00.",
    });
    expect(alert).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Cancel booking" })).toBeNull();
    expect(screen.queryByText("Free cancellation")).toBeNull();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    // The page is fetched afresh, so the rest of it matches.
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("refreshes the page after ALREADY_CANCELLED, so the status reads Cancelled", async () => {
    mocks.cancelBooking.mockResolvedValue({
      ok: false,
      code: "ALREADY_CANCELLED",
      message: "This booking is already cancelled.",
    });
    renderCancel();
    await openAndConfirm();

    expect(screen.getByRole("group", { name: "This booking is already cancelled." })).toHaveFocus();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("offers Try again after a server error, which repeats the cancel", async () => {
    mocks.cancelBooking.mockResolvedValueOnce({
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    });
    mocks.cancelBooking.mockReturnValueOnce(new Promise(() => {}));
    renderCancel();
    await openAndConfirm();
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    expect(mocks.cancelBooking).toHaveBeenCalledTimes(2);
    expect(mocks.cancelBooking).toHaveBeenLastCalledWith({ reference });
    expect(screen.getByRole("button", { name: "Cancelling…" })).toBeDisabled();
  });

  it("keeps the button after a server error and clears the error when the guest tries again", async () => {
    mocks.cancelBooking.mockResolvedValue({
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    });
    renderCancel();
    await openAndConfirm();

    const alert = screen.getByRole("group", {
      name: "Something went wrong on our side. Try again.",
    });
    expect(alert).toHaveFocus();

    fireEvent.click(trigger());
    expect(screen.queryByText("Something went wrong on our side. Try again.")).toBeNull();
    expect(dialog()).not.toBeNull();
  });

  it("treats a failed request as a server error", async () => {
    mocks.cancelBooking.mockRejectedValue(new TypeError("Failed to fetch"));
    renderCancel();
    await openAndConfirm();

    expect(screen.getByText("Something went wrong on our side. Try again.")).toBeInTheDocument();
    expect(trigger()).toBeInTheDocument();
  });

  it("lets the guest try again after a redirect that cancelled nothing", async () => {
    mocks.cancelBooking.mockRejectedValue(redirectError("/manage?reference=CI-4M8D2X"));
    renderCancel();
    await openAndConfirm();

    expect(dialog()).toBeNull();
    fireEvent.click(trigger());
    expect(dialog()).not.toBeNull();
  });
});
