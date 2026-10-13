import {
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
