---
title: 'Availability core, pricing and searchHotels'
type: 'feature'
ticket: '6'
created: '2026-10-13'
status: 'built'
baseline_revision: '392c341696639db42599545653da921a3395838a'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: false
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
- [x] `src/db/schema.ts`, `drizzle/0001_*` -- the bookings tables plus an index on `(hotel_id, check_in, check_out)` or on the lines' `room_type_id`.
- [x] `src/domain/availability.ts` + test -- `nightsOf(stay)`, `countAvailable(totalRooms, lines, stay)`.
- [x] `src/features/hotels/availability.repo.ts` + test -- `availabilityFor(db, hotelId, stay): Map<string, number>` with the fixture bookings.
- [x] `src/features/hotels/queries.ts` -- an async wrapper with `await io()` (AD-4).
- [x] `src/domain/pricing.ts` + test -- `stayTotalRand(nightlyRand, nights, rooms)`, `fromPrice`.
- [x] `src/lib/format.ts` + test -- `formatZar`.
- [x] `src/domain/search.ts` + test -- `matches`, `rank`, `heading`, `reviewLabel`, `cardFacilities`.
- [x] `src/features/search/search.repo.ts` + test -- `searchCatalog(db, criteria): SearchResult`, covering every matrix row on `createTestDb()`.
- [x] `src/features/search/queries.ts` -- `searchHotels(criteria)`: `await io()`, then `searchCatalog(getDb(), criteria)`.
- [x] `src/domain/types.ts` -- `SearchResult { heading: string | null; cards: ListingCard[] }`, plus `ListingCard` (hotelId, name, category, starRating, area, cityName, reviewScore, reviewLabel, reviewCount, facilities, cancellation, firstImage, nights, adults, totalRand, nightlyRand) with doc comments marking the seam.

**Acceptance Criteria:**
- Given a fresh clone, when `npm run dev` starts, then the new migration applies and Home still shows 6 tiles summing to 12.
- Given a replacement `searchHotels` with the same signature and types, then no caller needs to change (doc comment says so).

## Implementation Notes

- Migration `drizzle/0001_bookings.sql`. Besides the plan's columns, `bookings` has `reference`, `idempotency_key` and `access_token` (each `UNIQUE`, AD-10/AD-15) so story 11 needs no schema change, plus CHECKs on status, `check_out > check_in` and line `quantity > 0`. Indexes on `bookings(hotel_id, check_in, check_out)` and `booking_lines(room_type_id)`; lines have PK `(booking_id, room_type_id)`. `AUTOINCREMENT` adds `sqlite_sequence`, which the reset skips (ids are not reset; harmless, they are internal).
- `"Waterfront"` heading: FR-7's one-City rule applies, so it reads "Cape Town: 1 property found" (the matrix's "1 property found" is the count phrase). An empty Destination always reads "All destinations: …".
- `ListingCard.cancellation` is `{ policy, label }` and `firstImage` is `{ url, alt } | null`. The card price line is built by `stayPriceLine(nights, adults, totalRand)` in `src/lib/format.ts`, next to `formatZar`, so the domain stays free of formatting.
- Amenity labels are not in the database: `search.repo.ts` reads the seed's `amenityLabels` once per process via `loadSeed()` (`Seed` type gained the field).
- `pricing.ts` also exports `bookingTotalRand` for story 11; `availability.ts` exports `isAvailable`.
- `insertTestBooking` in `src/db/test-db.ts` writes fixture Bookings for repo tests only.
- `src/features/hotels/queries.ts` exports `getAvailability(hotelId, stay)`.

- Correction (orchestrator, 2026-10-13): one result now always reads "1 property found" (PRD FR-7 L151, matrix row "One"), overriding the City and "All destinations" prefixes; the earlier note above saying "Cape Town: 1 property found" is superseded.

## Plan Change Log

## Review Triage Log

### 2026-10-13 — Review pass
- verdicts: 4 findings — high 0, medium 0, low 3, false 1, maybe-false 0
- findings:
  - `[low]` `[patch]` `heading()` vs the Implementation Notes on single results — the code matches FR-7 and the matrix; the stale note was corrected (appended) and the misleading test title "says All destinations…" was split into an FR-7 single-result test.
  - `[low]` `[reject]` Unchecked `cancellation.type as CancellationPolicy` and no CHECK on `bookings.cancellation_policy` — the seed has only the two known values and story 11 writes the column; a guard or constraint adds complexity no current path needs.
  - `[low]` `[reject]` Room types are queried twice per Hotel in `searchCatalog` — correct and AD-4 is kept; merging means refactoring `availabilityFor`'s return shape, not a direct correction; 12 Hotels.
  - `[false]` `[reject]` AC 1 unproven — verified: a copy of the existing dev DB (1 migration, catalog only) opened through `openDb` applied `0001` (2 migrations, `bookings` present), and `listCityTiles` returned 6 tiles summing to 12.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `npm run test:e2e` -- expected: all pass (Home unaffected).

## Auto Run Result

- **Summary:** bookings and booking_lines tables (full AD-16 schema, migration `0001_bookings`); `availabilityFor` plus pure `countAvailable`; pricing, `formatZar`; pure search rules; `searchCatalog`/`searchHotels` with documented `SearchCriteria`/`SearchResult`/`ListingCard` seam.
- **Files:** `src/db/schema.ts`, `drizzle/0001_bookings.sql` + meta (bookings schema); `src/db/seed.ts` (`amenityLabels` on `Seed`); `src/db/test-db.ts` (`insertTestBooking`); `src/db/reset.test.ts` (reset clears bookings); `src/domain/availability.ts`, `pricing.ts`, `search.ts` + tests (pure rules); `src/domain/types.ts` (`ListingCard`, `SearchResult`); `src/lib/format.ts` + test (`formatZar`, `stayPriceLine`); `src/features/hotels/availability.repo.ts` + test, `queries.ts` (Availability); `src/features/search/search.repo.ts` + test, `queries.ts` (`searchHotels`).
- **Review:** 1 patch (low: test title and note correction), 0 deferred, 3 rejected (2 low, 1 false; reasons in the triage log). Pre-review, the orchestrator fixed `heading()` to FR-7's single-result wording after the matrix audit found a disagreement.
- **Follow-up review recommended:** false (patched: 0 high, 0 medium, 1 low).
- **Verification:** lint, typecheck, `npm test` (266 passed), `npm run build`, `npm run test:e2e` (45 passed, 3 desktop-only skips on mobile); a migration check on a copy of the dev DB.
- **Residual risks:** a few queries per Hotel (fine for 12, would need batching at scale); `bookings` ids keep counting after a reset (`sqlite_sequence` is skipped), and they never show in the UI.
