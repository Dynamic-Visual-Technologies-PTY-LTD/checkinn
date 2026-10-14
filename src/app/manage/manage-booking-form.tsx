"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  primaryButton,
  primaryButtonDisabled,
  secondaryButton,
} from "@/components/button-styles";
import { ErrorSummary } from "@/components/error-summary";
import { fieldClassName, fieldErrorProps, FormField } from "@/components/form-field";
import { Icon } from "@/components/icons/icons";
import { NETWORK_ERROR, redirectTarget } from "@/components/server-action";
import { LOOKUP_LIMITS, type LookupField, validateLookup } from "@/domain/lookup";
import type { ActionResult } from "@/domain/types";
import { findBooking } from "@/features/booking/actions";

/** Each field's id and visible label, in form order. */
export const LOOKUP_FIELDS: Record<LookupField, { id: string; label: string }> = {
  reference: { id: "manage-reference", label: "Booking reference" },
  email: { id: "manage-email", label: "Email" },
};

const FIELD_ORDER = Object.keys(LOOKUP_FIELDS) as LookupField[];

type Values = Record<LookupField, string>;
type Errors = Partial<Record<LookupField, string>>;

/** Only the fields `validateLookup` names, so a stray server key is ignored. */
function lookupErrors(fieldErrors: Record<string, string>): Errors {
  const errors: Errors = {};
  for (const field of FIELD_ORDER) {
    if (fieldErrors[field]) errors[field] = fieldErrors[field];
  }
  return errors;
}

/** A failed lookup: not found, or a server error the guest can try again. */
type Alert = { message: string; retry: boolean };

/**
 * The Manage booking form (FR-23, EXPERIENCE.md Manage booking form): the
 * Booking reference (any case, `CI-` optional) and the email. It validates
 * like the guest form: each field on blur and the form on submit, with the
 * error summary taking focus and each message tied to its field. Find
 * booking calls `findBooking`, which redirects to the Booking on a match;
 * while it runs the button reads "Finding…" and is disabled. A Booking that
 * isn't found shows one message, whichever field was wrong, keeps what the
 * guest typed and takes focus.
 */
export function ManageBookingForm({ initialReference }: { initialReference: string }) {
  const [values, setValues] = useState<Values>({ reference: initialReference, email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [showSummary, setShowSummary] = useState(false);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [pending, setPending] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ target: "summary" | "alert"; id: number }>();
  const finding = useRef(false);
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

  function requestFocus(target: "summary" | "alert") {
    focusCount.current += 1;
    setFocusRequest({ target, id: focusCount.current });
  }

  function change(field: LookupField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  /** Re-checks one field when the guest leaves it. */
  function blur(field: LookupField) {
    const result = validateLookup(values);
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
    setAlert(null);
    requestFocus("summary");
  }

  function find() {
    // A second press before the first re-render sends nothing more.
    if (finding.current) return;
    const checked = validateLookup(values);
    if (!checked.ok) {
      showErrors(checked.fieldErrors);
      return;
    }
    setErrors({});
    setShowSummary(false);
    setAlert(null);
    finding.current = true;
    setPending(true);
    void send();
  }

  async function send() {
    let result: ActionResult | undefined;
    try {
      result = await findBooking({ reference: values.reference, email: values.email });
    } catch (error) {
      // The router has already followed the redirect to the Booking. Back
      // then shows this form again, ready to use.
      if (redirectTarget(error) !== null) {
        finding.current = false;
        setPending(false);
        return;
      }
      result = NETWORK_ERROR;
    }
    finding.current = false;
    setPending(false);
    if (!result || result.ok) return;
    const fieldErrors = result.fieldErrors ? lookupErrors(result.fieldErrors) : {};
    if (result.code === "VALIDATION" && Object.keys(fieldErrors).length > 0) {
      showErrors(fieldErrors);
      return;
    }
    setAlert({ message: result.message, retry: result.code === "SERVER_ERROR" });
    requestFocus("alert");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    find();
  }

  const summaryErrors = FIELD_ORDER.flatMap((field) =>
    errors[field] ? [{ fieldId: LOOKUP_FIELDS[field].id, message: errors[field] }] : [],
  );

  const input = (
    field: LookupField,
    props: { type: string; autoComplete: string; autoCapitalize?: string },
  ) => {
    const { id, label } = LOOKUP_FIELDS[field];
    return (
      <FormField id={id} label={label} error={errors[field]}>
        <input
          id={id}
          name={field}
          {...props}
          spellCheck={false}
          value={values[field]}
          maxLength={LOOKUP_LIMITS[field]}
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
    <form
      noValidate
      aria-label="Find your booking"
      onSubmit={submit}
      className="flex flex-col gap-space-md"
    >
      {alert && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="manage-alert-message"
          className="flex flex-col items-start gap-space-md rounded-md border border-error bg-surface p-space-md text-on-surface"
        >
          <p id="manage-alert-message" className="flex items-start gap-space-sm">
            <Icon name="error" className="mt-0.5 shrink-0 text-error" />
            {alert.message}
          </p>
          {alert.retry && (
            <button type="button" onClick={find} disabled={pending} className={secondaryButton}>
              Try again
            </button>
          )}
        </div>
      )}
      {showSummary && summaryErrors.length > 0 && (
        <ErrorSummary ref={summaryRef} errors={summaryErrors} />
      )}
      {input("reference", { type: "text", autoComplete: "off", autoCapitalize: "characters" })}
      {input("email", { type: "email", autoComplete: "email" })}
      <div>
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButton} ${primaryButtonDisabled} w-full sm:w-auto`}
        >
          {pending ? "Finding…" : "Find booking"}
        </button>
      </div>
    </form>
  );
}
