// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  keywordRelevance,
  type KeywordHotel,
  preferenceConcepts,
  roomMeanings,
} from "./keyword-relevance";

const BOILERPLATE =
  " This fictional property sits around the area. Facilities include free Wi-Fi, free parking." +
  " Every room has a private bathroom; six-person family suites suit different party sizes.";

function hotel(overrides: Partial<KeywordHotel> = {}): KeywordHotel {
  return {
    name: "Test Hotel",
    area: "Town centre",
    category: "budget",
    amenities: ["wifi", "parking"],
    description: `A practical base for short stopovers.${BOILERPLATE}`,
    ...overrides,
  };
}

const relevance = (preferences: string | null, target: KeywordHotel) =>
  keywordRelevance(preferenceConcepts(preferences), target);

describe("preferenceConcepts", () => {
  it("is empty for no Preferences, or words that name no concept", () => {
    expect(preferenceConcepts(null)).toEqual([]);
    expect(preferenceConcepts("a nice place with a fireplace")).toEqual([]);
  });

  it("counts each concept once, whatever words name it", () => {
    expect(preferenceConcepts("gym, fitness and a workout room")).toHaveLength(1);
    expect(preferenceConcepts("self-catering with a kitchen")).toHaveLength(1);
  });
});

describe("keywordRelevance", () => {
  it("is 0 when the Preferences name no concept", () => {
    expect(relevance(null, hotel())).toBe(0);
    expect(relevance("ski chalet", hotel())).toBe(0);
  });

  it("matches amenities", () => {
    const gym = hotel({ amenities: ["gym", "meeting_rooms"] });
    expect(relevance("a gym and meeting rooms", gym)).toBe(1);
    expect(relevance("a gym and a pool", gym)).toBe(0.5);
  });

  it("matches the category", () => {
    expect(relevance("business", hotel({ category: "business" }))).toBe(1);
    expect(relevance("luxury", hotel({ category: "business" }))).toBe(0);
  });

  it("matches whole words in the pitch line, area and name", () => {
    const lodge = hotel({
      category: "rural",
      description: `An informal country-style lodge for families who prefer a slower pace.${BOILERPLATE}`,
    });
    expect(relevance("family", lodge)).toBe(1);
    expect(relevance("quiet countryside", lodge)).toBe(1);
    expect(relevance("beach", hotel({ area: "Garden Route coastal neighbourhood" }))).toBe(1);
  });

  it("ignores the description's shared boilerplate", () => {
    // Every description mentions family suites, Wi-Fi and parking.
    expect(relevance("family", hotel())).toBe(0);
  });
});

describe("roomMeanings", () => {
  const rooms = [
    { id: "solo", name: "Solo Room", amenities: ["wifi"] },
    { id: "twin", name: "Retreat Twin", amenities: ["wifi"] },
    { id: "suite", name: "Family Suite", amenities: ["wifi", "kitchenette"] },
  ];

  it("is empty when no concept is about rooms, so the cheapest room wins", () => {
    expect(roomMeanings(preferenceConcepts("a gym and a family place"), rooms).size).toBe(0);
  });

  it("scores rooms by their name and amenities", () => {
    expect(roomMeanings(preferenceConcepts("a twin room"), rooms)).toEqual(
      new Map([
        ["solo", 0],
        ["twin", 1],
        ["suite", 0],
      ]),
    );
    expect(roomMeanings(preferenceConcepts("a suite with a kitchen"), rooms).get("suite")).toBe(1);
  });
});
