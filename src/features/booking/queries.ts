import "server-only";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { normaliseReference } from "@/domain/reference";
import type { BookingView, Party, RoomSelection, Stay } from "@/domain/types";
import { ACCESS_COOKIE, hasAccessToken } from "@/features/booking/access";
import {
  bookingByKey,
  bookingByReference,
  bookingQuote,
  hotelRooms,
  type QuoteResult,
} from "@/features/booking/booking.repo";

/**
 * Request-time Booking reads for the booking pages (AD-2). Each calls
 * `await io()` before touching the database. A Booking is shown only to a
 * browser whose `checkinn_access` cookie holds its token (AD-15).
 */

/** Whether this browser's access cookie holds `token`. */
async function holdsToken(token: string): Promise<boolean> {
  const store = await cookies();
  return hasAccessToken(store.get(ACCESS_COOKIE)?.value, token);
}

/**
 * The confirmed Booking for a reference, as typed in the URL, when this
 * browser holds its token. Null for an unknown reference or no token: the
 * caller can't tell them apart, so a reference alone reveals nothing.
 */
export async function getBooking(reference: string): Promise<BookingView | null> {
  await io();
  const record = bookingByReference(getDb(), normaliseReference(reference));
  if (!record || !(await holdsToken(record.accessToken))) return null;
  return record.booking;
}

/**
 * The Booking that already used an idempotency key (AD-10), or null when the
 * key is unused. With this browser's token it comes with its view; without,
 * only the fact that the key was used.
 */
export type UsedKey = { access: true; booking: BookingView } | { access: false };

export async function getBookingByKey(key: string): Promise<UsedKey | null> {
  await io();
  const db = getDb();
  const used = bookingByKey(db, key);
  if (!used) return null;
  if (!(await holdsToken(used.accessToken))) return { access: false };
  const record = bookingByReference(db, used.reference);
  return record ? { access: true, booking: record.booking } : { access: false };
}

/**
 * The Booking details summary (FR-21), priced and checked as confirm checks
 * it. Without a Stay or a selection there is nothing to price: `no-hotel`
 * for an unknown Hotel, `invalid` otherwise.
 */
export async function getBookingQuote(input: {
  hotelId: string;
  stay: Stay | null;
  party: Party;
  sel: RoomSelection[] | null;
}): Promise<QuoteResult> {
  await io();
  const db = getDb();
  if (!input.stay || !input.sel) {
    return hotelRooms(db, input.hotelId).length === 0 ? { kind: "no-hotel" } : { kind: "invalid" };
  }
  return bookingQuote(db, {
    hotelId: input.hotelId,
    stay: input.stay,
    party: input.party,
    lines: input.sel,
  });
}
