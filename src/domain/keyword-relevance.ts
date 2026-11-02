/**
 * Keyword Relevance: a small, local stand-in for the meaning-based Relevance
 * of epic-smart-search-quality. The Preferences' words are read as concepts
 * (a gym, a quiet stay, a family place…), and each Hotel scores the share of
 * those concepts its category, amenities, area, name and pitch line show.
 * Pure, with no Provider call, so it runs on a fresh clone.
 */

/** What a Hotel shows that a concept can match. */
export type KeywordHotel = {
  name: string;
  area: string;
  category: string;
  /** Amenity keys, such as `gym` or `meeting_rooms`. */
  amenities: readonly string[];
  description: string;
};

/** What a Room type shows that a concept can match. */
export type KeywordRoomType = {
  id: string;
  name: string;
  amenities: readonly string[];
};

/**
 * A thing a Guest can ask for. `words` are the Guest words that name it.
 * A Hotel shows it through any of `categories`, `amenities` or `hotelWords`
 * (whole words in its name, area or pitch line); a Room type through any of
 * `roomWords` (whole words in its name) or `roomAmenities`.
 */
type Concept = {
  /** Its Criteria chip key, after `pref-`. */
  id: string;
  /** Its Criteria chip copy. */
  label: string;
  words: readonly string[];
  categories?: readonly string[];
  amenities?: readonly string[];
  hotelWords?: readonly string[];
  roomWords?: readonly string[];
  roomAmenities?: readonly string[];
};

const CONCEPTS: readonly Concept[] = [
  { id: "gym", label: "Gym", words: ["gym", "fitness", "workout", "exercise"], amenities: ["gym"] },
  { id: "pool", label: "Pool", words: ["pool", "swim", "swimming"], amenities: ["pool"] },
  { id: "spa", label: "Spa", words: ["spa", "massage", "pamper", "pampering"], amenities: ["spa"] },
  {
    id: "restaurant",
    label: "Restaurant",
    words: ["restaurant", "dining", "dinner", "meals", "food"],
    amenities: ["restaurant"],
  },
  { id: "parking", label: "Parking", words: ["parking", "car"], amenities: ["parking"] },
  { id: "wifi", label: "Wi-Fi", words: ["wifi", "internet"], amenities: ["wifi"] },
  {
    id: "aircon",
    label: "Air conditioning",
    words: ["aircon", "conditioning", "conditioned", "cool"],
    amenities: ["air_conditioning"],
    roomAmenities: ["air_conditioning"],
  },
  {
    id: "meetings",
    label: "Meeting rooms",
    words: ["meeting", "meetings", "conference", "conferences", "boardroom"],
    amenities: ["meeting_rooms"],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    words: ["kitchen", "kitchenette", "cook", "cooking", "selfcatering", "catering"],
    categories: ["self-catering"],
    amenities: ["kitchenette"],
    roomAmenities: ["kitchenette"],
  },
  {
    id: "family",
    label: "Family",
    words: ["family", "families", "kids", "children", "child", "toddler", "toddlers"],
    categories: ["family"],
    amenities: ["play_area"],
    hotelWords: ["family", "families"],
  },
  { id: "play", label: "Play area", words: ["playground", "play"], amenities: ["play_area"] },
  {
    id: "business",
    label: "Business",
    words: ["business", "work", "working", "workspace", "corporate"],
    categories: ["business"],
    hotelWords: ["business", "work"],
  },
  {
    id: "quiet",
    label: "Quiet",
    words: ["quiet", "calm", "peaceful", "tranquil", "restful", "relax", "relaxing", "unwind"],
    categories: ["wellness", "rural"],
    hotelWords: ["quiet", "calm", "restful", "slower"],
  },
  {
    id: "luxury",
    label: "Luxury",
    words: ["luxury", "luxurious", "upmarket", "indulgent", "posh", "splurge", "fancy"],
    categories: ["luxury"],
    hotelWords: ["indulgent", "polished"],
  },
  {
    id: "romantic",
    label: "Romantic",
    words: ["romantic", "couple", "couples", "honeymoon", "anniversary"],
    hotelWords: ["couples"],
    roomWords: ["double"],
  },
  {
    id: "budget",
    label: "Budget",
    words: ["budget", "cheap", "affordable", "inexpensive", "value"],
    categories: ["budget"],
    hotelWords: ["affordable", "practical"],
  },
  {
    id: "wellness",
    label: "Wellness",
    words: ["wellness", "retreat", "yoga", "detox"],
    categories: ["wellness"],
    amenities: ["spa"],
    hotelWords: ["wellness", "retreat"],
  },
  {
    id: "country",
    label: "Countryside",
    words: ["country", "countryside", "rural", "farm", "nature", "lodge"],
    categories: ["rural"],
    hotelWords: ["country"],
  },
  {
    id: "beach",
    label: "Beach",
    words: ["beach", "sea", "ocean", "coast", "coastal", "seaside", "waterfront", "lagoon"],
    categories: ["coastal"],
    hotelWords: ["beach", "coast", "coastal", "waterfront", "lagoon", "harbour"],
  },
  {
    id: "boutique",
    label: "Boutique",
    words: ["boutique", "charming", "character"],
    categories: ["boutique"],
  },
  { id: "adults", label: "Adults only", words: ["adults", "adultsonly"], hotelWords: ["adults"] },
  {
    id: "wine",
    label: "Winelands",
    words: ["wine", "winelands", "vineyard", "vineyards", "winery"],
    hotelWords: ["winelands"],
  },
  {
    id: "solo",
    label: "Solo room",
    words: ["solo", "single", "alone"],
    roomWords: ["solo", "single"],
  },
  { id: "twin", label: "Twin room", words: ["twin", "twins"], roomWords: ["twin"] },
  { id: "suite", label: "Suite", words: ["suite", "suites", "spacious"], roomWords: ["suite"] },
];

