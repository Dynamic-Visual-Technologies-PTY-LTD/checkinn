// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadSeed } from "@/db/seed";

const seed = loadSeed();
const added = seed.hotels.slice(12);
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
type RoomImageManifest = {
  categoryVariants: Record<string, string[]>;
  images: Record<string, { url: string; alt: string }>;
};
const roomImages = JSON.parse(
  readFileSync(path.join(process.cwd(), "data", "seed", "room-images.json"), "utf8"),
) as RoomImageManifest;

describe("demo catalog", () => {
  it("has 120 unique hotels, 20 destinations and 348 unique room types", () => {
    expect(seed.cities).toHaveLength(20);
    expect(seed.hotels).toHaveLength(120);
    expect(new Set(seed.cities.map((city) => city.id)).size).toBe(20);
    expect(new Set(seed.hotels.map((hotel) => hotel.id)).size).toBe(120);
    expect(new Set(seed.hotels.map((hotel) => hotel.name)).size).toBe(120);
    const rooms = seed.hotels.flatMap((hotel) => hotel.roomTypes);
    expect(rooms).toHaveLength(348);
    expect(new Set(rooms.map((room) => room.id)).size).toBe(348);
  });

  it("preserves the original destinations and hotels including order and inventory", () => {
    // SHA-256 of the complete original arrays at plan baseline 28cc4235.
    expect(digest(seed.cities.slice(0, 6))).toBe("0ca7d8ea07e40f2ea187595afedc1d649cc388d04bc6676ef112104bffec6bf7");
    expect(digest(seed.hotels.slice(0, 12))).toBe("8f9bc7cc5d1474c69bbddbedc48c139a30599bc9594bc8d8da9980f934661f9e");
  });

  it("keeps references, prices, beds, inventory and fictional reviews coherent", () => {
    const cities = new Set(seed.cities.map((city) => city.id));
    const amenities = new Set(Object.keys(seed.amenityLabels));
    for (const hotel of seed.hotels) {
      expect(cities.has(hotel.cityId)).toBe(true);
      expect(hotel.isFictional).toBe(true);
      expect(hotel.currency).toBe("ZAR");
      expect(hotel.reviewScore).toBeGreaterThanOrEqual(0);
      expect(hotel.reviewScore).toBeLessThanOrEqual(hotel.reviewScoreMax);
      expect(hotel.reviewCount).toBeGreaterThan(0);
      expect(hotel.priceFromPerNight).toBe(Math.min(...hotel.roomTypes.map((room) => room.pricePerNight)));
      expect(hotel.roomTypes.length).toBeGreaterThanOrEqual(2);
      expect(["non_refundable", "free_until_48_hours_before_check_in"]).toContain(hotel.policies.cancellation.type);
      for (const key of hotel.amenities) expect(amenities.has(key)).toBe(true);
      for (const room of hotel.roomTypes) {
        expect(room.pricePerNight).toBeGreaterThan(0);
        expect(Number.isInteger(room.totalRooms)).toBe(true);
        // Original Table View family room intentionally has no inventory.
        expect(room.totalRooms).toBeGreaterThanOrEqual(room.id === "hotel-002-family" ? 0 : 1);
        expect(room.maxGuests).toBeGreaterThan(0);
        let sleeps = 0;
        for (const bed of room.beds) {
          expect(["single", "double"]).toContain(bed.type);
          expect(Number.isInteger(bed.count) && bed.count > 0).toBe(true);
          sleeps += bed.count * (bed.type === "double" ? 2 : 1);
        }
        expect(room.maxGuests).toBeLessThanOrEqual(sleeps);
        for (const key of room.amenities) expect(amenities.has(key)).toBe(true);
      }
    }
    for (const city of seed.cities) expect(seed.hotels.some((hotel) => hotel.cityId === city.id)).toBe(true);
  });

  it("offers varied stay types, budgets, parties and policy combinations", () => {
    expect(new Set(added.map((hotel) => hotel.category))).toEqual(new Set(["budget", "business", "family", "luxury", "wellness", "self-catering", "coastal", "rural"]));
    expect(Math.min(...added.map((hotel) => hotel.priceFromPerNight))).toBeLessThan(700);
    expect(Math.max(...added.map((hotel) => hotel.priceFromPerNight))).toBeGreaterThan(3000);
    for (const key of ["childrenAllowed", "petsAllowed", "smokingAllowed"] as const) {
      expect(new Set(added.map((hotel) => hotel.policies[key]))).toEqual(new Set([true, false]));
    }
    expect(new Set(added.map((hotel) => hotel.policies.cancellation.type)).size).toBe(2);
    expect(new Set(added.flatMap((hotel) => hotel.roomTypes.map((room) => room.maxGuests)))).toEqual(new Set([1, 2, 6]));
    for (const hotel of added) expect(hotel.roomTypes).toHaveLength(3);
    for (const hotel of added.filter((hotel) => hotel.category === "coastal")) {
      expect(["cape-town", "durban", "gqeberha", "hermanus", "knysna", "plettenberg-bay", "ballito"]).toContain(hotel.cityId);
    }
  });

  it("keeps stock attribution and assigns matching local AI room illustrations", () => {
    const originals = new Map(seed.hotels.slice(0, 12).flatMap((hotel) => hotel.images.map((image) => [image.url, image])));
    for (const hotel of seed.hotels.slice(0, 12)) {
      expect(hotel.images).toHaveLength(2);
      for (const image of hotel.images) {
        expect(image.isIllustrative).toBe(true);
        expect(image.sourceUrl).toBe(originals.get(image.url)?.sourceUrl);
        expect(image.licenseUrl).toBe(originals.get(image.url)?.licenseUrl);
        expect(image.provider).toBe("Unsplash");
        expect(image.alt.length).toBeGreaterThan(0);
      }
    }
    const generatedRoomUrls = new Set(Object.values(roomImages.images).map((image) => image.url));
    const assignedRoomUrls = new Set<string>();
    for (const hotel of added) {
      expect(hotel.images).toHaveLength(2);
      const [roomImage, stockImage] = hotel.images;
      expect(stockImage.provider).toBe("Unsplash");
      expect(stockImage.sourceUrl).toBe(originals.get(stockImage.url)?.sourceUrl);
      expect(stockImage.licenseUrl).toBe(originals.get(stockImage.url)?.licenseUrl);
      expect(roomImage.provider).toBe("OpenAI ImageGen");
      expect(roomImage.isIllustrative).toBe(true);
      expect(roomImage.sourceUrl).toBe(roomImage.url);
      expect(roomImage.licenseUrl).toBe("/images/rooms/CREDITS.txt");
      expect(generatedRoomUrls.has(roomImage.url)).toBe(true);
      expect(roomImage.alt).toContain("AI-generated illustrative");
      assignedRoomUrls.add(roomImage.url);
      const matchingVariant = Object.entries(roomImages.images).find(([, image]) => image.url === roomImage.url)?.[0];
      expect(matchingVariant).toBeDefined();
      expect(roomImages.categoryVariants[hotel.category]).toContain(matchingVariant);
      if (matchingVariant === "coastal-twin") {
        expect(hotel.category).toBe("wellness");
        expect(hotel.roomTypes.some((room) => room.beds.length === 1 && room.beds[0].type === "single" && room.beds[0].count === 2)).toBe(true);
      }
      const asset = readFileSync(path.join(process.cwd(), "public", roomImage.url));
      expect(asset.subarray(0, 4).toString()).toBe("RIFF");
      expect(asset.subarray(8, 12).toString()).toBe("WEBP");
    }
    expect(assignedRoomUrls).toEqual(generatedRoomUrls);
    const generatedCities = seed.cities.slice(6);
    expect(new Set(generatedCities.map((city) => city.image.url)).size).toBe(14);
    for (const city of generatedCities) {
      expect(city.image.url).toBe(`/images/destinations/${city.id}.webp`);
      expect(city.image.sourceUrl).toBe(city.image.url);
      expect(city.image.isIllustrative).toBe(true);
      expect(city.image.alt).toContain(`AI-generated landscape inspired by ${city.name}`);
      expect(city.image.alt).toContain("not a destination photograph");
      expect(city.image.creditInstructions).toContain("AI-generated with OpenAI ImageGen");
      const asset = readFileSync(path.join(process.cwd(), "public", city.image.url));
      expect(asset.subarray(0, 4).toString()).toBe("RIFF");
      expect(asset.subarray(8, 12).toString()).toBe("WEBP");
    }
  });
});
