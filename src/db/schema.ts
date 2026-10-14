import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Catalog tables (AD-5). Only `src/db/seed.ts` writes them. Ids are the seed
 * ids (AD-6). Arrays and nested objects are JSON text columns.
 */

export type Bed = { type: string; count: number };

export type HotelPolicies = {
  childrenAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  cancellation: { type: string };
};

export const cities = sqliteTable("cities", {
  id: text("id").primaryKey(),
  /** Position in the seed file, so Cities list in seed order. */
  sortOrder: integer("sort_order").notNull(),
  name: text("name").notNull(),
  aliases: text("aliases", { mode: "json" }).$type<string[]>().notNull(),
  province: text("province").notNull(),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  imageAlt: text("image_alt").notNull(),
  imageSourceUrl: text("image_source_url").notNull(),
  imageCreditInstructions: text("image_credit_instructions").notNull(),
  imageIsIllustrative: integer("image_is_illustrative", {
    mode: "boolean",
  }).notNull(),
});

export const hotels = sqliteTable(
  "hotels",
  {
    id: text("id").primaryKey(),
    cityId: text("city_id")
      .notNull()
      .references(() => cities.id),
    name: text("name").notNull(),
    isFictional: integer("is_fictional", { mode: "boolean" }).notNull(),
    area: text("area").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    starRating: integer("star_rating").notNull(),
    reviewScore: real("review_score").notNull(),
    reviewScoreMax: real("review_score_max").notNull(),
    reviewCount: integer("review_count").notNull(),
    currency: text("currency").notNull(),
    priceFromPerNightRand: integer("price_from_per_night_rand").notNull(),
    amenities: text("amenities", { mode: "json" }).$type<string[]>().notNull(),
    checkInTime: text("check_in_time").notNull(),
    checkOutTime: text("check_out_time").notNull(),
    timeZone: text("time_zone").notNull(),
    policies: text("policies", { mode: "json" })
      .$type<HotelPolicies>()
      .notNull(),
  },
  (table) => [index("hotels_city_id_idx").on(table.cityId)],
);

export const hotelImages = sqliteTable(
  "hotel_images",
  {
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotels.id),
    /** Position in the hotel's seed `images` array, from 0. */
    position: integer("position").notNull(),
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    provider: text("provider").notNull(),
    isIllustrative: integer("is_illustrative", { mode: "boolean" }).notNull(),
    sourceUrl: text("source_url").notNull(),
    licenseUrl: text("license_url").notNull(),
  },
  (table) => [primaryKey({ columns: [table.hotelId, table.position] })],
);

export const roomTypes = sqliteTable(
  "room_types",
  {
    id: text("id").primaryKey(),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotels.id),
    /** Position in the hotel's seed `roomTypes` array, from 0. */
    position: integer("position").notNull(),
    name: text("name").notNull(),
    maxGuests: integer("max_guests").notNull(),
    beds: text("beds", { mode: "json" }).$type<Bed[]>().notNull(),
    pricePerNightRand: integer("price_per_night_rand").notNull(),
    totalRooms: integer("total_rooms").notNull(),
    amenities: text("amenities", { mode: "json" }).$type<string[]>().notNull(),
  },
  (table) => [index("room_types_hotel_id_idx").on(table.hotelId)],
);

/**
 * Booking tables (AD-5, AD-16). Owned by `src/features/booking`: only its
 * repo writes them, and the reset empties them (AD-3, AD-6). Other features
 * read them only through `availabilityFor` (AD-4).
 *
 * A Booking stores a snapshot of what the Guest confirmed: the Stay, the
 * Party, prices and the Cancellation policy, so later views never recompute
 * them from the catalog. Times are ISO UTC timestamps (AD-9).
 */

/**
 * The data layer's copy of the domain's `BOOKING_STATUSES` (AD-1: `src/db`
 * imports nothing from `src/domain`). `src/db/schema.test.ts` holds the two
 * equal, along with the status check below.
 */
export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** `CI-` plus 6 characters, stored uppercase (AD-10). */
    reference: text("reference").notNull().unique(),
    /** The `k` minted by `startBooking`; a repeat confirm finds this Booking (AD-10). */
    idempotencyKey: text("idempotency_key").notNull().unique(),
    /** Random token held in the `checkinn_access` cookie (AD-15). */
    accessToken: text("access_token").notNull().unique(),
    hotelId: text("hotel_id")
      .notNull()
      .references(() => hotels.id),
    status: text("status", { enum: BOOKING_STATUSES }).notNull(),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out").notNull(),
    adults: integer("adults").notNull(),
    children: integer("children").notNull(),
    rooms: integer("rooms").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** Trimmed and lowercased (AD-10). */
    email: text("email").notNull(),
    phone: text("phone"),
    arrivalTime: text("arrival_time"),
    specialRequests: text("special_requests"),
    bookingTotalRand: integer("booking_total_rand").notNull(),
    /** The Hotel's `policies.cancellation.type` at the time of booking. */
    cancellationPolicy: text("cancellation_policy").notNull(),
    /** Null for Non-refundable (AD-9, AD-16). */
    cancellationDeadline: text("cancellation_deadline"),
    createdAt: text("created_at").notNull(),
    cancelledAt: text("cancelled_at"),
  },
  (table) => [
    index("bookings_hotel_stay_idx").on(
      table.hotelId,
      table.checkIn,
      table.checkOut,
    ),
    check(
      "bookings_status_check",
      sql`${table.status} IN ('confirmed', 'cancelled')`,
    ),
    check("bookings_stay_check", sql`${table.checkOut} > ${table.checkIn}`),
  ],
);

export const bookingLines = sqliteTable(
  "booking_lines",
  {
    bookingId: integer("booking_id")
      .notNull()
      .references(() => bookings.id),
    roomTypeId: text("room_type_id")
      .notNull()
      .references(() => roomTypes.id),
    quantity: integer("quantity").notNull(),
    unitPriceRand: integer("unit_price_rand").notNull(),
    lineTotalRand: integer("line_total_rand").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bookingId, table.roomTypeId] }),
    index("booking_lines_room_type_id_idx").on(table.roomTypeId),
    check("booking_lines_quantity_check", sql`${table.quantity} > 0`),
  ],
);
