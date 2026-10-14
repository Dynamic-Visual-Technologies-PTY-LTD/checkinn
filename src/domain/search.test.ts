// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  cancellationLabel,
  cardFacilities,
  cityNamed,
  heading,
  matches,
  rank,
  reviewLabel,
  type SearchableHotel,
} from "./search";
import type { ListingCard } from "./types";

const harbourlight: SearchableHotel = {
  name: "Harbourlight Retreat",
  area: "V&A Waterfront",
  cityName: "Cape Town",
  cityAliases: [],
  province: "Western Cape",
};

const algoa: SearchableHotel = {
  name: "Algoa Bay Hideaway",
  area: "Summerstrand",
  cityName: "Gqeberha",
  cityAliases: ["Port Elizabeth"],
  province: "Eastern Cape",
};

describe("matches", () => {
  it("matches every Hotel on an empty or blank Destination", () => {
    expect(matches("", harbourlight)).toBe(true);
    expect(matches("   ", algoa)).toBe(true);
  });

  it("ignores case and surrounding spaces", () => {
    expect(matches("CAPE TOWN", harbourlight)).toBe(true);
    expect(matches("  cape town ", harbourlight)).toBe(true);
  });

  it("matches City name, alias, province, area and Hotel name partially", () => {
    expect(matches("town", harbourlight)).toBe(true);
    expect(matches("port eliz", algoa)).toBe(true);
    expect(matches("eastern", algoa)).toBe(true);
    expect(matches("waterfront", harbourlight)).toBe(true);
    expect(matches("hideaway", algoa)).toBe(true);
  });

  it("rejects text that is in none of the fields", () => {
    expect(matches("Bloemfontein", harbourlight)).toBe(false);
  });
});

function card(overrides: Partial<ListingCard>): ListingCard {
  return {
    hotelId: "h",
    name: "H",
    category: "luxury",
    starRating: 5,
    area: "A",
    cityName: "Cape Town",
    reviewScore: 4,
    reviewLabel: "Very good",
    reviewCount: 1,
    facilities: [],
    cancellation: { policy: "non_refundable", label: "Non-refundable" },
    firstImage: null,
    nights: 1,
    adults: 2,
    totalRand: 1000,
    nightlyRand: 1000,
    ...overrides,
  };
}

describe("rank", () => {
  it("orders by Review score, then lowest Nightly price", () => {
    const ranked = rank([
      card({ hotelId: "a", reviewScore: 4.2, nightlyRand: 500 }),
      card({ hotelId: "b", reviewScore: 4.8, nightlyRand: 2450 }),
      card({ hotelId: "c", reviewScore: 4.8, nightlyRand: 1950 }),
    ]);
    expect(ranked.map((c) => c.hotelId)).toEqual(["c", "b", "a"]);
  });

  it("does not change its input", () => {
    const input = [card({ hotelId: "a", reviewScore: 3 }), card({ hotelId: "b", reviewScore: 5 })];
    rank(input);
    expect(input.map((c) => c.hotelId)).toEqual(["a", "b"]);
  });
});

describe("heading", () => {
  const capeTown = { cityName: "Cape Town" };
  const stellenbosch = { cityName: "Stellenbosch" };

  it("names the City when every result is in it", () => {
    expect(heading("Cape Town", [capeTown, capeTown])).toBe("Cape Town: 2 properties found");
  });

  it("gives the count only across several Cities", () => {
    expect(heading("cape", [capeTown, stellenbosch])).toBe("2 properties found");
  });

  it("says All destinations for an empty Destination", () => {
    expect(heading("", [capeTown, stellenbosch])).toBe("All destinations: 2 properties found");
  });

  it("reads 1 property found for one result, with no prefix (FR-7)", () => {
    expect(heading("Waterfront", [capeTown])).toBe("1 property found");
    expect(heading("  ", [capeTown])).toBe("1 property found");
  });

  it("is null when nothing was found", () => {
    expect(heading("Bloemfontein", [])).toBeNull();
  });
});

describe("reviewLabel", () => {
  it.each([
    [5, "Superb"],
    [4.5, "Superb"],
    [4.4, "Very good"],
    [4.0, "Very good"],
    [3.9, "Good"],
    [3.5, "Good"],
    [3.4, "Pleasant"],
    [3.0, "Pleasant"],
    [2.9, null],
  ])("labels %s as %s", (score, label) => {
    expect(reviewLabel(score)).toBe(label);
  });
});

describe("cardFacilities", () => {
  const labels = {
    wifi: "Free Wi-Fi",
    pool: "Swimming pool",
    spa: "Spa",
    restaurant: "Restaurant",
    parking: "Free parking",
  };

  it("takes the first 3 amenities, skipping Wi-Fi", () => {
    expect(cardFacilities(["wifi", "pool", "spa", "restaurant", "parking"], labels)).toEqual([
      "Swimming pool",
      "Spa",
      "Restaurant",
    ]);
  });

  it("returns fewer when the Hotel has fewer, and skips unlabelled keys", () => {
    expect(cardFacilities(["wifi", "sauna", "parking"], labels)).toEqual(["Free parking"]);
  });
});

describe("cancellationLabel", () => {
  it("names both policies", () => {
    expect(cancellationLabel("free_until_48_hours_before_check_in")).toBe("Free cancellation");
    expect(cancellationLabel("non_refundable")).toBe("Non-refundable");
  });
});

describe("cityNamed", () => {
  const cities = [
    { name: "Cape Town", aliases: [] },
    { name: "Gqeberha", aliases: ["Port Elizabeth"] },
  ];

  it("returns the City a Destination names, in any case and trimmed", () => {
    expect(cityNamed("  cape town ", cities)).toBe("Cape Town");
    expect(cityNamed("port elizabeth", cities)).toBe("Gqeberha");
  });

  it("returns null for a partial, a province or an empty Destination", () => {
    expect(cityNamed("cape", cities)).toBeNull();
    expect(cityNamed("Western Cape", cities)).toBeNull();
    expect(cityNamed("", cities)).toBeNull();
  });
});