/** Words that never name a concept on their own. */
const STOP_WORDS = new Set([
  "a", "an", "and", "the", "with", "for", "in", "on", "at", "of", "to", "by", "near", "or",
  "place", "hotel", "hotels", "stay", "something", "somewhere", "good", "nice", "great",
  "friendly", "please", "want", "need", "like", "some", "very", "really", "has", "have",
  "free", "rooms", "room", "lots",
]);

/**
 * Lower-case words, apostrophes dropped. A hyphenated word gives its parts
 * and the joined form: "self-catering" → "self", "catering", "selfcatering".
 */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z0-9-]+/)
    .flatMap((word) => {
      const parts = word.split("-").filter(Boolean);
      return parts.length > 1 ? [...parts, parts.join("")] : parts;
    });
}

/** The pitch line: the description's first sentence, before the shared boilerplate. */
function pitch(description: string): string {
  return description.split(/(?<=\.)\s/)[0] ?? "";
}

/** The concepts the Preferences name, in order, each once. */
export function preferenceConcepts(preferences: string | null): Concept[] {
  if (!preferences) return [];
  const found: Concept[] = [];
  for (const word of words(preferences)) {
    if (STOP_WORDS.has(word)) continue;
    const concept = CONCEPTS.find((candidate) => candidate.words.includes(word));
    if (concept && !found.includes(concept)) found.push(concept);
  }
  return found;
}

/** A Preference chip key: `pref-` and the concept's id. */
export type PreferenceKey = `pref-${string}`;

export function isPreferenceKey(key: string): key is PreferenceKey {
  return key.startsWith("pref-");
}

/** The Criteria chips for the Preferences: one per concept they name, in order. */
export function preferenceChips(preferences: string | null): { key: PreferenceKey; label: string }[] {
  return preferenceConcepts(preferences).map((concept) => ({
    key: `pref-${concept.id}`,
    label: concept.label,
  }));
}

/**
 * The Preferences without the words that name one concept, so its chip can be
 * removed and the search re-run with no new Query interpretation. Null when
 * nothing but stop words is left.
 */
export function withoutPreference(preferences: string | null, key: PreferenceKey): string | null {
  if (!preferences) return null;
  const concept = CONCEPTS.find((candidate) => `pref-${candidate.id}` === key);
  if (!concept) return preferences;
  const kept = preferences
    .split(/\s+/)
    .filter((token) => !words(token).some((word) => concept.words.includes(word)))
    .join(" ")
    .trim();
  return words(kept).some((word) => !STOP_WORDS.has(word)) ? kept : null;
}

function overlaps(a: readonly string[] | undefined, b: readonly string[] | Set<string>): boolean {
  if (!a) return false;
  const set = b instanceof Set ? b : new Set(b);
  return a.some((value) => set.has(value));
}

function hotelShows(concept: Concept, hotel: KeywordHotel, hotelWords: Set<string>): boolean {
  return (
    overlaps(concept.categories, [hotel.category]) ||
    overlaps(concept.amenities, hotel.amenities) ||
    overlaps(concept.hotelWords, hotelWords)
  );
}

/**
 * A Hotel's keyword Relevance, 0–1: the share of the Preferences' concepts it
 * shows. 0 when the Preferences name no concept, so ranking falls back to the
 * Review score and price.
 */
export function keywordRelevance(concepts: readonly Concept[], hotel: KeywordHotel): number {
  if (concepts.length === 0) return 0;
  const hotelWords = new Set(words(`${hotel.name} ${hotel.area} ${pitch(hotel.description)}`));
  const shown = concepts.filter((concept) => hotelShows(concept, hotel, hotelWords)).length;
  return shown / concepts.length;
}

/**
 * Each Room type's meaning for `bestFit`, 0–1: the share of the room-level
 * concepts (those with `roomWords` or `roomAmenities`) its name or amenities
 * show. Empty when no concept is about rooms, so the cheapest room wins.
 */
export function roomMeanings(
  concepts: readonly Concept[],
  roomTypes: readonly KeywordRoomType[],
): Map<string, number> {
  const roomConcepts = concepts.filter((concept) => concept.roomWords || concept.roomAmenities);
  const meanings = new Map<string, number>();
  if (roomConcepts.length === 0) return meanings;
  for (const type of roomTypes) {
    const name = new Set(words(type.name));
    const shown = roomConcepts.filter(
      (concept) =>
        overlaps(concept.roomWords, name) || overlaps(concept.roomAmenities, type.amenities),
    ).length;
    meanings.set(type.id, shown / roomConcepts.length);
  }
  return meanings;
}
