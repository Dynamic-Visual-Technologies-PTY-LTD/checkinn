// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { loadSeed } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import {
  countHotels,
  listCityNames,
  listCityTiles,
  listInterpretationCatalog,
} from "./catalog.repo";

let db: Db;

beforeAll(() => {
  db = createTestDb();
});

describe("countHotels", () => {
  it("counts the 12 seed Hotels", () => {
    expect(countHotels(db)).toBe(12);
  });
});

describe("listCityTiles", () => {
  it("lists the 6 Cities in seed order with 2 Hotels each", () => {
    const tiles = listCityTiles(db);

    expect(tiles.map((tile) => tile.name)).toEqual([
      "Cape Town",
      "Johannesburg",
      "Durban",
      "Pretoria",
      "Stellenbosch",
      "Gqeberha",
    ]);
    expect(tiles.map((tile) => tile.hotelCount)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("carries the seed photo, alt text and source page", () => {
    const seedCity = loadSeed().cities[0];
    const [capeTown] = listCityTiles(db);

    expect(capeTown).toEqual({
      id: "cape-town",
      name: "Cape Town",
      hotelCount: 2,
      image: {
        url: seedCity.image.url,
        alt: "Cape Town destination photograph",
        sourceUrl: seedCity.image.sourceUrl,
      },
    });
  });
});

describe("listCityNames", () => {
  it("lists each City's name and seed aliases in seed order", () => {
    const seed = loadSeed();
    expect(listCityNames(db)).toEqual(
      seed.cities.map((city) => ({ name: city.name, aliases: city.aliases })),
    );
  });
});

describe("listInterpretationCatalog", () => {
  it("lists every Hotel with its City, province and Room type sizes", () => {
    const catalog = listInterpretationCatalog(db);

    expect(catalog).toHaveLength(12);
    expect(catalog.find((hotel) => hotel.name === "Goldleaf Business Hotel")).toEqual({
      name: "Goldleaf Business Hotel",
      area: "Sandton",
      cityName: "Johannesburg",
      cityAliases: [],
      province: "Gauteng",
      roomTypes: expect.arrayContaining([{ maxGuests: 2 }, { maxGuests: 4 }]),
    });
    expect(catalog.find((hotel) => hotel.cityName === "Gqeberha")?.cityAliases).toEqual([
      "Port Elizabeth",
    ]);
  });

  it("holds each Hotel's seed Room types", () => {
    const seed = loadSeed();
    const catalog = listInterpretationCatalog(db);
    for (const hotel of seed.hotels) {
      const entry = catalog.find((item) => item.name === hotel.name);
      expect(entry?.roomTypes.map((type) => type.maxGuests).sort()).toEqual(
        hotel.roomTypes.map((type) => type.maxGuests).sort(),
      );
    }
  });
});
