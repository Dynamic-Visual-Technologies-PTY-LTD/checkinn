import { and, asc, eq } from "drizzle-orm";
import { bookingLines, bookings, hotels, roomTypes } from "@/db/schema";
import type { CatalogWriter } from "@/db/seed";
import { cancellationDeadlineInstant, cancelState } from "@/domain/cancellation";
import type { GuestDetails } from "@/domain/guest";
import { nightsBetween } from "@/domain/dates";
import { generateReference } from "@/domain/reference";
import {
  reserveBlock,
  roomCount,
  selectionTotalRand,
  summaryLines,
  type SelectableRoom,
} from "@/domain/selection";
import type {
  BookingLineView,
  BookingQuote,
  BookingView,
  CancellationPolicy,
  Party,
  RoomSelection,
  Stay,
} from "@/domain/types";
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

/** What a quote or a new Booking is priced from: the Hotel, Stay, Party and lines. */
export type QuoteInput = {
  hotelId: string;
  stay: Stay;
  party: Party;
  lines: RoomSelection[];
};

/**
 * - `no-hotel`: no Hotel has that id.
 * - `invalid`: the lines, the party fit or the Stay are wrong.
 * - `unavailable`: these Room types don't have enough Rooms left.
 * - `ok`: the priced summary.
 */
export type QuoteResult =
  | { kind: "no-hotel" }
  | { kind: "invalid" }
  | { kind: "unavailable"; roomTypeIds: string[] }
  | { kind: "ok"; quote: BookingQuote };

type Priced =
  | { kind: "no-hotel" }
  | { kind: "invalid" }
  | { kind: "ok"; quote: BookingQuote; rooms: SelectableRoom[] };

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

/**
 * Checks and prices a selection from the catalog: every line is one of the
 * Hotel's Room types, the Rooms sleep the Party, and the Stay has Nights.
 * The one pricing path for both `/book` and `createBooking`, so the summary a
 * guest confirms always equals what is stored (AD-9, AD-16). Lines come back
 * in the Hotel's Room type order.
 */
function priceSelection(db: CatalogWriter, input: QuoteInput): Priced {
  const hotel = db
    .select({
      name: hotels.name,
      checkInTime: hotels.checkInTime,
      policies: hotels.policies,
    })
    .from(hotels)
    .where(eq(hotels.id, input.hotelId))
    .get();
  if (!hotel) return { kind: "no-hotel" };

  const rooms = hotelRooms(db, input.hotelId);
  if (!linesAreValid(input.lines, rooms)) return { kind: "invalid" };
  const guests = input.party.adults + input.party.children;
  if (reserveBlock(input.lines, rooms, guests)) return { kind: "invalid" };
  const nights = nightsBetween(input.stay.checkIn, input.stay.checkOut);
  if (nights < 1) return { kind: "invalid" };

  const lines: BookingLineView[] = summaryLines(input.lines, rooms, nights);
  return {
    kind: "ok",
    rooms,
    quote: {
      hotelId: input.hotelId,
      hotelName: hotel.name,
      checkInTime: hotel.checkInTime,
      cancellationPolicy: hotel.policies.cancellation.type as CancellationPolicy,
      stay: input.stay,
      party: input.party,
      lines,
      roomCount: roomCount(lines),
      totalRand: selectionTotalRand(lines),
    },
  };
}

/** The Room types in `lines` that ask for more Rooms than are left (AD-4). */
function ranOutRoomTypes(
  db: CatalogWriter,
  input: QuoteInput,
  rooms: readonly SelectableRoom[],
): string[] {
  const availability = availabilityFor(db, input.hotelId, input.stay);
  return rooms
    .filter((room) => {
      const line = input.lines.find((candidate) => candidate.roomTypeId === room.id);
      return line !== undefined && line.quantity > (availability.get(room.id) ?? 0);
    })
    .map((room) => room.id);
}

/**
 * The Booking details summary for a selection (FR-21), checked as confirm
 * checks it: the Hotel, the lines, the party fit, then Availability.
 */
export function bookingQuote(db: CatalogWriter, input: QuoteInput): QuoteResult {
  const priced = priceSelection(db, input);
  if (priced.kind !== "ok") return priced;
  const ranOut = ranOutRoomTypes(db, input, priced.rooms);
  if (ranOut.length > 0) return { kind: "unavailable", roomTypeIds: ranOut };
  return { kind: "ok", quote: priced.quote };
}

