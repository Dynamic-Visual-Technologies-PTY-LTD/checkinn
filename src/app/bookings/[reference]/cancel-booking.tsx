"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  primaryButton,
  primaryButtonDisabled,
  secondaryButton,
  secondaryButtonDisabled,
} from "@/components/button-styles";
import { CancellationLineText } from "@/components/cancellation-line";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icons/icons";
import { NETWORK_ERROR, redirectTarget } from "@/components/server-action";
import type { CancellationLine } from "@/domain/cancellation";
import { stayLabel } from "@/domain/dates";
import type { ActionResult, Stay } from "@/domain/types";
import { cancelBooking } from "@/features/booking/actions";

/** Outcomes after which cancelling again can't help, so the button goes. */
const FINAL_CODES = new Set<ActionResult["code"]>([
  "NOT_CANCELLABLE",
  "DEADLINE_PASSED",
  "ALREADY_CANCELLED",
]);

/** `final`: cancelling again can't help. `retry`: a server error, offered Try again. */
type Refusal = { message: string; final: boolean; retry: boolean };

/**
 * The references whose cancel this browser tab has sent and that redirected
 * to the cancelled Booking. Kept for the life of the page's JavaScript, so a
 * Booking view restored by Back, whether from Activity or the router's
 * cache, never offers the dialog again.
 */
const sentCancels = new Set<string>();

type CancelBookingProps = {
  reference: string;
  hotelName: string;
  stay: Stay;
  /** The open free-cancellation line, with its deadline. */
  line: Extract<CancellationLine, { kind: "free" }>;
};

/**
 * Free cancellation open (EXPERIENCE.md Booking view, Cancel booking): the
 * Mint "Free cancellation" badge with the deadline, and a secondary Cancel
 * booking button that opens the cancel-confirmation dialog. Keep booking has
 * focus first; Escape or Keep booking closes with no change and focus goes
 * back to the button. Confirming calls `cancelBooking`; while it runs the
 * dialog's button reads "Cancelling…" and both buttons are disabled.
 *
 * Success redirects to the Booking view with the cancelled notice. A refusal
 * (Non-refundable, the deadline passed while the dialog was open, already
 * cancelled) closes the dialog, shows its message in place of the badge
 * and button, and refreshes the page from the server so its status matches.
 * A server error shows its message above the button with Try again, which
 * repeats the cancel; opening the dialog again clears it.
 *
 * Next keeps this page in the DOM after it navigates away (Activity). Once a
 * cancel was sent, the dialog never opens again, and if the guest comes Back
 * the page is refreshed from the server, which shows the Booking as
 * cancelled.
 */
export function CancelBooking({ reference, hotelName, stay, line }: CancelBookingProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  // Set once a cancel redirected to the Booking: the dialog is done for good.
  const [sent, setSent] = useState(() => sentCancels.has(reference));
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const sending = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Each request focuses once, not again when Activity shows the page again.
  const focused = useRef(0);
  useEffect(() => {
    if (focusRequest === 0 || focusRequest === focused.current) return;
    focused.current = focusRequest;
    alertRef.current?.focus();
  }, [focusRequest]);

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // On mount, and again when Activity shows the page again: a page shown
  // after its cancel was sent is out of date, so it is fetched afresh.
  const referenceRef = useRef(reference);
  useLayoutEffect(() => {
    if (!sentCancels.has(referenceRef.current)) return;
    setSent(true);
    routerRef.current.refresh();
  }, []);

  function start() {
    setRefusal(null);
    setOpen(true);
  }

  function keep() {
    if (sending.current) return;
    setOpen(false);
  }

  function confirm() {
    // A second press before the first re-render sends nothing more.
    if (sending.current || sentCancels.has(reference)) return;
    sending.current = true;
    setPending(true);
    void send();
  }

  async function send() {
    let result: ActionResult | undefined;
    try {
      result = await cancelBooking({ reference });
    } catch (error) {
      const target = redirectTarget(error);
      if (target !== null) {
        // The router has already followed the redirect. To the Booking view,
        // the Booking is cancelled; anywhere else (Manage booking, without
        // access) nothing changed.
        if (target.startsWith("/bookings/")) {
          sentCancels.add(reference);
          setSent(true);
        }
        sending.current = false;
        setPending(false);
        setOpen(false);
        return;
      }
      result = NETWORK_ERROR;
    }
    sending.current = false;
    setPending(false);
    if (!result || result.ok) return;
    setOpen(false);
    const final = FINAL_CODES.has(result.code);
    setRefusal({ message: result.message, final, retry: result.code === "SERVER_ERROR" });
    setFocusRequest((count) => count + 1);
    // The Booking changed elsewhere (cancelled in another tab, the deadline
    // passed): fetch the page afresh so its status and state match.
    if (final) routerRef.current.refresh();
  }

  const alert = refusal && (
    <div
      ref={alertRef}
      tabIndex={-1}
      role="group"
      aria-labelledby="cancel-alert-message"
      className="flex flex-col items-start gap-space-md rounded-md border border-error bg-surface p-space-md text-on-surface"
    >
      <p id="cancel-alert-message" className="flex items-start gap-space-sm">
        <Icon name="error" className="mt-0.5 shrink-0 text-error" />
        {refusal.message}
      </p>
      {refusal.retry && (
        <button
          type="button"
          onClick={confirm}
          disabled={pending}
          className={`${secondaryButton} ${secondaryButtonDisabled}`}
        >
          {pending ? "Cancelling…" : "Try again"}
        </button>
      )}
    </div>
  );

  if (refusal?.final) return alert;

  return (
    <div className="flex flex-col items-start gap-space-lg">
      {alert}
      <div className="text-body-sm">
        <CancellationLineText line={line} />
      </div>
      {!sent && (
        <button
          ref={triggerRef}
          type="button"
          onClick={start}
          aria-haspopup="dialog"
          className={secondaryButton}
        >
          Cancel booking
        </button>
      )}
      <Dialog
        open={open && !sent}
        onClose={keep}
        title="Cancel booking"
        initialFocusRef={keepRef}
        returnFocusRef={triggerRef}
      >
        <p>
          Cancel your booking at {hotelName} for {stayLabel(stay)}? This can&apos;t be undone.
        </p>
        <div className="flex flex-col gap-space-sm sm:flex-row sm:justify-end">
          <button
            ref={keepRef}
            type="button"
            onClick={keep}
            disabled={pending}
            className={`${secondaryButton} ${secondaryButtonDisabled}`}
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={pending}
            className={`${primaryButton} ${primaryButtonDisabled}`}
          >
            {pending ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
