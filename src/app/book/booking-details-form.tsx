"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { primaryButton, secondaryButton } from "@/components/button-styles";
import { BookingSummary } from "@/components/booking-summary";
import { ErrorSummary } from "@/components/error-summary";
import { fieldClassName, fieldErrorProps, FormField } from "@/components/form-field";
import { Icon } from "@/components/icons/icons";
import { MobileSummaryBar } from "@/components/mobile-summary-bar";
import type { CancellationLine } from "@/domain/cancellation";
import {
  ARRIVAL_NOT_SURE,
  arrivalTimeOptions,
  GUEST_LIMITS,
  type GuestField,
  validateGuest,
} from "@/domain/guest";
import type { ActionResult, BookingQuote } from "@/domain/types";
import { confirmBooking } from "@/features/booking/actions";

const FORM_ID = "guest-details";

/** Each field's id and visible label (FR-21), in form order. */
export const GUEST_FIELDS: Record<GuestField, { id: string; label: string }> = {
  firstName: { id: "guest-first-name", label: "First name" },
  lastName: { id: "guest-last-name", label: "Last name" },
  email: { id: "guest-email", label: "Email" },
  phone: { id: "guest-phone", label: "Mobile number (optional)" },
  arrivalTime: { id: "guest-arrival-time", label: "Estimated arrival time (optional)" },
  specialRequests: { id: "guest-special-requests", label: "Special requests (optional)" },
};

const FIELD_ORDER = Object.keys(GUEST_FIELDS) as GuestField[];

type Values = Record<GuestField, string>;
type Errors = Partial<Record<GuestField, string>>;

const EMPTY: Values = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  arrivalTime: "",
  specialRequests: "",
};

/** Only the fields `validateGuest` names, so a stray server key is ignored. */
function guestErrors(fieldErrors: Record<string, string>): Errors {
  const errors: Errors = {};
  for (const field of FIELD_ORDER) {
    if (fieldErrors[field]) errors[field] = fieldErrors[field];
  }
  return errors;
}

/** When the request itself fails, the guest sees the same message as a server error. */
const NETWORK_ERROR: ActionResult = {
  ok: false,
  code: "SERVER_ERROR",
  message: "Something went wrong on our side. Try again.",
};

/**
 * Where a server action that redirected sent the guest, or null for any other
 * error. It rejects with Next's redirect error after the router has
 * navigated; the digest reads "NEXT_REDIRECT;<type>;<url>;<status>;".
 */
function redirectTarget(error: unknown): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("digest" in error) ||
    typeof error.digest !== "string" ||
    !error.digest.startsWith("NEXT_REDIRECT;")
  ) {
    return null;
  }
  return error.digest.split(";")[2] ?? "";
}

const confirmButton = `${primaryButton} disabled:cursor-default disabled:border-2 disabled:border-on-surface-disabled disabled:bg-surface disabled:text-on-surface-muted disabled:hover:bg-surface disabled:hover:text-on-surface-muted`;

type BookingDetailsFormProps = {
  quote: BookingQuote;
  cancellation: CancellationLine;
  q: string;
  /** The idempotency key from the URL (AD-10). */
  k: string;
};

/**
 * The guest form and booking summary on Booking details (FR-21, FR-22,
 * EXPERIENCE.md Guest form). Fields validate on blur with the same rules the
 * server uses, and the form on submit; errors focus the error summary.
 * Confirm booking calls `confirmBooking`, which redirects on success. While
 * it runs the button reads "Confirming…" and the form is read-only; a server
 * error keeps what the guest typed and offers Try again.
 *
 * Next keeps this page in the DOM after it navigates away (Activity). If the
 * guest comes Back after confirming, the stale form is replaced and the page
 * is refreshed from the server, which shows the Booking instead (Already
 * booked).
 */
