import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotelImages, hotels } from "@/db/schema";
import { loadSeed } from "@/db/seed";
import type { PhotoCredits } from "@/domain/types";

let hotelImageNote: string | undefined;

/** The seed's illustrative-photos note, read once per process (AD-6). */
function note(): string {
  hotelImageNote ??= loadSeed().metadata.hotelImageNote;
  return hotelImageNote;
}

/**
 * Every seed photo credit for `/credits`: one entry per City and one per
 * Hotel, in seed order. A Hotel entry lists its photos' source pages,
 * providers and licences.
 */
export function listPhotoCredits(db: Db): PhotoCredits {
  const cityRows = db
    .select({
      cityId: cities.id,
      cityName: cities.name,
      sourceUrl: cities.imageSourceUrl,
      creditInstructions: cities.imageCreditInstructions,
    })
    .from(cities)
    .orderBy(asc(cities.sortOrder))
    .all();

  const photoRows = db
    .select({
      hotelId: hotels.id,
      hotelName: hotels.name,
      alt: hotelImages.alt,
      provider: hotelImages.provider,
      sourceUrl: hotelImages.sourceUrl,
      licenseUrl: hotelImages.licenseUrl,
      isIllustrative: hotelImages.isIllustrative,
    })
    .from(hotels)
    .innerJoin(cities, eq(cities.id, hotels.cityId))
    .innerJoin(hotelImages, eq(hotelImages.hotelId, hotels.id))
    .orderBy(asc(cities.sortOrder), asc(hotels.id), asc(hotelImages.position))
    .all();

  const byHotel = new Map<string, PhotoCredits["hotels"][number]>();
  for (const row of photoRows) {
    let entry = byHotel.get(row.hotelId);
    if (!entry) {
      entry = { hotelId: row.hotelId, hotelName: row.hotelName, photos: [], note: null };
      byHotel.set(row.hotelId, entry);
    }
    entry.photos.push({
      alt: row.alt,
      provider: row.provider,
      sourceUrl: row.sourceUrl,
      licenseUrl: row.licenseUrl,
    });
    if (row.isIllustrative) entry.note = note();
  }

  return { cities: cityRows, hotels: [...byHotel.values()] };
}
