// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { loadSeed } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import {
  countHotels,
  listCityNames,
  listCityTiles,
} from "./catalog.repo";

let db: Db;

beforeAll(() => {
  db = createTestDb();
});

describe("countHotels", () => {
  it("counts the 120 seed Hotels", () => {
    expect(countHotels(db)).toBe(120);
  });
});

describe("listCityTiles", () => {
  it("lists the 20 Cities in seed order with 6 Hotels each", () => {
    const tiles = listCityTiles(db);

    expect(tiles.map((tile) => tile.name)).toEqual(loadSeed().cities.map((city) => city.name));
    expect(tiles.map((tile) => tile.hotelCount)).toEqual(Array(20).fill(6));
  });

  it("carries the seed photo, alt text and source page", () => {
    const seedCity = loadSeed().cities[0];
    const [capeTown] = listCityTiles(db);

    expect(capeTown).toEqual({
      id: "cape-town",
      name: "Cape Town",
      hotelCount: 6,
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
