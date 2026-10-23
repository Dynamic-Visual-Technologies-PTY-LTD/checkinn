// Rebuild the appended demo records from the preserved original prefix.
// Run with: node scripts/expand-demo-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";

const file = new URL("../data/seed/hotel-booking-demo.json", import.meta.url);
const seed = JSON.parse(readFileSync(file, "utf8"));
seed.cities = seed.cities.slice(0, 6);
seed.hotels = seed.hotels.slice(0, 12);
const destinations = [
  ["hermanus", "Hermanus", "Western Cape", "Overberg coastal streets", []],
  ["knysna", "Knysna", "Western Cape", "Garden Route lagoon district", []],
  ["plettenberg-bay", "Plettenberg Bay", "Western Cape", "Garden Route coastal neighbourhood", ["Plett"]],
  ["george", "George", "Western Cape", "Outeniqua foothill neighbourhood", []],
  ["oudtshoorn", "Oudtshoorn", "Western Cape", "Little Karoo town edge", []],
  ["franschhoek", "Franschhoek", "Western Cape", "Winelands village streets", []],
  ["ballito", "Ballito", "KwaZulu-Natal", "Dolphin Coast residential quarter", []],
  ["pietermaritzburg", "Pietermaritzburg", "KwaZulu-Natal", "Midlands city neighbourhood", ["Maritzburg"]],
  ["dullstroom", "Dullstroom", "Mpumalanga", "Highveld village edge", []],
  ["mbombela", "Mbombela", "Mpumalanga", "Lowveld urban neighbourhood", ["Nelspruit"]],
  ["polokwane", "Polokwane", "Limpopo", "city residential quarter", ["Pietersburg"]],
  ["bloemfontein", "Bloemfontein", "Free State", "central residential streets", ["Bloem"]],
  ["kimberley", "Kimberley", "Northern Cape", "historic town neighbourhood", []],
  ["rustenburg", "Rustenburg", "North West", "Magaliesberg foothill outskirts", []],
];
const stock = seed.hotels[11].images;
for (const [id, name, province, setting, aliases] of destinations) {
  seed.cities.push({ id, name, aliases, province, country: "South Africa", countryCode: "ZA",
    description: `Explore stays around the ${setting}.`,
    image: { url: stock[0].url, alt: "Illustrative guest bedroom; not a destination photograph",
      sourceUrl: stock[0].sourceUrl, creditInstructions: "Illustrative Unsplash stock photo, reused; not a photograph of this destination. Licence: https://unsplash.com/license", isIllustrative: true } });
}
const styles = [
  { category: "budget", title: "Pocket Lodge", price: 520, amenities: ["wifi", "parking"], atmosphere: "A practical, quiet base for solo travellers and short stopovers" },
  { category: "business", title: "Workday House", price: 1150, amenities: ["wifi", "parking", "meeting_rooms", "gym", "air_conditioning"], atmosphere: "An orderly business base for work trips and small meetings" },
  { category: "family", title: "Gathering Lodge", price: 980, amenities: ["wifi", "parking", "pool", "play_area", "kitchenette"], atmosphere: "An informal family base with space to settle into a longer holiday" },
  { category: "luxury", title: "Lantern Manor", price: 2850, amenities: ["wifi", "parking", "restaurant", "pool", "spa", "air_conditioning"], atmosphere: "A quiet, polished retreat for couples seeking an indulgent break" },
  { category: "wellness", title: "Stillwater Retreat", price: 1850, amenities: ["wifi", "parking", "spa", "pool", "restaurant"], atmosphere: "A restful adults-only retreat for unhurried wellness weekends" },
  { category: "self-catering", title: "Everyday Suites", price: 890, amenities: ["wifi", "parking", "kitchenette"], atmosphere: "A relaxed self-catering base for independent visitors and longer stays" },
  { category: "coastal", title: "Saltwind House", price: 1450, amenities: ["wifi", "parking", "restaurant", "pool"], atmosphere: "An easy-going coastal-style guest house for couples and families" },
  { category: "rural", title: "Fieldstone Lodge", price: 1280, amenities: ["wifi", "parking", "kitchenette", "play_area"], atmosphere: "An informal country-style lodge for families who prefer a slower pace" },
];
const facilities = { wifi: "free Wi-Fi", parking: "free parking", meeting_rooms: "meeting rooms", gym: "a gym", air_conditioning: "air conditioning", pool: "a swimming pool", play_area: "a children's play area", kitchenette: "room kitchenettes", restaurant: "a restaurant", spa: "a spa" };
// Existing destinations receive four additions each; new ones receive six.
const counts = seed.cities.map((_, index) => index < 6 ? 4 : 6);
for (const [cityIndex, city] of seed.cities.entries()) {
  for (let variant = 0; variant < counts[cityIndex]; variant++) {
    const number = seed.hotels.length + 1;
    const id = `hotel-${String(number).padStart(3, "0")}`;
    const coastalCities = ["cape-town", "durban", "gqeberha", "hermanus", "knysna", "plettenberg-bay", "ballito"];
    const candidate = styles[(cityIndex + variant) % styles.length];
    const style = candidate.category === "coastal" && !coastalCities.includes(city.id) ? { ...styles[7], title: "Meadow House" } : candidate;
    const base = style.price + cityIndex * 20 + variant * 35;
    const childrenAllowed = style.category !== "wellness";
    const roomAmenities = ["wifi", "private_bathroom", ...style.amenities.filter((key) => ["kitchenette", "air_conditioning"].includes(key))];
    const rooms = childrenAllowed ? [
      ["solo", "Solo Room", 1, [{ type: "single", count: 1 }], 0],
      ["double", "Comfort Double", 2, [{ type: "double", count: 1 }], 280],
      ["family", "Family Suite", 6, [{ type: "double", count: 2 }, { type: "single", count: 2 }], 950],
    ] : [
      ["solo", "Quiet Single", 1, [{ type: "single", count: 1 }], 0],
      ["double", "Retreat Double", 2, [{ type: "double", count: 1 }], 450],
      ["twin", "Retreat Twin", 2, [{ type: "single", count: 2 }], 550],
    ];
    seed.hotels.push({ id, cityId: city.id, name: `${city.name} ${style.title}`, isFictional: true,
      area: cityIndex < 6 ? `${city.name} outer quarter ${variant + 1}` : destinations[cityIndex - 6][3],
      category: style.category,
      description: `${style.atmosphere} in ${city.name}, ${city.province}. This fictional property sits around the ${cityIndex < 6 ? "outer residential streets" : destinations[cityIndex - 6][3]}, offering a base for exploring the surrounding destination. Facilities include ${style.amenities.map((key) => facilities[key]).join(", ")}. Every room has a private bathroom; ${childrenAllowed ? "solo rooms, doubles and six-person family suites suit different party sizes" : "single, double and twin rooms keep the atmosphere calm"}. ${variant % 2 === 0 ? "Pets are welcome" : "Pets are not accepted"}; ${variant % 3 === 0 ? "bookings are non-refundable" : "free cancellation is available until 48 hours before check-in"}. All prices and review figures are fictional demo data.`,
      starRating: style.category === "luxury" ? 5 : style.category === "budget" ? 2 : 4,
      reviewScore: Number((3.6 + ((cityIndex + variant) % 10) / 10).toFixed(1)), reviewScoreMax: 5, reviewCount: 30 + number * 3,
      currency: "ZAR", priceFromPerNight: base, amenities: style.amenities,
      images: seed.hotels[(number - 13) % 12].images.map((image) => ({ ...image, alt: `${image.alt} (illustrative stock photo; not this property)` })),
      checkInTime: variant % 2 === 0 ? "14:00" : "15:00", checkOutTime: "10:00", timeZone: "Africa/Johannesburg",
      policies: { childrenAllowed, petsAllowed: variant % 2 === 0, smokingAllowed: variant === 3,
        cancellation: { type: variant % 3 === 0 ? "non_refundable" : "free_until_48_hours_before_check_in" } },
      roomTypes: rooms.map(([suffix, name, maxGuests, beds, supplement], index) => ({ id: `${id}-${suffix}`, name, maxGuests, beds, pricePerNight: base + supplement, totalRooms: 3 + (number + index) % 12, amenities: roomAmenities })),
    });
  }
}
writeFileSync(file, `${JSON.stringify(seed, null, 2)}\n`);
