// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { loadSeed } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { listPhotoCredits } from "./credits.repo";

let db: Db;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.$client.close();
});

describe("listPhotoCredits", () => {
  it("lists the 6 Cities in seed order with their source page and instructions", () => {
    const seed = loadSeed();
    const { cities } = listPhotoCredits(db);

    expect(cities.map((city) => city.cityName)).toEqual(seed.cities.map((city) => city.name));
    expect(cities[0]).toEqual({
      cityId: "cape-town",
      cityName: "Cape Town",
      sourceUrl: seed.cities[0].image.sourceUrl,
      creditInstructions: seed.cities[0].image.creditInstructions,
    });
  });

  it("gives one entry per Hotel, 12 in all, each with both photos", () => {
    const { hotels } = listPhotoCredits(db);

    expect(hotels).toHaveLength(12);
    expect(new Set(hotels.map((hotel) => hotel.hotelId)).size).toBe(12);
    for (const hotel of hotels) expect(hotel.photos).toHaveLength(2);
  });

  it("carries each photo's source, provider and licence, and the illustrative note", () => {
    const seed = loadSeed();
    const harbourlight = listPhotoCredits(db).hotels.find(
      (hotel) => hotel.hotelId === "hotel-001",
    );
    const seedHotel = seed.hotels.find((hotel) => hotel.id === "hotel-001");

    expect(harbourlight).toEqual({
      hotelId: "hotel-001",
      hotelName: "Harbourlight Retreat",
      photos: seedHotel?.images.map((image) => ({
        alt: image.alt,
        provider: image.provider,
        sourceUrl: image.sourceUrl,
        licenseUrl: image.licenseUrl,
      })),
      note: seed.metadata.hotelImageNote,
    });
  });

  it("lists Hotels City by City, in seed City order", () => {
    const { hotels } = listPhotoCredits(db);

    expect(hotels.slice(0, 2).map((hotel) => hotel.hotelName)).toEqual([
      "Harbourlight Retreat",
      "Table View City Lodge",
    ]);
  });
});
