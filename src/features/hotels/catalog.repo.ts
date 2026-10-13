import { asc, count, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotels } from "@/db/schema";
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

/** The number of Hotels in the catalog. */
export function countHotels(db: Db): number {
  return db.select({ value: count() }).from(hotels).get()?.value ?? 0;
}
