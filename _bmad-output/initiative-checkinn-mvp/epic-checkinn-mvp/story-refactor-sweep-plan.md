---
title: 'Refactor sweep'
type: 'refactor'
ticket: '14'
created: '2026-10-14'
status: 'built'
baseline_revision: '3041dd4c18f37798aa23402718316525f08a0c67'
route: 'full'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/deferred-work.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Stories 1 to 13 are on `main`, built by two people. Their reviews set aside cleanup for this story: tests that query by class or DOM structure against the project's testing rule, values declared in several places, two deferred-work items, and a double Availability read on the Hotel page. The epic also asks for a review of the AD-1 layering rule before the cross-cutting tests.

**Approach:** One sweep with no guest-visible change: fix what was deferred, check the layering by reading every import, settle or close the deferred-work items, and leave the app doing exactly what it does now.

## Boundaries & Constraints

**Always:** No guest-visible change: every existing e2e spec passes unmodified, except where a spec's own selector moves from structure to role or text. A test is changed only to query the same thing a better way; its expectation stays. A structural query stays only where no role, accessible name or text can express the check (content that is `aria-hidden`, a skeleton, or proving an element is absent), with a one-line comment saying why. **The layer order is Presentation → Application → Domain, with Data below Domain: `src/db` must not import `src/domain` in production code, and `src/domain` imports nothing from Next, React, `src/app`, `src/features`, `src/db` or `src/components`.** Where a value must be shared across that line (the cancellation policy and Booking status lists), keep a copy on each side and hold them equal with a unit test that may import both. Each cleanup is small and separately understandable. Record what was found and left, with reasons, under Implementation Notes.

**Never:** No new feature, copy change, schema change, dependency or config change. Never delete, skip or weaken a test to get a green run. Do not edit `.github/workflows/` or `infra/`. No renames or moves done only for taste.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Behaviour | The full unit and e2e suites before and after | Same tests and expectations, all passing | — |
| Layering | Every non-test import under `src/` | No breach of the rule above; `server-only` only in `queries.ts` and `actions.ts`; components and client files import nothing from `src/db`, `*.repo.ts`, `queries.ts` or `src/features` (server actions arrive as props or through `actions.ts`) | Any breach is fixed, or listed with the reason it stays |
| Policy and status values | `free_until_48_hours_before_check_in`, `non_refundable`, `confirmed`, `cancelled` | One definition in the domain that app, features and components import; the schema's own copy held equal by a test | — |
| Availability on the Hotel page | A Hotel page with a Stay and a room-unavailable notice | One Availability read per request, shared by the alert and the room table | — |
| Unit stability | `npm test` 10 times in a row | 10 clean runs | A failure is named and its cause fixed |

</intent-contract>

## Code Map

