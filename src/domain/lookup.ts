/**
 * The Manage booking lookup (FR-23, EXPERIENCE.md Manage booking form): a
 * Booking reference and the email it was booked with. Pure. One rule set for
 * the form and the server action, as for the guest form.
 */
import { emailError, GUEST_LIMITS, normaliseEmail } from "@/domain/guest";
import { normaliseReference } from "@/domain/reference";

/** What the lookup form posts. Values come from the browser, so any may be missing. */
export type LookupInput = {
  reference?: string;
  email?: string;
};

export type LookupField = keyof LookupInput;

/** Longest value each field keeps. */
export const LOOKUP_LIMITS: Record<LookupField, number> = {
  reference: 20,
  email: GUEST_LIMITS.email,
};

export const LOOKUP_MESSAGES = {
  reference: "Enter your booking reference.",
  referenceTooLong: `Keep this to ${LOOKUP_LIMITS.reference} characters or fewer.`,
  emailTooLong: `Keep this to ${LOOKUP_LIMITS.email} characters or fewer.`,
} as const;

/**
 * The same for a wrong reference and for a right reference with another
 * email, so the lookup reveals nothing (FR-23).
 */
export const NOT_FOUND_MESSAGE = "We couldn't find that booking. Check the reference and email.";

export type LookupValidation =
  | { ok: true; reference: string; email: string }
  | { ok: false; fieldErrors: Partial<Record<LookupField, string>> };

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Checks both fields. On success the reference is normalised (`CI-` added,
 * uppercased) and the email trimmed and lowercased (AD-10). The reference's
 * format is not checked here: a reference that matches no Booking is "not
 * found", like any other.
 */
export function validateLookup(input: LookupInput): LookupValidation {
  const fieldErrors: Partial<Record<LookupField, string>> = {};
  const reference = text(input.reference);
  const email = normaliseEmail(input.email);

  if (!reference) fieldErrors.reference = LOOKUP_MESSAGES.reference;
  else if (reference.length > LOOKUP_LIMITS.reference) {
    fieldErrors.reference = LOOKUP_MESSAGES.referenceTooLong;
  }
  const emailProblem = emailError(email);
  if (emailProblem) fieldErrors.email = emailProblem;
  else if (email.length > LOOKUP_LIMITS.email) fieldErrors.email = LOOKUP_MESSAGES.emailTooLong;

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true, reference: normaliseReference(reference), email };
}

/**
 * The reference `/manage?reference=…` fills in: normalised, then cut to the
 * field's length limit, so it always passes the form's own rule. Empty when
 * the URL has none.
 */
export function prefilledReference(value: string | undefined): string {
  if (!value?.trim()) return "";
  return normaliseReference(value).slice(0, LOOKUP_LIMITS.reference);
}
