---
title: 'Availability core, pricing and searchHotels'
type: 'feature'
ticket: '6'
created: '2026-10-13'
status: 'ready-for-dev'
baseline_revision: ''
route: 'full'
route_source: 'auto'
risk: 'high'
review: ''
review_source: ''
lenses_ran: []
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing can list Hotels for a Destination and Stay, count free Rooms, or price a Stay. Search, the Hotel page and booking all depend on one correct Availability and pricing core (AD-4, AD-7, AD-9).

**Approach:** Add the `bookings` and `booking_lines` tables (AD-16 schema). `availabilityFor(db, hotelId, stay)` is the only Availability computation, backed by pure `countAvailable` in `src/domain/availability.ts`. Pure matching, filtering, ranking and heading go in `src/domain/search.ts`, totals in `src/domain/pricing.ts`, and `formatZar` in `src/lib/format.ts`. `searchHotels(criteria)` in `src/features/search/queries.ts` ties them together. `SearchCriteria`, `SearchResult` and `ListingCard` are documented in `src/domain/types.ts` as the replacement seam for intelligent search.

## Boundaries & Constraints

**Always:** A Booking covers Night n when check-in ≤ n < check-out. Only `confirmed` lines whose Stay overlaps (`check_in < :checkOut AND check_out > :checkIn`) count. A Room type's count is `totalRooms` minus the busiest Night; it is available at ≥ 1, so 0-inventory types never are. Matching (FR-3) is a trimmed, case-insensitive substring match on City name, aliases, province, Hotel area and Hotel name; an empty query matches all. A Hotel is listed only if a Room type is available for every Night (FR-5); Party size never hides it. Order is Review score descending, then lowest available Nightly price (FR-7). Headings follow FR-7 exactly. Card price = lowest available Nightly × Nights × Party rooms; the line reads "2 nights, 2 adults: from R 4 900" with the Nightly underneath (FR-6). Review labels follow PRD L186. Money is integer rand in `…Rand` fields; totals come only from `pricing.ts`; display goes only through `formatZar(amount, { cents })` (`Intl` `en-ZA`, so the separators are U+00A0). `searchHotels` calls `await io()` first and imports `server-only`; the sync core takes `db`. Domain files import nothing from Next, React or db.

**Never:** No booking creation, server actions, references or confirm transaction (story 11). No `/search` page or UI (story 7). No `"use cache"`. No new dependencies. Catalog tables stay seed-only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cape Town | q "Cape Town", 2026-11-13→15, 2/0/1 | 2 results, heading "Cape Town: 2 properties found"; first is Harbourlight Retreat, total 4 900, line "2 nights, 2 adults: from R 4 900" | — |
| Province match | q " cape " | 6 results (heading "6 properties found"); Oak & Vine above Harbourlight (4.8 tie, lower price) | — |
| Empty query | q "" | 12; "All destinations: 12 properties found" | — |
| One | q "Waterfront" | "1 property found" | — |
| Fully booked | Fixture lines fill every Room type of a Hotel on one Night of the Stay | Hotel excluded | — |
| Night coverage | Booking 13→15; Stay 15→16 / 12→13 / 14→15 | Not counted / not counted / counted | — |
| Zero inventory | Table View Family Room (0) | Never available; card price from the Standard | — |
| No match | q "Bloemfontein" | 0 results; empty cards; heading null | — |
| Stay null | `criteria.stay` null | No query runs; empty result | — |
| formatZar | 4900 / `{cents:true}` | "R 4 900" / "R 4 900,00" (U+00A0) | — |

## Decisions (user, 2026-10-13)

- **Bookings schema:** add the full AD-16 `bookings` and `booking_lines` tables now, in one generated migration: integer PK, status `confirmed`/`cancelled`, Stay, guest, snapshot price columns, cancellation policy and deadline, `created_at`/`cancelled_at`. Story 11 only writes to them.
- **Card facilities:** the first 3 seed amenities, skipping `wifi` (Harbourlight: Swimming pool, Spa, Restaurant), labelled from the seed's `amenityLabels`. This overrides the mockup's Wi-Fi chip.

</frozen-after-approval>

## Code Map

- `src/db/schema.ts` -- catalog tables; `hotels.reviewScore`, `reviewCount`, `amenities`, `policies.cancellation.type`, `room_types.pricePerNightRand`, `totalRooms`. Add the bookings tables here; run `npm run db:generate` for `drizzle/0001_*`.
- `src/db/reset.ts` -- empties every table generically, so the new tables need no change; check the reset test still passes.
- `src/db/test-db.ts` `createTestDb()` -- seeded `:memory:` DB for repo tests (`// @vitest-environment node`, as in `src/features/hotels/catalog.repo.test.ts`).
- `src/features/search/queries.ts` -- `getCityTiles()` shows the `server-only` + `await io()` + `getDb()` pattern.
- `src/domain/types.ts` -- `Stay`, `Party`, and `SearchCriteria` (story 5). Add `SearchResult`, `ListingCard`.
- `data/seed/hotel-booking-demo.json` -- `amenityLabels`; Harbourlight `hotel-001`, Standard 2450 ×10, Family 3000 ×4; Table View `hotel-002`, Family `totalRooms` 0.
- PRD FR-3, FR-5–FR-8, FR-19, FR-20 (L107-155, L234-243), labels L186, glossary L61-80.

## Tasks & Acceptance

**Execution:**
- [ ] `src/db/schema.ts`, `drizzle/0001_*` -- the bookings tables plus an index on `(hotel_id, check_in, check_out)` or on the lines' `room_type_id`.
- [ ] `src/domain/availability.ts` + test -- `nightsOf(stay)`, `countAvailable(totalRooms, lines, stay)`.
- [ ] `src/features/hotels/availability.repo.ts` + test -- `availabilityFor(db, hotelId, stay): Map<string, number>` with the fixture bookings.
- [ ] `src/features/hotels/queries.ts` -- an async wrapper with `await io()` (AD-4).
- [ ] `src/domain/pricing.ts` + test -- `stayTotalRand(nightlyRand, nights, rooms)`, `fromPrice`.
- [ ] `src/lib/format.ts` + test -- `formatZar`.
- [ ] `src/domain/search.ts` + test -- `matches`, `rank`, `heading`, `reviewLabel`, `cardFacilities`.
- [ ] `src/features/search/search.repo.ts` + test -- `searchCatalog(db, criteria): SearchResult`, covering every matrix row on `createTestDb()`.
- [ ] `src/features/search/queries.ts` -- `searchHotels(criteria)`: `await io()`, then `searchCatalog(getDb(), criteria)`.
- [ ] `src/domain/types.ts` -- `SearchResult { heading: string | null; cards: ListingCard[] }`, plus `ListingCard` (hotelId, name, category, starRating, area, cityName, reviewScore, reviewLabel, reviewCount, facilities, cancellation, firstImage, nights, adults, totalRand, nightlyRand) with doc comments marking the seam.

**Acceptance Criteria:**
- Given a fresh clone, when `npm run dev` starts, then the new migration applies and Home still shows 6 tiles summing to 12.
- Given a replacement `searchHotels` with the same signature and types, then no caller needs to change (doc comment says so).

## Implementation Notes

## Plan Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `npm run test:e2e` -- expected: all pass (Home unaffected).
