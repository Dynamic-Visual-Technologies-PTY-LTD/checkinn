/**
 * The `checkinn_access` cookie (AD-15): the access tokens of the Bookings this
 * browser may open, so the guest who just booked sees their Booking without
 * their email in a URL. Pure helpers; the server action reads and sets the
 * cookie.
 */
import { randomBytes } from "node:crypto";

export const ACCESS_COOKIE = "checkinn_access";

/** The cookie holds at most this many tokens; the oldest go first. */
export const MAX_ACCESS_TOKENS = 20;

/** 30 days, in seconds. */
export const ACCESS_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * httpOnly, `SameSite=Lax`, `Path=/`. Not `Secure`: the expo stand serves
 * plain HTTP to visitors' phones (AD-13, AD-15).
 */
export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: false,
  maxAge: ACCESS_COOKIE_MAX_AGE,
} as const;

/** Tokens are base64url, so `.` never appears inside one. */
const SEPARATOR = ".";
const TOKEN = /^[A-Za-z0-9_-]+$/;

/** A new random access token, minted on the server. */
export function mintAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/** The tokens in a cookie value, oldest first. Anything malformed is dropped. */
export function parseAccessTokens(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(SEPARATOR).filter((token) => TOKEN.test(token));
}

/** The token list with `token` added last, unique, capped at the newest 20. */
export function addAccessToken(tokens: readonly string[], token: string): string[] {
  const next = [...tokens.filter((existing) => existing !== token), token];
  return next.slice(-MAX_ACCESS_TOKENS);
}

/** The cookie value for a token list. */
export function serializeAccessTokens(tokens: readonly string[]): string {
  return tokens.join(SEPARATOR);
}

/** Whether a cookie value holds a Booking's token (AD-15). */
export function hasAccessToken(value: string | undefined, token: string): boolean {
  return token !== "" && parseAccessTokens(value).includes(token);
}

/**
 * The `checkinn_booked` cookie: the references this browser confirmed and has
 * not looked up since. It only decides whether `/bookings/[reference]` shows
 * "You're booked!" or the Booking view; it grants nothing, since every
 * Booking still needs its token in `checkinn_access`. A lookup removes only
 * the Booking it found, so it never changes how another Booking's page shows.
 */
export const BOOKED_COOKIE = "checkinn_booked";

/** References are `CI-` plus letters and digits, so `.` never appears inside one. */
const REFERENCE = /^[A-Z0-9-]+$/;

/** The just-booked references in a cookie value, oldest first. Anything malformed is dropped. */
export function parseBookedReferences(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(SEPARATOR).filter((reference) => REFERENCE.test(reference));
}

/** The list with `reference` added last, unique, capped at the newest 20. */
export function addBookedReference(references: readonly string[], reference: string): string[] {
  return addAccessToken(references, reference);
}

/** The list without `reference`. */
export function removeBookedReference(
  references: readonly string[],
  reference: string,
): string[] {
  return references.filter((existing) => existing !== reference);
}

/** Whether a cookie value lists `reference` as just booked. */
export function isBookedReference(value: string | undefined, reference: string): boolean {
  return parseBookedReferences(value).includes(reference);
}
