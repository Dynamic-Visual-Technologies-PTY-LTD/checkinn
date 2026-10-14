import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotelImages, hotels, roomTypes } from "@/db/schema";
import { loadSeed } from "@/db/seed";
import { isAvailable } from "@/domain/availability";
import { nightsBetween } from "@/domain/dates";
import { fromPrice } from "@/domain/pricing";
import {
  cancellationLabel,
  cardFacilities,
  heading,
  matches,
  rank,
  reviewLabel,
} from "@/domain/search";
import type {
  CancellationPolicy,
  ListingCard,
  SearchCriteria,
  SearchResult,
} from "@/domain/types";
import { availabilityFor } from "@/features/hotels/availability.repo";

let amenityLabels: Record<string, string> | undefined;

/**
 * The seed's amenity labels, read once per process (AD-6). Labels are not in
 * the database, so the Hotel page reads them here too.
 */
export function labels(): Record<string, string> {
  amenityLabels ??= loadSeed().amenityLabels;
  return amenityLabels;
}

/**
 * Search results for criteria (AD-7, FR-2, FR-3, FR-5–FR-7): Hotels whose
 * Destination matches and that have a Room type available for every Night of
 * the Stay, as Listing cards in display order. With no Stay, no query runs
 * and the result is empty.
 */
export function searchCatalog(db: Db, criteria: SearchCriteria): SearchResult {
  const { stay, party, q } = criteria;
  if (!stay) return { heading: null, cards: [] };
  const nights = nightsBetween(stay.checkIn, stay.checkOut);

  const rows = db
    .select({
      hotel: hotels,
      cityName: cities.name,
      cityAliases: cities.aliases,
      province: cities.province,
    })
    .from(hotels)
    .innerJoin(cities, eq(cities.id, hotels.cityId))
    .orderBy(asc(cities.sortOrder), asc(hotels.id))
    .all()
    .filter((row) =>
      matches(q, {
        name: row.hotel.name,
        area: row.hotel.area,
        cityName: row.cityName,
        cityAliases: row.cityAliases,
        province: row.province,
      }),
    );

  const cards: ListingCard[] = [];
  for (const { hotel, cityName } of rows) {
    const availability = availabilityFor(db, hotel.id, stay);
    const prices = db
      .select({ id: roomTypes.id, nightlyRand: roomTypes.pricePerNightRand })
      .from(roomTypes)
      .where(eq(roomTypes.hotelId, hotel.id))
      .all()
      .filter((type) => isAvailable(availability.get(type.id) ?? 0))
      .map((type) => type.nightlyRand);

    const price = fromPrice(prices, nights, party.rooms);
    if (!price) continue;

    const image = db
      .select({ url: hotelImages.url, alt: hotelImages.alt })
      .from(hotelImages)
      .where(eq(hotelImages.hotelId, hotel.id))
      .orderBy(asc(hotelImages.position))
      .limit(1)
      .get();

    const policy = hotel.policies.cancellation.type as CancellationPolicy;
    cards.push({
      hotelId: hotel.id,
      name: hotel.name,
      category: hotel.category,
      starRating: hotel.starRating,
      area: hotel.area,
      cityName,
      reviewScore: hotel.reviewScore,
      reviewLabel: reviewLabel(hotel.reviewScore),
      reviewCount: hotel.reviewCount,
      facilities: cardFacilities(hotel.amenities, labels()),
      cancellation: { policy, label: cancellationLabel(policy) },
      firstImage: image ?? null,
      nights,
      adults: party.adults,
      totalRand: price.totalRand,
      nightlyRand: price.nightlyRand,
    });
  }

  const ranked = rank(cards);
  return { heading: heading(q, ranked), cards: ranked };
}