- **Tests against the rule.** `grep -rc "toHaveClass\|querySelector\|\.closest(\|firstElementChild\|parentElement" src e2e` finds 39 matches in 19 test files. AGENTS.md: "Query by role and accessible name in tests, not by test id or class." A `toHaveClass` on an element already found by role or text that checks a design token is an expectation, not a query; leave those.
- **Values declared several times.** Policy and status literals appear in `src/db/schema.ts`, `src/domain/types.ts`, `src/domain/cancellation.ts`, `src/features/booking/booking.repo.ts`, `src/features/hotels/availability.repo.ts`, `src/app/bookings/[reference]/booking-content.tsx` and `e2e/support/booking.ts`.
- **Double Availability read.** `src/app/hotels/[hotelId]/availability-section.tsx` calls `getAvailability(hotel.hotelId, stay)` twice (around lines 130 and 150: the room-unavailable alert and the results), each in its own Suspense boundary. Wrap the query in React `cache` keyed on primitive values, as `getHotelPage` is.
- **Deferred list.** `_bmad-output/initiative-checkinn-mvp/deferred-work.md` has two items. (1) Home's default Tailwind sizes: `src/app/page.tsx` and `src/app/home-search.tsx` no longer use `text-4xl`, `text-lg`, `max-w-md` or `px-6`; confirm and remove. (2) The two-month Dates popover at tablet widths: `src/components/popover.tsx` now takes a `placement` prop; check `/` and `/search` at 768–1023px with the Dates popover open for horizontal overflow; remove the item if it no longer overflows, otherwise fix it with `placement` (a direct correction) and add an e2e check.
- **Flaky tests.** `vitest.config.mts` already raises the timeout and caps workers (PR #10). Run the suite 10 times; if anything fails, find and fix it.
- **Layering.** As of `3041dd4`, `src/domain` imports nothing it shouldn't and `src/db` imports no domain module in production code; confirm by reading every file, and list the files checked by layer in the notes.
- **Product decisions stay open, not closed here:** copy written where the UX documents gave none (listed in the story 8 to 13 plans), the `checkinn_booked` cookie, focus after a final cancel refusal.

## Tasks & Acceptance

**Execution:**
- [x] `src/**/*.test.ts(x)`, `e2e/**/*.spec.ts` -- replace class and structure queries with role, name or text queries where one exists; comment the ones that stay.
- [x] `src/domain/` and its users, `src/db/schema.ts` + a schema test -- one domain definition each for the policy and status values; the schema's copy held equal by a test.
- [x] `src/features/hotels/queries.ts`, `src/app/hotels/[hotelId]/availability-section.tsx` -- one Availability read per request.
- [x] `_bmad-output/initiative-checkinn-mvp/deferred-work.md` (and `src/components/popover.tsx` if needed) -- settle both items.
- [x] `src/` -- AD-1 import review; list files checked by layer and any breach.
- [x] `npm test` 10 runs -- fix any failure found.

**Acceptance Criteria:**
- Given the sweep, when lint, typecheck, test, build and e2e run, then all are green with the same number of tests or more.
- Given `npm test` run 10 times in a row, then every run is clean.
- Given the import review, then the notes list every file checked by layer and any breach left, with its reason.

## Implementation Notes

**Tests against the rule.** The grep found 38 matching lines in 19 unit test files and none in `e2e/`. A wider search of `e2e/` for `locator(` found 10 more CSS selectors. Unit tests went from 645 to 649: the 4 new ones are in `src/db/schema.test.ts`.

Changed to role, name or text queries, with the same expectations:

- `src/app/bookings/[reference]/page.test.tsx`: the Status row is found with a `definitionOf(term)` helper, which pairs the `term` and `definition` roles. It replaces `getByText("Status").closest("div")` in 2 places.
- `src/app/hotels/[hotelId]/photo-viewer.test.tsx`: swipes touch the photo itself (`getByRole("img")`) instead of its `parentElement`, and the events bubble up to the swipe area (2 places).
- `src/components/city-tiles.test.tsx`: "credit outside the tile link" now checks that `within(tile).queryByRole("link", { name: "Photo credit: Cape Town" })` is null, instead of using `parentElement?.closest("a")`.
- `src/components/listing-card.test.tsx`: the nightly price paragraph is found by its text "a night", and the price is checked inside it. This replaces `getByText("R 2 450").parentElement`.
- `src/components/range-calendar.test.tsx`: a day's cell is the `gridcell` that holds the named day button (`cellOf`), instead of `closest("td")`. Testing-library gives gridcells an empty name, so `getByRole("gridcell", { name })` does not work.
- `e2e/home.spec.ts`: `main#main` is now `getByRole("main")` (2 places).
- `e2e/room-table.spec.ts` and `e2e/support/booking.ts`: calendar days are found with `getByRole("button", { name: /^<day label>/ })` instead of `[aria-label^=…]` (3 places).
- `e2e/booking/uj-3.spec.ts`: `select.getByRole("option")` replaces `locator("option")`.

Kept as structural queries, each with a one-line comment saying why:

- Skeletons, which are aria-hidden and have no role or text: the tests for `book/page`, `bookings/[reference]/page`, `credits/page`, `hotels/[hotelId]/page`, `manage/page`, `search/page`, `page` and `home-search`, plus the skeleton tests in `city-tiles` and `listing-card`.
- Checks that content is aria-hidden: the review panel parts in `hotels/[hotelId]/page.test.tsx`, and the decorative icons in `icons.test.tsx` (2).
- Checks that an element is absent: no `<img>` remains after a photo fails, in `remote-image.test.tsx` and `e2e/home.spec.ts`. The placeholder also has role img, so a role query can't tell them apart.
- Elements with no role or name: the dialog backdrop (`dialog.test.tsx`), the bare `aria-live` total (`booking-summary.test.tsx`), the Dates field wrapper and the wrapper that hides the bar on phones (`search-bar.test.tsx`, 3), and in `e2e/home.spec.ts` the `<html lang>` attribute and the two decorative logo images (3).
- Expectations, not queries, so left as they are (per the Code Map): `toHaveClass` on elements already found by role or text, in the `photo-viewer`, `listing-card`, `page-heading`, `reference-block`, `remote-image` and `search-bar` tests.
- Not in tests: `querySelector` and `closest` in `src/components/focus.ts`, `range-calendar.tsx` and `hotel-actions.tsx` are production DOM code, so they are out of scope.

**Policy and status values.** `src/domain/types.ts` now defines `CANCELLATION_POLICIES` and `BOOKING_STATUSES` as `const` arrays, and derives the `CancellationPolicy` and `BookingStatus` types from them. `BookingStatusView`, used only inside `types.ts`, became `BookingStatus`. `cancelState` in `src/domain/cancellation.ts` now takes `BookingStatus` instead of an inline union.

`src/db/schema.ts` keeps its own `BOOKING_STATUSES` and its `IN ('confirmed', 'cancelled')` check, now commented as the data layer's copy. The new `src/db/schema.test.ts` holds the two sides equal:

- the two status lists match
- the database accepts every domain status and refuses any other
- the seeded catalog's policies are exactly `CANCELLATION_POLICIES`

`e2e/support/booking.ts` now types its policy literal with `satisfies CancellationPolicy`. The other literals in `booking.repo.ts`, `availability.repo.ts`, `booking-content.tsx` and `booking-view.tsx` are uses that TypeScript checks against these types, not separate definitions, so they stay.

Left as they are: the three `as CancellationPolicy` casts in `booking.repo.ts`, `hotel.repo.ts` and `search.repo.ts`. They cast the schema's plain `string` column. The new seed test guards the values they cast, and narrowing the column type would be a schema change.

**Availability on the Hotel page.** `getAvailability` in `src/features/hotels/queries.ts` now calls a React `cache` wrapper keyed on `(hotelId, checkIn, checkOut)`. Its signature is unchanged. I checked it on `next dev` with a temporary log, since removed: a Hotel page request with a Stay and `notice=room-unavailable` read Availability once.

The exported `getAvailability` stays `async` and awaits `io()` itself before the cached read (AD-2). The cached inner function only reads.

`getHotelPage` was not cached, although the Code Map says it was. Both `generateMetadata` and `HotelContent` call it, so the Hotel page read the catalog twice per request. After review it got the same fix: it awaits `io()`, then calls a React `cache` wrapper keyed on the Hotel id, so the title and the content share one read. Its signature is unchanged.

**Deferred list.** Both items are removed from `deferred-work.md`, which is now empty.

1. `src/app/page.tsx` and `src/app/home-search.tsx` no longer use any of `text-4xl`, `text-lg`, `gap-4`, `px-6` or `max-w-md`.
2. I opened the Dates popover on `/` and `/search?q=Cape+Town` at 768, 800, 850, 900, 950, 1000 and 1023px (Chromium, `next dev`). The popover spans x=33 to x=728 at every width, and the page never scrolls sideways. `popover.tsx` needed no change, and `e2e/home.spec.ts` already checks that the popover fits at 768, 1024 and 1280px.

**AD-1 import review.** Every non-test file was checked, covering both `from` imports and side-effect imports.

- **Domain** (13 files): `src/domain/availability.ts`, `src/domain/cancellation.ts`, `src/domain/clock.ts`, `src/domain/criteria.ts`, `src/domain/dates.ts`, `src/domain/guest.ts`, `src/domain/hotel.ts`, `src/domain/lookup.ts`, `src/domain/pricing.ts`, `src/domain/reference.ts`, `src/domain/search.ts`, `src/domain/selection.ts`, `src/domain/types.ts`. They import only `@/domain/*`. Nothing from Next, React, app, features, db or components.
- **Data** (4 files): `src/db/client.ts`, `src/db/reset.ts`, `src/db/schema.ts`, `src/db/seed.ts`. They import only `node:*`, `better-sqlite3`, `drizzle-orm*` and `@/db/*`. No domain imports. `src/db/test-db.ts` imports the `Stay` type from the domain, which is allowed: it is a test helper that only `*.test.ts` files import.
- **Application** (11 files): `src/features/booking/access.ts`, `src/features/booking/actions.ts`, `src/features/booking/booking.repo.ts`, `src/features/booking/queries.ts`, `src/features/hotels/availability.repo.ts`, `src/features/hotels/catalog.repo.ts`, `src/features/hotels/credits.repo.ts`, `src/features/hotels/hotel.repo.ts`, `src/features/hotels/queries.ts`, `src/features/search/queries.ts`, `src/features/search/search.repo.ts`. They import db, domain, Next and other features. `server-only` appears only in the three `queries.ts` files and `actions.ts`. Some features import from other features. AD-1 forbids none of these imports, so they are noted and not changed:
  - `booking` → `hotels/availability.repo` (allowed by AD-4)
  - `search/search.repo` → `hotels/availability.repo`, and `search/queries` → `hotels/catalog.repo` (AD-7 relies on both)
  - `hotels/hotel.repo` → `search/search.repo`, for `labels`
- **Presentation, `src/components/`** (30 files): `src/components/booking-confirmation.tsx`, `src/components/booking-steps.tsx`, `src/components/booking-summary.tsx`, `src/components/button-styles.ts`, `src/components/cancellation-line.tsx`, `src/components/city-tiles.tsx`, `src/components/copy-fallback-dialog.tsx`, `src/components/date-range-field.tsx`, `src/components/dialog.tsx`, `src/components/error-summary.tsx`, `src/components/focus.ts`, `src/components/form-field.tsx`, `src/components/icons/icons.tsx`, `src/components/listing-card.tsx`, `src/components/mobile-summary-bar.tsx`, `src/components/occupancy-field.tsx`, `src/components/page-heading.tsx`, `src/components/popover.tsx`, `src/components/range-calendar.tsx`, `src/components/reference-block.tsx`, `src/components/remote-image.tsx`, `src/components/search-bar.tsx`, `src/components/search-state.tsx`, `src/components/server-action.ts`, `src/components/site-footer.tsx`, `src/components/site-header.tsx`, `src/components/skip-link.tsx`, `src/components/stars.tsx`, `src/components/toast.tsx`, `src/components/use-media-query.ts`. They import only `@/components/*`, `@/domain/*` and `@/lib/*`. No db, repo, queries or features.
- **Presentation, `src/app/` server files** (18 files): `src/app/book/book-content.tsx`, `src/app/book/page.tsx`, `src/app/bookings/[reference]/booking-content.tsx`, `src/app/bookings/[reference]/booking-view.tsx`, `src/app/bookings/[reference]/page.tsx`, `src/app/credits/page.tsx`, `src/app/credits/photo-credits.tsx`, `src/app/home-search.tsx`, `src/app/hotels/[hotelId]/availability-section.tsx`, `src/app/hotels/[hotelId]/hotel-details.tsx`, `src/app/hotels/[hotelId]/page.tsx`, `src/app/layout.tsx`, `src/app/manage/manage-content.tsx`, `src/app/manage/page.tsx`, `src/app/not-found.tsx`, `src/app/page.tsx`, `src/app/search/page.tsx`, `src/app/search/search-results.tsx`. They reach data only through `queries.ts`, never `src/db` or `*.repo.ts`.
- **Presentation, `src/app/` client files** (12 files): `src/app/book/booking-details-form.tsx`, `src/app/bookings/[reference]/cancel-booking.tsx`, `src/app/bookings/[reference]/cancelled-alert.tsx`, `src/app/error.tsx`, `src/app/hotels/[hotelId]/availability-alert.tsx`, `src/app/hotels/[hotelId]/hotel-actions.tsx`, `src/app/hotels/[hotelId]/photo-viewer.tsx`, `src/app/hotels/[hotelId]/reserve-button.tsx`, `src/app/hotels/[hotelId]/room-selection.tsx`, `src/app/hotels/[hotelId]/room-table.tsx`, `src/app/hotels/[hotelId]/stay-party-picker.tsx`, `src/app/manage/manage-booking-form.tsx`. None of them import from `src/db`, `*.repo.ts` or `queries.ts`. Four import one server action each from `@/features/booking/actions` (`confirmBooking`, `cancelBooking`, `startBooking`, `findBooking`), which the rule allows.
- **Other** (3 files): `src/lib/clipboard.ts`, `src/lib/format.ts` and `scripts/db-reset.ts` (which imports only db) are clean.
- **Result**: no breach found.

**Unit stability.** `npm test` ran 10 times in a row with 649 tests each time. All 10 runs were clean, so no fix was needed.

**Verification.** All green:

- `npm run lint`
- `npm run typecheck`
- `npm test`: 649 passed
- `npm run build`: `data/checkinn.db` was not touched; its timestamps did not change
- `npm run design:lint`: 0 errors, 0 warnings
- `npm run test:e2e`: 160 passed, 6 skipped by the specs' own phone-only skips

## Plan Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 4 findings — high 0, medium 0, low 4, false 0, maybe-false 0
- findings:
  - `[low]` `[patch]` The AD-1 notes summarised the `src/app` server files and miscounted `src/components/` (28, not 30) instead of listing every file checked — the notes now list every file by path under its layer.
  - `[low]` `[patch]` The cached `getAvailability` no longer awaited `io()` itself, against AD-2 — it is async again and awaits `io()` before the per-request cached read. The same per-request cache now also covers `getHotelPage`, which the page title and content read twice (found by the implementer).
  - `[low]` `[reject]` No automated test proves one Availability read per request — React's request `cache` only operates inside a real server render, so a unit test cannot observe it; it was checked on the dev server with a temporary log.
  - `[low]` `[reject]` The new domain constant arrays are imported only by the schema test, while app, features and components compare typed literals — those comparisons are type-checked against `CancellationPolicy` and `BookingStatus`, which derive from the constants, so the one definition holds and swapping in the constants adds no safety.

## Design Notes

- An earlier sweep on a diverged branch first made the schema import the domain and had to undo it; the rule above about the layer order and the equality test comes from that review.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` created by the build.
- `npm run test:e2e` -- expected: all specs pass on every project.
- `npm run design:lint` -- expected: passes.
- `for i in 1 2 3 4 5 6 7 8 9 10; do npm test || break; done` -- expected: 10 clean runs.

## Auto Run Result

Status: built (2026-10-14).

**Summary:** A cleanup sweep with no guest-visible change, on `main`'s code. Tests query by role, name or text where they can, with a reason comment on each structural query left. The cancellation policy and Booking status values have one definition in the domain, with the schema's own copy held equal by `src/db/schema.test.ts`. The Hotel page reads Availability and the Hotel once per request. Both deferred-work items are settled and the list is empty. The AD-1 import review found no breach and lists every file checked.

**Review:** 4 findings, all low. Patched: 2 (complete file list in the AD-1 notes; `getAvailability` awaits `io()` itself, and `getHotelPage` shares one read per request). Deferred: 0. Rejected: 2 (no unit test can observe React's request cache; typed literals already hold the single definition).

**Follow-up review recommended:** false (patched: high 0, medium 0, low 2).

**Verification (after the patches):** `npm run lint` clean; `npm run typecheck` clean; `npm test` passed, and 10 runs in a row were clean before the patches; `npm run build` succeeds; `npm run test:e2e` passed on all four projects; `npm run design:lint` 0 errors, 0 warnings.

**Residual risks:**
- Three repos cast the schema's text column `as CancellationPolicy`; the seed test checks the values, but removing the casts would need a schema change.
- Some features import from other features (for example `hotels/hotel.repo` uses `labels` from `search/search.repo`); AD-1 does not forbid it.
- The shared Availability `Map` must not be changed by its callers; none does today.