export type CreateBookingInput = QuoteInput & {
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
 * Prices and the Cancellation policy come from the catalog, never the caller,
 * through the same pricing as `bookingQuote`.
 */
export function createBooking(db: CatalogWriter, input: CreateBookingInput): CreateBookingResult {
  return db.transaction(
    (tx): CreateBookingResult => {
      const existing = bookingByKey(tx, input.idempotencyKey);
      if (existing) return { kind: "existing", ...existing };

      const priced = priceSelection(tx, input);
      if (priced.kind !== "ok") return { kind: "invalid" };
      const { quote, rooms } = priced;

      const ranOut = ranOutRoomTypes(tx, input, rooms);
      if (ranOut.length > 0) return { kind: "unavailable", roomTypeIds: ranOut };

      const policy = quote.cancellationPolicy;
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
          bookingTotalRand: quote.totalRand,
          cancellationPolicy: policy,
          cancellationDeadline:
            policy === "non_refundable"
              ? null
              : cancellationDeadlineInstant(input.stay.checkIn, quote.checkInTime),
          createdAt: input.now,
        })
        .returning({ id: bookings.id })
        .get();

      tx.insert(bookingLines)
        .values(
          quote.lines.map((line) => ({
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

/** A Booking's view, its internal id and the token that opens it (AD-15). */
export type BookingRecord = {
  /** The internal primary key; never shown or put in a URL. */
  id: number;
  booking: BookingView;
  accessToken: string;
};

/**
 * A Booking by its stored reference, read from its snapshot only (AD-16):
 * the stored Stay, Party, line prices, total and Cancellation policy. Only
 * the Hotel and Room type names are read from the catalog. Lines are in the
 * Hotel's Room type order. Null for an unknown reference; the caller passes
 * a normalised reference (AD-10).
 */
export function bookingByReference(db: CatalogWriter, reference: string): BookingRecord | null {
  const row = db
    .select({ booking: bookings, hotelName: hotels.name })
    .from(bookings)
    .innerJoin(hotels, eq(hotels.id, bookings.hotelId))
    .where(eq(bookings.reference, reference))
    .get();
  if (!row) return null;
  const { booking } = row;

  const lines = db
    .select({
      roomTypeId: bookingLines.roomTypeId,
      name: roomTypes.name,
      quantity: bookingLines.quantity,
      lineTotalRand: bookingLines.lineTotalRand,
    })
    .from(bookingLines)
    .innerJoin(roomTypes, eq(roomTypes.id, bookingLines.roomTypeId))
    .where(eq(bookingLines.bookingId, booking.id))
    .orderBy(asc(roomTypes.position))
    .all();

  return {
    id: booking.id,
    accessToken: booking.accessToken,
    booking: {
      reference: booking.reference,
      hotelId: booking.hotelId,
      hotelName: row.hotelName,
      status: booking.status,
      stay: { checkIn: booking.checkIn, checkOut: booking.checkOut },
      party: { adults: booking.adults, children: booking.children, rooms: booking.rooms },
      guestName: `${booking.firstName} ${booking.lastName}`,
      lines,
      roomCount: roomCount(lines),
      bookingTotalRand: booking.bookingTotalRand,
      cancellationPolicy: booking.cancellationPolicy as CancellationPolicy,
      cancellationDeadline: booking.cancellationDeadline,
      cancelledAt: booking.cancelledAt,
    },
  };
}

/** What a successful Manage booking lookup grants (AD-15). */
export type LookedUpBooking = {
  reference: string;
  accessToken: string;
};

/**
 * The Booking with this reference and this email, or null (FR-23). Both are
 * passed normalised (AD-10): the reference uppercase with `CI-`, the email
 * trimmed and lowercased. A wrong reference and a right reference with
 * another email both give null, so the caller can't tell them apart.
 */
export function bookingByLookup(
  db: CatalogWriter,
  reference: string,
  email: string,
): LookedUpBooking | null {
  return (
    db
      .select({ reference: bookings.reference, accessToken: bookings.accessToken })
      .from(bookings)
      .where(and(eq(bookings.reference, reference), eq(bookings.email, email)))
      .get() ?? null
  );
}

/**
 * - `cancelled`: the Booking is now Cancelled.
 * - `not-found`: no Booking has that id.
 * - `already-cancelled`, `non-refundable`, `deadline-passed`: nothing changed.
 */
export type CancelBookingResult =
  | { kind: "cancelled" }
  | { kind: "not-found" }
  | { kind: "already-cancelled" }
  | { kind: "non-refundable" }
  | { kind: "deadline-passed" };

/**
 * Cancels a Booking in one immediate, synchronous transaction (AD-3, FR-24).
 * It re-reads the snapshot's status, Cancellation policy and stored deadline
 * and checks them against `now` (an ISO UTC instant from `src/domain/clock.ts`)
 * with `cancelState`, then sets `status` and `cancelled_at`. Nothing else is
 * written: Availability counts only Confirmed lines (AD-4), so the Rooms are
 * free again.
 */
export function cancelBooking(db: CatalogWriter, id: number, now: string): CancelBookingResult {
  return db.transaction(
    (tx): CancelBookingResult => {
      const row = tx
        .select({
          status: bookings.status,
          cancellationPolicy: bookings.cancellationPolicy,
          cancellationDeadline: bookings.cancellationDeadline,
        })
        .from(bookings)
        .where(eq(bookings.id, id))
        .get();
      if (!row) return { kind: "not-found" };

      const state = cancelState(
        {
          status: row.status,
          cancellationPolicy: row.cancellationPolicy as CancellationPolicy,
          cancellationDeadline: row.cancellationDeadline,
        },
        now,
      );
      switch (state) {
        case "cancelled":
          return { kind: "already-cancelled" };
        case "non-refundable":
          return { kind: "non-refundable" };
        case "deadline-passed":
          return { kind: "deadline-passed" };
        case "open":
          tx.update(bookings)
            .set({ status: "cancelled", cancelledAt: now })
            .where(and(eq(bookings.id, id), eq(bookings.status, "confirmed")))
            .run();
          return { kind: "cancelled" };
      }
    },
    { behavior: "immediate" },
  );
}