export function BookingDetailsForm({ quote, cancellation, q, k }: BookingDetailsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [showSummary, setShowSummary] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: "summary" | "alert"; id: number }>();
  const [leftAfterConfirm, setLeftAfterConfirm] = useState(false);
  // Set while confirming; stays set once a confirm redirected.
  const [pending, setPending] = useState(false);
  const confirming = useRef(false);
  const focusCount = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Each request focuses once, not again when Activity shows the page again.
  const focused = useRef(0);
  useEffect(() => {
    if (!focusRequest || focusRequest.id === focused.current) return;
    focused.current = focusRequest.id;
    (focusRequest.target === "summary" ? summaryRef : alertRef).current?.focus();
  }, [focusRequest]);

  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Mount-only, so it runs just when Activity hides the page (cleanup) and
  // shows it again (setup).
  useLayoutEffect(() => {
    if (confirming.current) routerRef.current.refresh();
    return () => {
      if (confirming.current) setLeftAfterConfirm(true);
    };
  }, []);

  function requestFocus(target: "summary" | "alert") {
    focusCount.current += 1;
    setFocusRequest({ target, id: focusCount.current });
  }

  function change(field: GuestField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Re-checks one field when the guest leaves it (EXPERIENCE.md Guest form). */
  function blur(field: GuestField) {
    const result = validateGuest(values);
    const message = result.ok ? undefined : result.fieldErrors[field];
    setErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function showErrors(next: Errors) {
    setErrors(next);
    setShowSummary(true);
    setServerError(null);
    requestFocus("summary");
  }

  function confirm() {
    // A second press before the first re-render sends nothing more.
    if (confirming.current) return;
    const checked = validateGuest(values);
    if (!checked.ok) {
      showErrors(checked.fieldErrors);
      return;
    }
    setErrors({});
    setShowSummary(false);
    setServerError(null);
    confirming.current = true;
    setPending(true);
    void send();
  }

  async function send() {
    let result: ActionResult | undefined;
    try {
      result = await confirmBooking({
        hotelId: quote.hotelId,
        q,
        stay: quote.stay,
        party: quote.party,
        sel: quote.lines.map(({ roomTypeId, quantity }) => ({ roomTypeId, quantity })),
        k,
        guest: values,
      });
    } catch (error) {
      // The router has already followed any redirect. Keeping its error from
      // the redirect boundary keeps this page's state. A redirect to the
      // Booking is a confirmed Booking, so Back refreshes into it; anything
      // else (the Hotel page when Rooms ran out or input was rejected)
      // booked nothing, so Back shows the form again.
      const target = redirectTarget(error);
      if (target?.startsWith("/bookings/")) return;
      if (target !== null) {
        confirming.current = false;
        setPending(false);
        return;
      }
      result = NETWORK_ERROR;
    }
    if (!result || result.ok) return;
    confirming.current = false;
    setPending(false);
    const fieldErrors = result.fieldErrors ? guestErrors(result.fieldErrors) : {};
    if (result.code === "VALIDATION" && Object.keys(fieldErrors).length > 0) {
      showErrors(fieldErrors);
    } else {
      setServerError(result.message);
      requestFocus("alert");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    confirm();
  }

  if (leftAfterConfirm) {
    return (
      <p role="status" className="mt-space-lg text-body-md">
        Opening your booking…
      </p>
    );
  }

  const summaryErrors = FIELD_ORDER.flatMap((field) =>
    errors[field] ? [{ fieldId: GUEST_FIELDS[field].id, message: errors[field] }] : [],
  );
  const label = pending ? "Confirming…" : "Confirm booking";
  const confirmAction = (inBar: boolean) => (
    <button
      type="submit"
      form={FORM_ID}
      disabled={pending}
      className={`${confirmButton} ${inBar ? "min-w-0 px-space-md" : "w-full"}`}
    >
      {label}
    </button>
  );
  const summary = (action: boolean) => (
    <BookingSummary
      hotelName={quote.hotelName}
      stay={quote.stay}
      party={quote.party}
      lines={quote.lines}
      roomCount={quote.roomCount}
      totalRand={quote.totalRand}
      cancellation={cancellation}
      action={action ? <div className="hidden md:block">{confirmAction(false)}</div> : null}
    />
  );

  const text = (field: GuestField, type: string, autoComplete: string) => {
    const { id } = GUEST_FIELDS[field];
    return (
      <FormField id={id} label={GUEST_FIELDS[field].label} error={errors[field]}>
        <input
          id={id}
          name={field}
          type={type}
          autoComplete={autoComplete}
          value={values[field]}
          maxLength={GUEST_LIMITS[field]}
          readOnly={pending}
          onChange={(event) => change(field, event.target.value)}
          onBlur={() => blur(field)}
          className={fieldClassName(errors[field])}
          {...fieldErrorProps(id, errors[field])}
        />
      </FormField>
    );
  };

  return (
    <>
      <div className="mt-space-lg grid grid-cols-1 gap-space-xl lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <form
          id={FORM_ID}
          noValidate
          aria-label="Your details"
          onSubmit={submit}
          className="flex min-w-0 flex-col gap-space-md"
        >
          {serverError && (
            <div
              ref={alertRef}
              tabIndex={-1}
              role="group"
              aria-labelledby="confirm-error-message"
              className="flex flex-col items-start gap-space-md rounded-md border border-error bg-surface p-space-md text-on-surface"
            >
              <p id="confirm-error-message" className="flex items-start gap-space-sm">
                <Icon name="error" className="mt-0.5 shrink-0 text-error" />
                {serverError}
              </p>
              <button type="button" onClick={confirm} disabled={pending} className={secondaryButton}>
                Try again
              </button>
            </div>
          )}
          {showSummary && summaryErrors.length > 0 && (
            <ErrorSummary ref={summaryRef} errors={summaryErrors} />
          )}
          <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
            {text("firstName", "text", "given-name")}
            {text("lastName", "text", "family-name")}
          </div>
          {text("email", "email", "email")}
          <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
            {text("phone", "tel", "tel")}
            <FormField id={GUEST_FIELDS.arrivalTime.id} label={GUEST_FIELDS.arrivalTime.label}>
              <select
                id={GUEST_FIELDS.arrivalTime.id}
                name="arrivalTime"
                value={values.arrivalTime}
                disabled={pending}
                onChange={(event) => change("arrivalTime", event.target.value)}
                className={fieldClassName(undefined)}
              >
                <option value="">{ARRIVAL_NOT_SURE}</option>
                {arrivalTimeOptions(quote.checkInTime).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField
            id={GUEST_FIELDS.specialRequests.id}
            label={GUEST_FIELDS.specialRequests.label}
            error={errors.specialRequests}
          >
            <textarea
              id={GUEST_FIELDS.specialRequests.id}
              name="specialRequests"
              rows={4}
              value={values.specialRequests}
              maxLength={GUEST_LIMITS.specialRequests}
              readOnly={pending}
              onChange={(event) => change("specialRequests", event.target.value)}
              onBlur={() => blur("specialRequests")}
              className={`${fieldClassName(errors.specialRequests)} resize-y`}
              {...fieldErrorProps(GUEST_FIELDS.specialRequests.id, errors.specialRequests)}
            />
          </FormField>
        </form>
        {/* Below 1024px the summary comes first; below 768px the bar holds Confirm booking. */}
        <aside aria-label="Booking summary" className="order-first lg:sticky lg:top-28 lg:order-none">
          <h2 className="sr-only">Booking summary</h2>
          {summary(true)}
        </aside>
      </div>
      <MobileSummaryBar
        roomCount={quote.roomCount}
        totalRand={quote.totalRand}
        action={confirmAction(true)}
        summary={summary(false)}
      />
      <div aria-hidden="true" className="h-24 md:hidden" />
    </>
  );
}
