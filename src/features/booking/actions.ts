"use server";
import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type Db, getDb } from "@/db/client";
import { nowIso, todayIn } from "@/domain/clock";
import { hotelHref, parseCriteria, serializeCriteria } from "@/domain/criteria";
import { type GuestInput, normaliseEmail, validateGuest } from "@/domain/guest";
import { bookingPath } from "@/domain/reference";
import { clampSelection, reserveBlock, type SelectableRoom } from "@/domain/selection";
import type { ActionResult, Party, RoomSelection, SearchCriteria, Stay } from "@/domain/types";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  addAccessToken,
  mintAccessToken,
  parseAccessTokens,
  serializeAccessTokens,
} from "@/features/booking/access";
import {
  type BookingByKey,
  bookingByKey,
  createBooking,
  hotelRooms,
} from "@/features/booking/booking.repo";
import { availabilityFor } from "@/features/hotels/availability.repo";

export type StartBookingInput = {
  hotelId: string;
  q: string;
  stay: Stay | null;
  party: Party;
  sel: RoomSelection[];
};

export type ConfirmBookingInput = StartBookingInput & {
  /** The idempotency key from the `/book` URL (AD-10). */
  k: string;
  guest: GuestInput;
};

const SERVER_ERROR: ActionResult = {
  ok: false,
  code: "SERVER_ERROR",
  message: "Something went wrong on our side. Try again.",
};

function invalid(message: string): ActionResult {
  return { ok: false, code: "VALIDATION", message };
}

/**
 * Logs an unexpected error with no personal data (Consistency Conventions:
 * Logging): only the error's name and code. Drizzle messages carry the
 * query's parameters, which can hold a name, email or token.
 */
function logFailure(action: string, error: unknown) {
  const name = error instanceof Error ? error.name : "unknown";
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
  console.error(`${action} failed`, code ? `${name} ${code}` : name);
}

/**
 * Re-parses the client's criteria through the codec (AD-8): client values
 * are never trusted as they are.
 */
function reparse(input: StartBookingInput) {
  const params = new URLSearchParams(
    serializeCriteria({
      q: input.q,
      stay: input.stay,
      party: input.party,
      sel: input.sel,
    }),
  );
  return parseCriteria(params, todayIn(), { defaultStay: false });
}

/**
 * The Hotel's Room types when every line of the selection is one of them;
 * otherwise why not. Shared by Reserve and Confirm booking.
 */
function hotelSelection(
  db: Db,
  hotelId: string,
  sel: readonly RoomSelection[],
): { ok: true; rooms: SelectableRoom[] } | { ok: false; message: string } {
  const rooms = hotelRooms(db, hotelId);
  if (rooms.length === 0) return { ok: false, message: "We can't find that hotel." };
  if (sel.some((line) => !rooms.some((room) => room.id === line.roomTypeId))) {
    return { ok: false, message: "Pick rooms from this hotel." };
  }
  return { ok: true, rooms };
}

/**
 * Reserve (AD-10, FR-18): re-parses the criteria with the codec, checks the
 * selection against the Hotel's Room types, Availability and party fit, mints
 * the idempotency key and redirects to `/book`. Expected failures return an
 * `ActionResult`; success never returns.
 */
