import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { cities, hotelImages, hotels, roomTypes } from "@/db/schema";
import { loadSeed } from "@/db/seed";
import { isAvailable } from "@/domain/availability";
import { cancellationLine } from "@/domain/cancellation";
import { nightsBetween } from "@/domain/dates";
import { fromPrice } from "@/domain/pricing";
import {
  cardFacilities,
  heading,
  matches,
  rank,
  reviewLabel,
} from "@/domain/search";
import type { HardCriteriaRoomType, HotelPolicies } from "@/domain/hard-criteria";
import type {
  CancellationPolicy,
  ListingCard,
  Party,
  SearchCriteria,
  SearchResult,
  Stay,
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

/** The MVP search result (AD-7). `searchHotels` adds the Smart search fields (AD-20). */
export type CatalogResult = Pick<SearchResult, "heading" | "cards" | "notices">;

/** A Listing card without its price, which the MVP and Smart search set differently. */
export type UnpricedCard = Omit<ListingCard, "totalRand" | "nightlyRand">;

type HotelRow = { hotel: typeof hotels.$inferSelect; cityName: string };

/** The Hotels whose Destination matches (FR-3), in catalog order. */
function matchingHotels(db: Db, q: string): HotelRow[] {
  return db
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
}

/** A Hotel's Room types with their Nightly prices, in seed order. */
function hotelRoomTypes(db: Db, hotelId: string) {
  return db
    .select({
      id: roomTypes.id,
      maxGuests: roomTypes.maxGuests,
      nightlyRand: roomTypes.pricePerNightRand,
    })
    .from(roomTypes)
    .where(eq(roomTypes.hotelId, hotelId))
    .orderBy(asc(roomTypes.position))
    .all();
}

/** A Hotel's Listing card fields, everything but the price (FR-6). */
function unpricedCard(
  db: Db,
  { hotel, cityName }: HotelRow,
  stay: Stay,
  party: Party,
  now: string,
): UnpricedCard {
  const image = db
    .select({ url: hotelImages.url, alt: hotelImages.alt })
    .from(hotelImages)
    .where(eq(hotelImages.hotelId, hotel.id))
    .orderBy(asc(hotelImages.position))
    .limit(1)
    .get();

  const policy = hotel.policies.cancellation.type as CancellationPolicy;
  return {
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
    cancellation: cancellationLine(policy, stay.checkIn, hotel.checkInTime, now),
    firstImage: image ?? null,
    nights: nightsBetween(stay.checkIn, stay.checkOut),
    adults: party.adults,
  };
}

/**
 * Search results for criteria (AD-7, FR-2, FR-3, FR-5–FR-7): Hotels whose
 * Destination matches and that have a Room type available for every Night of
 * the Stay, as Listing cards in display order. With no Stay, no query runs
 * and the result is empty. `now` (an ISO instant read at request time) says
 * whether each Hotel's free cancellation has already ended for the Stay.
 */
export function searchCatalog(db: Db, criteria: SearchCriteria, now: string): CatalogResult {
  const { stay, party, q } = criteria;
  if (!stay) return { heading: null, cards: [], notices: [] };
  const nights = nightsBetween(stay.checkIn, stay.checkOut);

  const cards: ListingCard[] = [];
  for (const row of matchingHotels(db, q)) {
    const availability = availabilityFor(db, row.hotel.id, stay);
    const prices = hotelRoomTypes(db, row.hotel.id)
      .filter((type) => isAvailable(availability.get(type.id) ?? 0))
      .map((type) => type.nightlyRand);

    const price = fromPrice(prices, nights, party.rooms);
    if (!price) continue;

    cards.push({
      ...unpricedCard(db, row, stay, party, now),
      totalRand: price.totalRand,
      nightlyRand: price.nightlyRand,
    });
  }

  const ranked = rank(cards);
  return { heading: heading(q, ranked), cards: ranked, notices: [] };
}

/** A Destination-matching Hotel, with what the Hard-criteria check needs (AD-23). */
export type SmartCandidate = {
  /** Its Listing card fields, built as `searchCatalog` builds them. */
  card: UnpricedCard;
  policies: HotelPolicies;
  /** Its Room types in seed order. */
  roomTypes: HardCriteriaRoomType[];
  /** `availabilityFor` counts for the Stay, keyed by Room type id (AD-4). */
  availability: Map<string, number>;
};

/**
 * The Smart search candidate set (AD-23): every Hotel whose Destination
 * matches, in catalog order, with its policies, Room types and Availability
 * for the Stay. The Hard-criteria check narrows it. With no Stay it is empty.
 */
export function smartCandidates(db: Db, criteria: SearchCriteria, now: string): SmartCandidate[] {
  const { stay, party, q } = criteria;
  if (!stay) return [];
  return matchingHotels(db, q).map((row) => ({
    card: unpricedCard(db, row, stay, party, now),
    policies: {
      petsAllowed: row.hotel.policies.petsAllowed,
      childrenAllowed: row.hotel.policies.childrenAllowed,
      smokingAllowed: row.hotel.policies.smokingAllowed,
    },
    roomTypes: hotelRoomTypes(db, row.hotel.id),
    availability: availabilityFor(db, row.hotel.id, stay),
  }));
}
