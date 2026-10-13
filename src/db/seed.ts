import { readFileSync } from "node:fs";
import path from "node:path";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Bed, HotelPolicies } from "@/db/schema";
import * as schema from "@/db/schema";

/** The shape of `data/seed/hotel-booking-demo.json` that the catalog uses. */
export type Seed = {
  cities: {
    id: string;
    name: string;
    aliases: string[];
    province: string;
    country: string;
    countryCode: string;
    description: string;
    image: {
      url: string;
      alt: string;
      sourceUrl: string;
      creditInstructions: string;
      isIllustrative: boolean;
    };
  }[];
  hotels: {
    id: string;
    cityId: string;
    name: string;
    isFictional: boolean;
    area: string;
    category: string;
    description: string;
    starRating: number;
    reviewScore: number;
    reviewScoreMax: number;
    reviewCount: number;
    currency: string;
    priceFromPerNight: number;
    amenities: string[];
    images: {
      url: string;
      alt: string;
      provider: string;
      isIllustrative: boolean;
      sourceUrl: string;
      licenseUrl: string;
    }[];
    checkInTime: string;
    checkOutTime: string;
    timeZone: string;
    policies: HotelPolicies;
    roomTypes: {
      id: string;
      name: string;
      maxGuests: number;
      beds: Bed[];
      pricePerNight: number;
      totalRooms: number;
      amenities: string[];
    }[];
  }[];
};

/** Reads the committed seed file (AD-6), resolved from the project root. */
export function loadSeed(): Seed {
  const file = path.join(process.cwd(), "data", "seed", "hotel-booking-demo.json");
  return JSON.parse(readFileSync(file, "utf8")) as Seed;
}

/**
 * Inserts the catalog from the seed in one transaction (AD-5, AD-6). Values
 * are stored as-is; only names change to the schema's columns.
 */
export function seedCatalog(
  db: BetterSQLite3Database<typeof schema>,
  seed: Seed,
): void {
  db.transaction((tx) => {
    tx.insert(schema.cities)
      .values(
        seed.cities.map((city, index) => ({
          id: city.id,
          sortOrder: index,
          name: city.name,
          aliases: city.aliases,
          province: city.province,
          country: city.country,
          countryCode: city.countryCode,
          description: city.description,
          imageUrl: city.image.url,
          imageAlt: city.image.alt,
          imageSourceUrl: city.image.sourceUrl,
          imageCreditInstructions: city.image.creditInstructions,
          imageIsIllustrative: city.image.isIllustrative,
        })),
      )
      .run();

    tx.insert(schema.hotels)
      .values(
        seed.hotels.map((hotel) => ({
          id: hotel.id,
          cityId: hotel.cityId,
          name: hotel.name,
          isFictional: hotel.isFictional,
          area: hotel.area,
          category: hotel.category,
          description: hotel.description,
          starRating: hotel.starRating,
          reviewScore: hotel.reviewScore,
          reviewScoreMax: hotel.reviewScoreMax,
          reviewCount: hotel.reviewCount,
          currency: hotel.currency,
          priceFromPerNightRand: hotel.priceFromPerNight,
          amenities: hotel.amenities,
          checkInTime: hotel.checkInTime,
          checkOutTime: hotel.checkOutTime,
          timeZone: hotel.timeZone,
          policies: hotel.policies,
        })),
      )
      .run();

    tx.insert(schema.hotelImages)
      .values(
        seed.hotels.flatMap((hotel) =>
          hotel.images.map((image, position) => ({
            hotelId: hotel.id,
            position,
            url: image.url,
            alt: image.alt,
            provider: image.provider,
            isIllustrative: image.isIllustrative,
            sourceUrl: image.sourceUrl,
            licenseUrl: image.licenseUrl,
          })),
        ),
      )
      .run();

    tx.insert(schema.roomTypes)
      .values(
        seed.hotels.flatMap((hotel) =>
          hotel.roomTypes.map((roomType, position) => ({
            id: roomType.id,
            hotelId: hotel.id,
            position,
            name: roomType.name,
            maxGuests: roomType.maxGuests,
            beds: roomType.beds,
            pricePerNightRand: roomType.pricePerNight,
            totalRooms: roomType.totalRooms,
            amenities: roomType.amenities,
          })),
        ),
      )
      .run();
  });
}
