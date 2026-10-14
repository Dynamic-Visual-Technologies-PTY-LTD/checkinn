/**
 * Guest details on Booking details (FR-21): which fields are required, the
 * message shown on each, and the stored form. Pure. Email is stored and
 * compared trimmed and lowercased (AD-10).
 */

/** What the guest form posts. Values come from the browser, so any may be missing. */
export type GuestInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  arrivalTime?: string;
  specialRequests?: string;
};

/** Valid, trimmed guest details. Optional fields are null when left empty. */
export type GuestDetails = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  arrivalTime: string | null;
  specialRequests: string | null;
};

export type GuestField = keyof GuestInput;

export type GuestValidation =
  | { ok: true; guest: GuestDetails }
  | { ok: false; fieldErrors: Partial<Record<GuestField, string>> };

/** Longest value each field keeps. */
export const GUEST_LIMITS: Record<GuestField, number> = {
  firstName: 100,
  lastName: 100,
  email: 254,
  phone: 30,
  arrivalTime: 50,
  specialRequests: 1000,
};

export const GUEST_MESSAGES = {
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  email: "Enter your email address.",
  emailFormat: "Enter an email address like name@example.com.",
} as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tooLong(field: GuestField): string {
  return `Keep this to ${GUEST_LIMITS[field]} characters or fewer.`;
}

/** Trimmed and lowercased, for storing and comparing (AD-10). */
export function normaliseEmail(value: unknown): string {
  return text(value).toLowerCase();
}

/**
 * The message for an email that fails the rule, or undefined when it passes.
 * Shared by the guest form and the Manage booking lookup. Pass the
 * normalised email.
 */
export function emailError(email: string): string | undefined {
  if (!email) return GUEST_MESSAGES.email;
  if (!EMAIL.test(email)) return GUEST_MESSAGES.emailFormat;
  return undefined;
}

/** Checks every field and returns the stored form, or one message per bad field. */
export function validateGuest(input: GuestInput): GuestValidation {
  const fieldErrors: Partial<Record<GuestField, string>> = {};

  const firstName = text(input.firstName);
  const lastName = text(input.lastName);
  const email = normaliseEmail(input.email);
  if (!firstName) fieldErrors.firstName = GUEST_MESSAGES.firstName;
  if (!lastName) fieldErrors.lastName = GUEST_MESSAGES.lastName;
  const emailProblem = emailError(email);
  if (emailProblem) fieldErrors.email = emailProblem;

  const optional = {
    phone: text(input.phone),
    arrivalTime: text(input.arrivalTime),
    specialRequests: text(input.specialRequests),
  };
  const values: Record<GuestField, string> = { firstName, lastName, email, ...optional };
  for (const field of Object.keys(values) as GuestField[]) {
    if (!fieldErrors[field] && values[field].length > GUEST_LIMITS[field]) {
      fieldErrors[field] = tooLong(field);
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    guest: {
      firstName,
      lastName,
      email,
      phone: optional.phone || null,
      arrivalTime: optional.arrivalTime || null,
      specialRequests: optional.specialRequests || null,
    },
  };
}

/** The arrival time a guest picks when they don't know yet; stored as no time. */
export const ARRIVAL_NOT_SURE = "Not sure yet";

/**
 * The estimated arrival time choices (FR-21): hourly slots from the Hotel's
 * check-in time to midnight, e.g. "14:00 – 15:00" … "23:00 – 00:00". A
 * check-in time between hours starts at its hour.
 */
export function arrivalTimeOptions(checkInTime: string): string[] {
  const first = Number(checkInTime.slice(0, 2));
  if (!Number.isInteger(first) || first < 0 || first > 23) return [];
  const pad = (hour: number) => `${String(hour % 24).padStart(2, "0")}:00`;
  const options: string[] = [];
  for (let hour = first; hour < 24; hour += 1) {
    options.push(`${pad(hour)} – ${pad(hour + 1)}`);
  }
  return options.filter((option) => option.length <= GUEST_LIMITS.arrivalTime);
}
