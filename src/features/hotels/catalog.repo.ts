import { asc, count, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotels, roomTypes } from "@/db/schema";
import type { InterpretationHotel } from "@/domain/interpretation";
import type { CityTile } from "@/domain/types";

/** Every City in seed order, with its catalog Hotel count (FR-27, AD-7). */
export function listCityTiles(db: Db): CityTile[] {
  const rows = db
    .select({
      id: cities.id,
      name: cities.name,
      hotelCount: count(hotels.id),
      imageUrl: cities.imageUrl,
      imageAlt: cities.imageAlt,
      imageSourceUrl: cities.imageSourceUrl,
    })
    .from(cities)
    .leftJoin(hotels, eq(hotels.cityId, cities.id))
    .groupBy(cities.id)
    .orderBy(asc(cities.sortOrder))
    .all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    hotelCount: row.hotelCount,
    image: {
      url: row.imageUrl,
      alt: row.imageAlt,
      sourceUrl: row.imageSourceUrl,
    },
  }));
}

/** Every City's name and aliases, in seed order. */
export function listCityNames(db: Db): { name: string; aliases: string[] }[] {
  return db
    .select({ name: cities.name, aliases: cities.aliases })
    .from(cities)
    .orderBy(asc(cities.sortOrder))
    .all();
}

/** The number of Hotels in the catalog. */
export function countHotels(db: Db): number {
  return db.select({ value: count() }).from(hotels).get()?.value ?? 0;
}

/**
 * Every Hotel as Query interpretation sees it (AD-22, AD-26): its name and
 * area, its City's name, aliases and province, and each Room type's
 * `maxGuests`, in seed order.
 */
export function listInterpretationCatalog(db: Db): InterpretationHotel[] {
  const rows = db
    .select({
      id: hotels.id,
      name: hotels.name,
      area: hotels.area,
      cityName: cities.name,
      cityAliases: cities.aliases,
      province: cities.province,
    })
    .from(hotels)
    .innerJoin(cities, eq(cities.id, hotels.cityId))
    .orderBy(asc(cities.sortOrder), asc(hotels.id))
    .all();
  const sizes = db
    .select({ hotelId: roomTypes.hotelId, maxGuests: roomTypes.maxGuests })
    .from(roomTypes)
    .orderBy(asc(roomTypes.id))
    .all();

  return rows.map(({ id, ...hotel }) => ({
    ...hotel,
    roomTypes: sizes
      .filter((size) => size.hotelId === id)
      .map((size) => ({ maxGuests: size.maxGuests })),
  }));
}
