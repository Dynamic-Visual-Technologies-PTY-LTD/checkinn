import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotelImages, hotels, roomTypes } from "@/db/schema";
import { bedsLabel, houseRules } from "@/domain/hotel";
import { reviewLabel } from "@/domain/search";
import type { CancellationPolicy, HotelPage } from "@/domain/types";
import { labels } from "@/features/search/search.repo";

/**
 * The Hotel page view model for one Hotel (FR-9, FR-10, FR-12–FR-14), or null
 * when no Hotel has that id. Facilities are every seed amenity with a label,
 * in seed order.
 */
export function hotelPage(db: Db, hotelId: string): HotelPage | null {
  const row = db
    .select({ hotel: hotels, cityName: cities.name, province: cities.province })
    .from(hotels)
    .innerJoin(cities, eq(cities.id, hotels.cityId))
    .where(eq(hotels.id, hotelId))
    .get();
  if (!row) return null;
  const { hotel, cityName, province } = row;

  const photos = db
    .select({ url: hotelImages.url, alt: hotelImages.alt })
    .from(hotelImages)
    .where(eq(hotelImages.hotelId, hotel.id))
    .orderBy(asc(hotelImages.position))
    .all();

  const amenityLabels = labels();
  const facilities = hotel.amenities
    .filter((key) => Boolean(amenityLabels[key]))
    .map((key) => ({ key, label: amenityLabels[key] }));

  const rooms = db
    .select()
    .from(roomTypes)
    .where(eq(roomTypes.hotelId, hotel.id))
    .orderBy(asc(roomTypes.position))
    .all()
    .map((room) => ({
      id: room.id,
      name: room.name,
      maxGuests: room.maxGuests,
      bedsLabel: bedsLabel(room.beds),
      amenities: room.amenities
        .filter((key) => Boolean(amenityLabels[key]))
        .map((key) => ({ key, label: amenityLabels[key] })),
      nightlyRand: room.pricePerNightRand,
    }));

  return {
    hotelId: hotel.id,
    name: hotel.name,
    category: hotel.category,
    starRating: hotel.starRating,
    area: hotel.area,
    cityName,
    province,
    description: hotel.description,
    reviewScore: hotel.reviewScore,
    reviewLabel: reviewLabel(hotel.reviewScore),
    reviewCount: hotel.reviewCount,
    facilities,
    photos,
    houseRules: houseRules({
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      policies: {
        ...hotel.policies,
        cancellation: { type: hotel.policies.cancellation.type as CancellationPolicy },
      },
    }),
    rooms,
    cancellationPolicy: hotel.policies.cancellation.type as CancellationPolicy,
    checkInTime: hotel.checkInTime,
  };
}