export async function startBooking(input: StartBookingInput): Promise<ActionResult> {
  let target: string;
  try {
    const { criteria, problems } = reparse(input);

    if (problems.includes("sel-invalid") || !criteria.sel || criteria.sel.length === 0) {
      return invalid("Select at least one room.");
    }
    if (!criteria.stay) return invalid("Select dates to reserve a room.");

    const db = getDb();
    const owned = hotelSelection(db, input.hotelId, criteria.sel);
    if (!owned.ok) return invalid(owned.message);
    const { rooms } = owned;

    const { lowered } = clampSelection(
      criteria.sel,
      rooms,
      availabilityFor(db, input.hotelId, criteria.stay),
    );
    if (lowered.length > 0) {
      return invalid("Some of those rooms are no longer available. Pick another room.");
    }

    const guests = criteria.party.adults + criteria.party.children;
    const block = reserveBlock(criteria.sel, rooms, guests);
    if (block) return invalid(block.message);

    target = `/book?${serializeCriteria({
      q: criteria.q,
      stay: criteria.stay,
      party: criteria.party,
      hotel: input.hotelId,
      sel: criteria.sel,
      k: randomUUID(),
    })}`;
  } catch (error) {
    logFailure("startBooking", error);
    return SERVER_ERROR;
  }
  // Outside the try: redirect() works by throwing.
  redirect(target);
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

/** Adds a Booking's token to the access cookie (AD-15). */
function grantAccess(store: CookieStore, held: readonly string[], token: string) {
  store.set(
    ACCESS_COOKIE,
    serializeAccessTokens(addAccessToken(held, token)),
    ACCESS_COOKIE_OPTIONS,
  );
}

/**
 * A key that already has a Booking (AD-10). The guest gets its token only
 * when they typed the Booking's email or already hold the token, so a `/book`
 * URL from history or a shared link is not a credential. Either way they go
 * to the Booking URL; without a token it asks them to look the Booking up.
 */
function existingTarget(
  store: CookieStore,
  held: readonly string[],
  booking: BookingByKey,
  submittedEmail: unknown,
): string {
  const email = normaliseEmail(submittedEmail);
  if ((email !== "" && email === booking.email) || held.includes(booking.accessToken)) {
    grantAccess(store, held, booking.accessToken);
  }
  return bookingPath(booking.reference);
}

/** Where confirming leads, or the failure to show on the form. */
async function confirmTarget(input: ConfirmBookingInput): Promise<string | ActionResult> {
  const { criteria, problems } = reparse(input);
  const kept: Partial<SearchCriteria> = {
    q: criteria.q,
    stay: criteria.stay,
    party: criteria.party,
  };
  const hotelPage = hotelHref(input.hotelId, kept);

  const key = typeof input.k === "string" ? input.k.trim() : "";
  if (!key) return hotelPage;

  const db = getDb();
  const store = await cookies();
  const held = parseAccessTokens(store.get(ACCESS_COOKIE)?.value);
  const submittedEmail = input.guest?.email;

  // A refresh or a second click finds the first Booking before anything else.
  const existing = bookingByKey(db, key);
  if (existing) return existingTarget(store, held, existing, submittedEmail);

  const guest = validateGuest(input.guest ?? {});
  if (!guest.ok) {
    return {
      ok: false,
      code: "VALIDATION",
      fieldErrors: guest.fieldErrors,
      message: "Check your details and try again.",
    };
  }

  // Tampered or stale input goes back to the room table.
  if (!criteria.stay || problems.includes("sel-invalid") || !criteria.sel?.length) {
    return hotelPage;
  }
  if (!hotelSelection(db, input.hotelId, criteria.sel).ok) return hotelPage;

  const result = createBooking(db, {
    hotelId: input.hotelId,
    stay: criteria.stay,
    party: criteria.party,
    lines: criteria.sel,
    guest: guest.guest,
    idempotencyKey: key,
    accessToken: mintAccessToken(),
    now: nowIso(),
  });

  switch (result.kind) {
    case "created":
      grantAccess(store, held, result.accessToken);
      return bookingPath(result.reference);
    case "existing":
      return existingTarget(store, held, result, submittedEmail);
    case "unavailable":
      return hotelHref(input.hotelId, {
        ...kept,
        sel: criteria.sel,
        notice: { type: "room-unavailable", roomTypeIds: result.roomTypeIds },
      });
    case "invalid":
      return hotelPage;
  }
}

/**
 * Confirm booking (AD-3, AD-10, AD-15, FR-22): validates the guest, creates
 * the Booking in one transaction, adds its access token to the cookie and
 * redirects to `/bookings/<reference>`. A Room type that ran out returns the
 * guest to the room table with `notice=room-unavailable`. Guest field errors
 * and server errors return an `ActionResult`, so the form keeps its values.
 */
export async function confirmBooking(input: ConfirmBookingInput): Promise<ActionResult> {
  let target: string;
  try {
    const outcome = await confirmTarget(input);
    if (typeof outcome !== "string") return outcome;
    target = outcome;
  } catch (error) {
    logFailure("confirmBooking", error);
    return SERVER_ERROR;
  }
  // After the transaction has committed, outside the try (AD-3).
  redirect(target);
}
