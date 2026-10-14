import { asc, eq } from "drizzle-orm";
import { bookingLines, bookings, hotels, roomTypes } from "@/db/schema";
import type { CatalogWriter } from "@/db/seed";
import { cancellationDeadlineInstant } from "@/domain/cancellation";
import type { GuestDetails } from "@/domain/guest";
import { nightsBetween } from "@/domain/dates";
import { generateReference } from "@/domain/reference";
import {
  reserveBlock,
  selectionTotalRand,
  summaryLines,
  type SelectableRoom,
} from "@/domain/selection";
import type { CancellationPolicy, Party, RoomSelection, Stay } from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";

/**
 * Booking reads and writes (AD-3, AD-5). Only `src/features/booking/actions.ts`
 * calls the writes. Every function is synchronous and takes a database or a
 * transaction, so the create runs as one transaction with no `await` inside.
 */

/**
 * A Hotel's Room types with what the selection rules need, in seed order.
 * Empty for an unknown Hotel.
 */
export function hotelRooms(db: CatalogWriter, hotelId: string): SelectableRoom[] {
  return db
    .select({
      id: roomTypes.id,
      name: roomTypes.name,
      maxGuests: roomTypes.maxGuests,
      nightlyRand: roomTypes.pricePerNightRand,
    })
    .from(roomTypes)
    .where(eq(roomTypes.hotelId, hotelId))
    .orderBy(asc(roomTypes.position))
    .all();
}

/** What the confirm action needs to know about a Booking found by key. */
export type BookingByKey = {
  reference: string;
  accessToken: string;
  /** Trimmed and lowercased (AD-10). */
  email: string;
};

/** The Booking that used an idempotency key, or null (AD-10). */
export function bookingByKey(db: CatalogWriter, idempotencyKey: string): BookingByKey | null {
  return (
    db
      .select({
        reference: bookings.reference,
        accessToken: bookings.accessToken,
        email: bookings.email,
      })
      .from(bookings)
      .where(eq(bookings.idempotencyKey, idempotencyKey))
      .get() ?? null
  );
}

export type CreateBookingInput = {
  hotelId: string;
  stay: Stay;
  party: Party;
  lines: RoomSelection[];
  /** Already validated and normalised (`validateGuest`). */
  guest: GuestDetails;
  idempotencyKey: string;
  /** Minted on the server (AD-15). */
  accessToken: string;
  /** `createdAt`, an ISO UTC instant. */
  now: string;
  /** Reference source, injectable for tests. Called again on a collision. */
  newReference?: () => string;
};

/**
 * - `created`: the Booking was inserted.
 * - `existing`: the key was already used; nothing was inserted.
 * - `unavailable`: these Room types no longer have enough Rooms; nothing was inserted.
 * - `invalid`: the Hotel, lines or party fit are wrong; nothing was inserted.
 */
export type CreateBookingResult =
  | { kind: "created"; reference: string; accessToken: string }
  | ({ kind: "existing" } & BookingByKey)
  | { kind: "unavailable"; roomTypeIds: string[] }
  | { kind: "invalid" };

const MAX_REFERENCE_TRIES = 20;

function linesAreValid(lines: readonly RoomSelection[], rooms: readonly SelectableRoom[]): boolean {
  if (lines.length === 0) return false;
  const seen = new Set<string>();
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return false;
    if (seen.has(line.roomTypeId)) return false;
    if (!rooms.some((room) => room.id === line.roomTypeId)) return false;
    seen.add(line.roomTypeId);
  }
  return true;
}

function unusedReference(tx: CatalogWriter, newReference: () => string): string {
  for (let i = 0; i < MAX_REFERENCE_TRIES; i += 1) {
    const reference = newReference();
    const taken = tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.reference, reference))
      .get();
    if (!taken) return reference;
  }
  throw new Error("No unused Booking reference");
}

/**
 * Confirms a Booking in one immediate, synchronous transaction (AD-3, AD-10,
 * AD-16). The idempotency key is looked up first, so a repeat returns the
 * first Booking even after its Rooms sold out. Then every line is re-checked
 * against the Hotel's Room types, `availabilityFor` and the party fit, and
 * only if all fit are the Booking, its lines and its snapshot inserted.
 * Prices and the Cancellation policy come from the catalog, never the caller.
 */
export function createBooking(db: CatalogWriter, input: CreateBookingInput): CreateBookingResult {
  return db.transaction(
    (tx): CreateBookingResult => {
      const existing = bookingByKey(tx, input.idempotencyKey);
      if (existing) return { kind: "existing", ...existing };

      const hotel = tx
        .select({ checkInTime: hotels.checkInTime, policies: hotels.policies })
        .from(hotels)
        .where(eq(hotels.id, input.hotelId))
        .get();
      if (!hotel) return { kind: "invalid" };

      const rooms = hotelRooms(tx, input.hotelId);
      if (!linesAreValid(input.lines, rooms)) return { kind: "invalid" };
      const guests = input.party.adults + input.party.children;
      if (reserveBlock(input.lines, rooms, guests)) return { kind: "invalid" };
      const nights = nightsBetween(input.stay.checkIn, input.stay.checkOut);
      if (nights < 1) return { kind: "invalid" };

      const availability = availabilityFor(tx, input.hotelId, input.stay);
      const ranOut = rooms
        .filter((room) => {
          const line = input.lines.find((candidate) => candidate.roomTypeId === room.id);
          return line !== undefined && line.quantity > (availability.get(room.id) ?? 0);
        })
        .map((room) => room.id);
      if (ranOut.length > 0) return { kind: "unavailable", roomTypeIds: ranOut };

      const lines = summaryLines(input.lines, rooms, nights);
      const policy = hotel.policies.cancellation.type as CancellationPolicy;
      const reference = unusedReference(tx, input.newReference ?? generateReference);

      const row = tx
        .insert(bookings)
        .values({
          reference,
          idempotencyKey: input.idempotencyKey,
          accessToken: input.accessToken,
          hotelId: input.hotelId,
          status: "confirmed",
          checkIn: input.stay.checkIn,
          checkOut: input.stay.checkOut,
          adults: input.party.adults,
          children: input.party.children,
          rooms: input.party.rooms,
          firstName: input.guest.firstName,
          lastName: input.guest.lastName,
          email: input.guest.email,
          phone: input.guest.phone,
          arrivalTime: input.guest.arrivalTime,
          specialRequests: input.guest.specialRequests,
          bookingTotalRand: selectionTotalRand(lines),
          cancellationPolicy: policy,
          cancellationDeadline:
            policy === "non_refundable"
              ? null
              : cancellationDeadlineInstant(input.stay.checkIn, hotel.checkInTime),
          createdAt: input.now,
        })
        .returning({ id: bookings.id })
        .get();

      tx.insert(bookingLines)
        .values(
          lines.map((line) => ({
            bookingId: row.id,
            roomTypeId: line.roomTypeId,
            quantity: line.quantity,
            unitPriceRand: rooms.find((room) => room.id === line.roomTypeId)?.nightlyRand ?? 0,
            lineTotalRand: line.lineTotalRand,
          })),
        )
        .run();

      return { kind: "created", reference, accessToken: input.accessToken };
    },
    { behavior: "immediate" },
  );
}
