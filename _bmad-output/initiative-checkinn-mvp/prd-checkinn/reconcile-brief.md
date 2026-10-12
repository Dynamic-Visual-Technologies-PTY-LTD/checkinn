# Reconcile: original brief vs PRD

**Brief (verbatim):** "we are building a booking.com clone https://www.booking.com/ it should have default search, return hotel listings, listings should be mock data, should have basic amenties listed for the hotel i.e bedsize for the rooms, ensuite bathroom, pool, location, breakfast included or not, ratings, price per room and whole booking in ZAR, hierarchy included hotel with multiple rooms. ... the search should be very basic search function and use better-sqlite3 for the DB"

**Follow-up answers:** a full mock booking flow like booking.com; all of the hotel page in scope but search basic; it's for an expo/workshop.

Checked against `prd-checkinn.md`, `addendum.md`, `.memlog.md` and `../ux-checkinn/EXPERIENCE.md`.

## Ask-by-ask

| Ask | Status | Where |
|---|---|---|
| booking.com clone | Met as layout and flow reference. Brand is deliberately not copied. | §0, §5 Look and feel, SM-C1 |
| default search | Met, with an interpretation (see G2) | FR-1 defaults, FR-2 |
| return hotel listings | Met | FR-5, FR-6 |
| mock data | Met: seed file | FR-25, FR-26 |
| bed size for rooms | Met for Single/Double. Queen/King dropped by decision. | FR-17, glossary Bed configuration |
| ensuite bathroom | Met as "Private bathroom" Room amenity (see G6) | FR-17 |
| pool | Met | FR-13, FR-6 (up to 3 Facilities) |
| location | Partly: area, City, province. Map and address dropped by decision. | FR-6, FR-9 |
| breakfast included or not | Dropped by decision, flagged | §6, OQ-3 |
| ratings | Met: stars and Review score /5 | FR-6, FR-12 |
| price per room and whole booking in ZAR | Met | FR-17 (Nightly price, Stay total), FR-18, FR-19, FR-20 |
| hotel → multiple rooms hierarchy | Met: 2 Room types per hotel (seed as-is) | Glossary, FR-17 |
| very basic search | Met for text matching. Availability filtering adds complexity (see G3). | §4.1, FR-3, FR-5 |
| better-sqlite3 | Met | addendum |
| full mock booking flow like booking.com | Met, and extended with manage/cancel | §4.6 |
| whole hotel page in scope | Met within seed limits | §4.3 |
| expo/workshop | Expo well covered. Workshop thin (see G4). | Vision, §5, §7.2, SM-1..3 |

## Gaps

| # | Severity | Gap | Where the fix lands |
|---|---|---|---|
| G1 | **High** | **"Clone" intent vs own brand: the divergence is not a logged user decision.** The brief says "booking.com clone". The PRD (§0, §5, SM-C1) decides on its own brand, with brand colours not copied and pixel likeness as a counter-metric. UX then adds a dark theme. No memlog entry records the user agreeing that "clone" means *flow clone, not look clone*, and OQ-5 (may it say "inspired by booking.com") is still open. An expo audience told "it's a booking.com clone" may expect recognisable booking.com look and feel. | §1 Vision: one sentence defining "clone" as layout and flow. Log it as a user-confirmed decision, or raise it as an Open Question next to OQ-5. |
| G2 | Medium | **"Default search" is interpreted, not confirmed.** The PRD reads it as "submit with an empty Destination returns all hotels" (FR-2) and "the bar has default values" (FR-1). The brief may instead mean that listings show by default without a search. Home in EXPERIENCE shows city tiles, not listings. The interpretation isn't tagged `[ASSUMPTION]`. | FR-2: tag the interpretation as `[ASSUMPTION]`, or state that Home shows no listings until a search runs. |
| G3 | Medium | **"Very basic search" vs what the PRD specifies.** FR-3 is basic. FR-5 is not: a capacity-fitting check (a set of N available Rooms whose sleeps-counts cover the Party, across every Night) plus a cheapest-combination price on every card (FR-6). That is the hardest logic in the app, and it sits in the search path the user asked to keep "very basic". It also produces the seed mismatch where "cape" returns 6 hotels (see reconcile-seed A1). | §4.1 description: acknowledge that search is basic in matching but availability-aware. Or simplify FR-5/FR-6 (e.g. filter only on "has availability"; price from the cheapest single Room type). PM call. |
| G4 | Medium | **The workshop purpose is barely expressed.** "Expo/workshop" turns into expo requirements (stand, phones, reset) plus SM-3, "runs from a fresh clone". Nothing says what workshop participants do with the codebase: build it in stages, extend it toward intelligent search, read it as an example. Vision says "keep search and data simple and well described", but no FR or NFR makes that testable (e.g. documented seed schema, a search function isolated so it can be swapped for RAG later). | §5 Cross-cutting: add a "Workshop-ready" item (search logic in one replaceable module; seed schema documented). §1 Vision already gives the reason. |
| G5 | Medium | **No Home page requirement.** The brief's entry point (a booking.com-style landing with search) has no FR. EXPERIENCE defines Home with a hero, the search bar and 6 city tiles (the presenter's "one-click path"), but traces it only to FR-1/FR-2. City tiles use seed city images that carry credit obligations (reconcile-seed B1). | §4.1: new FR "Home" (search bar, city tiles that run a search, photo credits). |
| G6 | Low | **"Ensuite" is renamed without a note.** The brief says "ensuite bathroom". The PRD uses the seed label "Private bathroom". Every Room type has it, so it never distinguishes rooms. That's fine, but a reader matching against the brief won't find the word. | Glossary, Room amenity: "Private bathroom (the brief's 'ensuite')". |
| G7 | Low | **"Price per room" is ambiguous.** It could mean nightly per room or stay total per room. The PRD shows both (FR-17), so it is covered. No action beyond noting it. | None. |
| G8 | Low | **The expo is a privacy edge.** Real visitors type their real name and email into a shared laptop instance. §5 keeps bookings out of the repo, but nothing nudges visitors to use demo details or clears the data at the end of the day beyond FR-26. EXPERIENCE Flow 4 mentions "a demo name". | FR-21: optional hint "Use any name, this is a demo". §5 Public repo hygiene: run reset after the expo. |

## Resolved by decision (not gaps)

- Breakfast: dropped because the seed has no field (memlog). Flagged as `[NOTE FOR PM]` and OQ-3.
- Queen/King bed sizes: seed has Single/Double only (memlog).
- Map and street address for "location": no seed data (memlog; live OSM rejected).
- Review quotes, location score, highlights: no seed data (memlog).
- 12 hotels with 2 room types each, not a richer hierarchy: seed used as-is (memlog override).
- Rating out of 5, not booking.com's 1–10 (memlog).
- Manage and cancel added beyond the reserve flow (memlog decision: bookings stored, can be looked up and cancelled).
- better-sqlite3 placed in the addendum, not the PRD body (memlog).
