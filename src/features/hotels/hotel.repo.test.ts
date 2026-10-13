// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { loadSeed } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { hotelPage } from "./hotel.repo";

let db: Db;

beforeAll(() => {
  db = createTestDb();
});

afterAll(() => {
  db.$client.close();
});

function rule(page: ReturnType<typeof hotelPage>, term: string) {
  return page?.houseRules.find((entry) => entry.term === term)?.value;
}

describe("hotelPage", () => {
  it("builds Harbourlight Retreat from the seed", () => {
    const seedHotel = loadSeed().hotels.find((hotel) => hotel.id === "hotel-001");

    expect(hotelPage(db, "hotel-001")).toEqual({
      hotelId: "hotel-001",
      name: "Harbourlight Retreat",
      category: "luxury",
      starRating: 5,
      area: "V&A Waterfront",
      cityName: "Cape Town",
      province: "Western Cape",
      description:
        "A fictional coastal retreat with spacious rooms and a relaxed pool terrace.",
      reviewScore: 4.8,
      reviewLabel: "Superb",
      reviewCount: 248,
      facilities: [
        { key: "wifi", label: "Free Wi-Fi" },
        { key: "pool", label: "Swimming pool" },
        { key: "spa", label: "Spa" },
        { key: "restaurant", label: "Restaurant" },
        { key: "parking", label: "Free parking" },
      ],
      photos: seedHotel?.images.map((image) => ({ url: image.url, alt: image.alt })),
      houseRules: [
        { term: "Check-in", value: "From 14:00" },
        { term: "Check-out", value: "Until 10:00" },
        { term: "Children", value: "Children are welcome" },
        { term: "Pets", value: "Pets are not allowed" },
        { term: "Smoking", value: "Smoking is not allowed" },
        { term: "Cancellation", value: "Non-refundable. This booking can't be cancelled." },
      ],
    });
  });

  it("lists only the Facilities a Hotel has", () => {
    const page = hotelPage(db, "hotel-002");

    expect(page?.facilities.map((facility) => facility.label)).toEqual([
      "Free Wi-Fi",
      "Free parking",
      "Air conditioning",
    ]);
    expect(rule(page, "Cancellation")).toBe(
      "Free cancellation until 48 hours before check-in.",
    );
  });

  it("welcomes pets where the Hotel allows them", () => {
    expect(rule(hotelPage(db, "hotel-010"), "Pets")).toBe("Pets are welcome");
  });

  it("returns null for an unknown id", () => {
    expect(hotelPage(db, "nope")).toBeNull();
  });
});
