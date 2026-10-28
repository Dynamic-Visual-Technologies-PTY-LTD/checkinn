---
title: 'Room table, selection and Reserve'
type: 'feature'
ticket: '10'
created: '2026-10-13'
status: done
baseline_revision: '5b2f2d99c17ef94f33a31fb4573365b431b946ef'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'auto'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-hotel.html'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Hotel page and Search results show "Those dates have passed. Pick new ones." for every stay problem, not only past dates.
    evidence: |-
      `hotel-details.tsx` and `availability-section.tsx` treat any `problems` with a null `stay` as stale and show `STALE_LINK_MESSAGE`; `/search` (story 1.7) does the same. For `stay-too-long`, `stay-order`, `stay-malformed` or `party-invalid`, `problemMessage` in `criteria.ts` has better copy. Fix both pages together.
    location: >-
      src/app/hotels/[hotelId]/availability-section.tsx
    severity: low
  - summary: >-
      Slow interaction unit tests time out at 5 s in full `npm test` runs (6 failures in one run here).
    evidence: |-
      `date-range-field`, `range-calendar`, `home-search` tests; each passes alone. Same as the deferred item in the story 1.9 plan; likely fix is `testTimeout` or a worker cap in `vitest.config.mts`, which needs the user's approval.
    location: >-
      vitest.config.mts
    severity: medium
---

<intent-contract>

## Intent

**Problem:** The Hotel page ends in an empty "Availability" stub. A guest can't pick dates, see which Room types are free or what they cost, choose rooms or start a booking (FR-16 to FR-18).

**Approach:** Replace the stub with the Availability section: the Stay and Party picker (no-dates and stale-link states), the room table (cards on phone), the booking summary and the phone summary bar with the party-fit check, and a `startBooking` server action that validates the selection, mints the idempotency key `k` and redirects to `/book`. Also add the shared action result type, a pure `cancellationDeadline`, and the room-ran-out alert slot, so entries 11 and 12 only plug in.

## Boundaries & Constraints

**Always:** Follow AD-1, AD-2, AD-4, AD-8, AD-9, AD-10, AD-11, AD-13. `searchParams` and `params` are awaited only inside Suspense; data reads call `await io()` first; availability only through `getAvailability`; all totals only in `pricing.ts`; all dates and clock reads through `domain/clock.ts`. Client components import no repo, `queries.ts` or db code; they may call the server action. A `"use server"` file exports only async functions (types allowed, no constants).

**Section** (replaces the stub in `hotel-details.tsx`, keeps `<section id="availability-<hotelId>">` and the `h2 "Availability"` with `availabilityHeadingId` and `tabIndex={-1}`, so See rooms keeps working): top slot for the room-ran-out alert; step indicator (`ol`, "Your selection" `aria-current="step"`, as in the mockup); h2; picker; then the table and summary. At 1024px+ the summary is sticky beside the table; 768-1023px under it; below 768px cards plus the summary bar.

**Picker:** Dates and Occupancy only, the existing `DateRangeField` and `OccupancyField`, pre-filled from the URL. Closing a popover or sheet with a changed value pushes a new URL built with `serializeCriteria` (keeping `sel`, clamped); no button; focus stays on the field; the section must not remount. Stale link (`parseCriteria` returned problems and `stay` is null): same as no dates, plus "Those dates have passed. Pick new ones." in Coral under Dates (`STALE_LINK_MESSAGE`, as the search bar does). `HotelContent` must now pass `problems`, `today` and the parsed `sel`/`notice` down.

**No dates:** notice "Select dates to see this property's availability and prices"; rows show name, beds, "Sleeps N", amenities and a secondary "Show prices" that opens the range calendar; no prices, no selects; no summary and no phone bar.

**Table** (FR-17): a real table on desktop with headers "Room type", "Sleeps", "Price for N nights", "Rooms"; below 768px each row is a card with its own heading. Row: name (`headline-sm`), beds, "Sleeps N" (N person icons, `role="img"` "Sleeps N"), Room amenities from the seed labels (`private_bathroom` "Private bathroom", `wifi` "Free Wi-Fi"), the price for ONE room: stay total `R 4 900` (`formatZar`, spoken via `spokenZar`) and "R 2 450 a night" muted. Select named "Rooms of <Room type name>", options 0 to Availability. "Only N left" with a warning icon (white text, no warning colour) when N <= 3. Availability 0: "Sold out for your dates" in Coral with an icon, no select, only the nightly price (mockup). When every row is sold out, also the notice "No rooms left for these dates. Try other dates." with a "Change dates" link that focuses the Dates field, and no summary Reserve. Loading: skeleton rows in a nested Suspense inside the section; the rest of the page and the picker's focus stay.

**Selection:** state is client-side, initialised from the URL `sel` (unknown or foreign Room type ids dropped, quantities clamped to Availability server-side too). Each change calls `window.history.replaceState` with the new `sel` (replace, never push, no server re-render). When a new Stay lowers Availability below a chosen quantity, the quantity is lowered and announced in a polite live region.

**Summary** (FR-18, DESIGN.md Booking summary): hotel name, dates and nights, party, one line per Room type "1 × Standard Double  R 4 900,00", a divider, "N rooms selected", Total in `price-lg` (`formatZar` with cents, `bookingTotalRand`) in an `aria-live="polite"` region, "Includes taxes. No extra fees.", the cancellation line, Reserve. Cancellation line: free policy "Free cancellation until Wed 11 Nov 2026, 14:00" (a Mint badge), non-refundable "Non-refundable. This booking can't be cancelled."; from the new pure `src/domain/cancellation.ts` `cancellationDeadline(checkIn, checkInTime)` = check-in date minus 2 days at the Hotel's check-in time (no time zone maths; Cape Town hotels all share the seed zone). Reserve is `aria-disabled` (still focusable, `aria-describedby` the reason) with the reason shown above it: nothing selected "Select at least one room."; else if the selected rooms' total `maxGuests x quantity` is below Guests (adults + children) "These rooms sleep N. Your party is M. Add a room or pick a bigger one." with a warning icon. A fit message is announced; the selected room count need not equal the Party's rooms. Clicking an enabled Reserve calls `startBooking`.

**Phone bar** (< 768px, once dates are set): fixed bottom, 72px min, 1px Brand Blue top border, "1 room · R 4 900,00" (also "0 rooms · R 0,00" with nothing selected) and the Reserve button, with the reason above it. Tapping the text opens the full summary in a `Dialog variant="sheet"`; its trigger is named "N rooms, <spoken total>. Show full summary". The toast sits above it.

**startBooking** (`src/features/booking/actions.ts`, `"use server"` + `import "server-only"`): takes the hotel id and criteria fields, re-parses them with the codec (never trusts the client), checks every `sel` Room type belongs to the Hotel and quantities are positive, re-checks Availability with `availabilityFor` and party fit, mints `k` with `randomUUID` from `node:crypto`, and calls `redirect()` (outside any try/catch) to `/book?<serializeCriteria({q, stay, party, hotel, sel, k})>`. Expected failures return the shared result `{ ok: false, code, fieldErrors?, message }` (AD-11): bad or foreign `sel`, no dates, party doesn't fit, or a quantity above Availability use `VALIDATION` with a plain `message`; unexpected errors are caught, logged without personal data, and return `SERVER_ERROR`. Put the result type and `ErrorCode` union in `domain/types.ts`. Success never returns.

**Room-ran-out alert:** a component at the top of the section that, when the criteria `notice` is `room-unavailable`, shows an `alert-error` naming the Room type ("Sorry, the last Standard Double was just booked. Pick another room."), takes focus once on mount, and is removed from the URL on the next criteria change. A `cancelled` notice is not 1.10's. Nothing sends this redirect yet (story 11).

**Never:** No `/book` page (story 12), no Booking written, no `confirmBooking`, no access cookie. No new dependencies. No `"use cache"` on DB or clock reads. No changes to `Dialog`, `DateRangeField` or `OccupancyField` beyond a prop they strictly need. `/book` stays a 404 for now.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Priced table | hotel-001, 2 adults, Fri-Sun | Standard R 4 900 (R 2 450 a night), Family R 6 000; selects 0-10 and 0-4; no summary total until a room is chosen | — |
| Sold out | hotel-002, Family Room | "Sold out for your dates" in Coral, no select, nightly price only | — |
| Only N left | Availability 1-3 (repo fixture booking) | "Only N left" with warning icon | — |
| No dates | `/hotels/hotel-001` | "Select dates to see..."; no prices, no selects; "Show prices" opens the range calendar; no summary or bar | — |
| Stale link | past `checkIn` | no-dates table plus Coral "Those dates have passed. Pick new ones." under Dates | — |
| Select | 1 Standard Double | summary "1 room selected", total "R 4 900,00" announced; URL `sel=<id>:1` replaced, not pushed | — |
| Nothing selected | 0 rooms | "Select at least one room." above Reserve, `aria-disabled`, focusable | clicking does nothing |
| Party too big | coral-coast (hotel-005), 3 adults + 2 children, 1 Family (sleeps 4) | "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one."; Reserve `aria-disabled` | clicking does nothing |
| Fits | add 1 Standard (4 + 2 = 6 >= 5) | Reserve enabled; click lands on `/book?...&hotel=hotel-005&sel=...&k=<uuid>` | — |
| Dates change | new Stay lowers Availability | URL pushed, focus stays on Dates; chosen quantity lowered and announced | — |
| All sold out | every row Availability 0 | "No rooms left for these dates. Try other dates."; "Change dates" focuses Dates; no Reserve | — |
| Bad selection | `startBooking` with a foreign Room type, quantity 0, or no dates | `{ ok: false, code: "VALIDATION", message }`, no redirect | no throw |
| Room ran out | URL `notice=room-unavailable` | alert at the top of the section naming the Room type, focused once | — |
| Phone | < 768px, dates set | cards, fixed bar "0 rooms · R 0,00"; tap text opens the summary sheet | — |

</intent-contract>

## Code Map

- `src/app/hotels/[hotelId]/hotel-details.tsx` -- `HotelContent` L49 discards `problems`; stub Availability section L104-112 to replace; `FACILITY_ICONS` L18-30 (`private_bathroom` -> `shower`). `hotel-actions.tsx` See rooms L70-79 targets `availabilityHeadingId` (`src/domain/hotel.ts` L54); keep it. Tests that depend on the stub: `e2e/hotel.spec.ts` ~L82, ~L169-176, `hotel-actions.test.tsx`, `page.test.tsx`.
- `src/domain/criteria.ts` -- `parseCriteria(params, today, {defaultStay:false})` returns `{criteria, problems}`; exported `parseSelection`; private `serializeSelection` used by `serializeCriteria` (order `q, checkIn, checkOut, adults, children, rooms, hotel, sel, k, notice`); `hotelHref`, `STALE_LINK_MESSAGE`, `problemMessage`, `PARTY_LIMITS`. Catalog membership of `sel` is the caller's job.
- `src/domain/types.ts` -- `Stay`, `Party`, `RoomSelection`, `CriteriaNotice`, `CriteriaProblem` (has `sel-invalid`), `CancellationPolicy`, `HotelPage` (no rooms yet: add `rooms` and a structured cancellation policy and check-in time).
- `src/domain/pricing.ts` (`stayTotalRand`, `bookingTotalRand`), `availability.ts`, `dates.ts` (`stayLabel`, `nightsLabel`, `nightsBetween`), `lib/format.ts` (`formatZar`, `spokenZar`).
- `src/db/schema.ts` L92-109 `room_types` (`id, hotelId, position, name, maxGuests, beds[], pricePerNightRand, totalRooms, amenities[]`). Seed: every Hotel has a standard (sleeps 2) and family (sleeps 4) type; hotel-001 R 2 450 x10 / R 3 000 x4; hotel-002 Family R 1 500 x0; hotel-005 R 2 200 x14 / R 2 750 x5.
- `src/features/hotels/hotel.repo.ts` `hotelPage` (extend), `availability.repo.ts` `availabilityFor`, `queries.ts` `getAvailability` (calls `io()`), `src/features/search/search.repo.ts` `labels()`; test helpers `createTestDb`, `insertTestBooking` in `src/db/test-db.ts`.
- `src/components/date-range-field.tsx` (controlled `open`, `triggerRef`, `errorId`, `popoverPlacement`), `occupancy-field.tsx` (no `triggerRef`; exports `partyLabel`), `search-bar.tsx` (copy its single-open-field state, `datesError`, `focusInvalid` pattern; do not reuse it, it has Destination and Search), `search-state.tsx` (do not remount the provider on the Hotel page), `dialog.tsx` (sheet variant), `use-media-query.ts` `useIsDesktop`, `button-styles.ts` (`primaryButton`, `secondaryButton`, `iconButton` with `aria-disabled:` styles), `icons/icons.tsx` (`person`, `bed`, `shower`, `wifi`, `warning`, `error`, `plus`, `minus`, `check`), `toast.tsx`.
- `src/app/search/search-results.tsx` L32-45 -- stale-link handling to mirror.
- Specs: PRD FR-4, FR-16 to FR-20 (L117, L206-219); EXPERIENCE.md L99-102, L109, L117, L121-127, L131, L154-155, L180-181, L195-197; DESIGN.md L763-796 and L524 (no warning colour); mockup `key-hotel.html` L202-317. Spines win over the mockup: select named "Rooms of ...".
- Next docs: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` L36-60, L134-170, L460-505; `03-api-reference/04-functions/redirect.md` L12, L31, L51-53; `02-guides/forms.md` L192-249.
- E2E: `playwright.config.ts`; read-only projects `chromium` and `mobile` (booking specs go in `e2e/booking/`, not used here). 1.10 writes no Booking. Follow `e2e/hotel.spec.ts` (abort photo hosts, `weekendStay()`, visible-only matches after client navigation). `/book` is a 404 until story 12: assert only the landing URL.

## Tasks & Acceptance

**Execution:** (do A and B first, then the UI; each with its tests)
- [x] `src/domain/types.ts`, `hotel.repo.ts` + test -- `HotelPage.rooms` (id, name, maxGuests, beds label, amenity labels, nightly rand), `cancellationPolicy`, `checkInTime`; plus `ActionResult` and `ErrorCode` (AD-11).
- [x] `src/domain/cancellation.ts` + test -- `cancellationDeadline`, and the free/non-refundable line wording.
- [x] `src/domain/selection.ts` + test -- clamp to Availability, row and line totals via `pricing.ts`, capacity check, reason text, spoken labels.
- [x] `src/features/booking/actions.ts` + test -- `startBooking` per the contract, one test per matrix row (mock `redirect`, test DB).
- [x] `src/app/hotels/[hotelId]/hotel-details.tsx`, `availability-section.tsx` (server, nested Suspense, skeleton) -- section, notices, props.
- [x] `stay-party-picker.tsx`, `room-table.tsx`, `booking-summary.tsx`, `mobile-summary-bar.tsx`, `availability-alert.tsx` + tests -- the client UI per the contract.
- [x] `e2e/room-table.spec.ts` + updates to `e2e/hotel.spec.ts`, `page.test.tsx`, `hotel-actions.test.tsx` -- the three verify scenarios, no-dates, stale, sold out, phone bar, `replace` not push.

**Acceptance Criteria:**
- Given Table View City Lodge with dates, then the Family Room shows "Sold out for your dates".
- Given Coral Coast with 3 adults + 2 children and 1 Family Room, then Reserve is `aria-disabled` with the capacity message; when 1 Standard Double is added, then Reserve is enabled and a click lands on `/book?...&hotel=hotel-005&sel=...&k=...`.
- Given `npm run build` with no database file, then `/hotels/[hotelId]` still builds as Partial Prerender.

## Implementation Notes

- Added `src/features/booking/booking.repo.ts` (`hotelRooms`) so `startBooking` reads Room types without importing `hotel.repo` (AD-4 allows only `availability.repo`). `selection.ts` also holds `roomRanOutMessage` and `loweredMessage`; the extra client file `room-selection.tsx` owns the selection state shared by table, summary and bar.
- The nested Suspense is keyed by the Stay, so a new Stay shows the skeleton while the picker stays mounted. The server clamps the URL `sel` and passes a `loweredNotice`, filled into a persistent `role="status"` region after mount. "Keeping sel, clamped" is done server-side: the picker carries the URL `sel` as is.
- Summary panel and phone bar are both in the DOM and switched with CSS (`hidden md:block`, `md:hidden`), so Reserve exists twice; CSS hides one from assistive tech. The room table is one real table restyled to cards below 768px (explicit ARIA roles keep table semantics).
- "Show prices" and "Change dates" find the Dates field through a `data-dates-field` wrapper (no new context). The toast moves above the bar through a `data-summary-bar` body attribute and a Tailwind `in-data` variant in `toast.tsx`.
- Playwright treats `aria-disabled` buttons as not enabled, so e2e clicks a blocked Reserve with `force: true`.
- "Only N left" has unit coverage only; no e2e fixture Booking is written (read-only projects).

## Plan Change Log

## Review Triage Log

### 2026-10-13 — Review pass
- verdicts: 10 findings — high 0, medium 3, low 5, false 0, maybe-false 0 (2 more rejected as accepted by the plan)
- findings:
  - `[low]` `[patch]` Alert and notice panels use `bg-neutral`, DESIGN.md `alert-error` names `surface` -- same colour (#070c14), switched to `bg-surface` to match the token.
  - `[medium]` `[patch]` `openDatesPicker` / `focusDatesField` find the Dates field with `document.querySelector` over the whole document; Next keeps visited pages hidden in the DOM (Activity), so after Hotel A -> search -> Hotel A with other dates "Show prices" and "Change dates" can reach the hidden copy -- lookup made instance-scoped, unit test with two copies.
  - `[low]` `[defer]` Any stay problem (`stay-too-long`, `party-invalid`, ...) shows "Those dates have passed. Pick new ones." -- pre-existing: `/search` does the same (story 1.7) and the plan's wording matches; `problemMessage` exists for per-problem copy. Deferred, to fix on both pages together.
  - `[low]` `[reject]` `startBooking` round-trips its input through the codec, so an invalid Party is replaced by defaults and the guest sees "Select dates to reserve a room." -- reachable only by a forged call (the UI's Occupancy field cannot produce an invalid Party); the result is still a `VALIDATION` failure with no redirect.
  - `[medium]` `[patch]` The address bar keeps the unclamped `sel` after a new Stay lowers a quantity (`replaceSelectionInUrl` only runs on a quantity change) -- URL replaced with the clamped selection when anything was lowered, unit test. The same-text announcement point is rejected: it needs two identical lowerings in a row.
  - `[medium]` `[patch]` `HotelContent` test lost its dates, so the Stay-to-Availability wiring was only covered by e2e -- dated test restored with `getAvailability` mocked.
  - `[medium]` `[patch]` Matrix row "Dates change" had no e2e (push, focus stays, table refreshes) -- e2e added. The all-sold-out "Change dates" e2e is rejected: no seed Hotel is sold out for every Room type, and it is unit-covered; "Only N left" stays unit-only (read-only projects must not write Bookings).
  - `[low]` `[reject]` While Reserve is pending, `block` becomes `{ kind: "empty", message: "Reserving…" }`, reusing the "nothing selected" kind -- no named harm: the kind only drives `aria-disabled` and the reason text, both of which are right while pending.
  - `[low]` `[reject]` The summary and Reserve render up to three times, with duplicated live regions -- the plan accepts it; the aside is `hidden md:block`, the bar `md:hidden`, and the sheet makes the rest inert, so only one is exposed at a time.
  - `[high]` `[patch]` Regression found by the full e2e run, not by the reviewer: `e2e/hotel.spec.ts` "on a phone the viewer covers the screen and a swipe changes the photo" fails every time on this branch (second swipe ignored) and passed at 5b2f2d9 -- sent back to the implementer to fix the product code.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green. Full `npm test` has intermittent 5 s timeouts in slow calendar and search-bar tests (deferred, see earlier plans); a failing file must pass when run alone.
- `rtk proxy npx playwright test --workers=1 --reporter=line` -- expected: all pass; read the passed/failed lines, the RTK-filtered exit code is not reliable.

## Auto Run Result

**Summary:** The Hotel page's Availability section replaces the stub: a Stay and Party picker (no-dates and stale states), a room table (cards on phone) with Sold out, "Only N left" and "Show prices", a booking summary with the party-fit check and the dated cancellation line, and a fixed phone summary bar. Reserve calls the new `startBooking` action, which re-validates, mints `k` and redirects to `/book?...&k=...` (a 404 until story 12). Also the shared `ActionResult` type, a pure `cancellationDeadline`, and the room-ran-out alert slot.

**Files:**
- `src/features/booking/actions.ts`, `booking.repo.ts` + test -- `startBooking`; Room types read through the booking feature.
- `src/domain/selection.ts`, `cancellation.ts`, `hotel.ts`, `types.ts` + tests -- clamping, totals, capacity, reasons, deadline, `ActionResult`.
- `src/features/hotels/hotel.repo.ts` + test -- rooms, cancellation policy and check-in time on `HotelPage`.
- `src/app/hotels/[hotelId]/availability-section.tsx`, `stay-party-picker.tsx`, `room-table.tsx`, `room-selection.tsx`, `booking-summary.tsx`, `mobile-summary-bar.tsx`, `availability-alert.tsx` + tests; `hotel-details.tsx`, `page.test.tsx`.
- `src/components/toast.tsx` -- toast offset above the phone bar through a CSS variable.
- `e2e/room-table.spec.ts` -- priced table, sold out, no dates, stale, party fit, Reserve landing URL, Dates change, phone bar.

**Review:** 10 findings. Patched 5 (1 high regression found by e2e, 3 medium, 1 low), deferred 1 (low), rejected 4 (3 low, 1 part of a patched finding). The deferred item and the flaky unit tests are in `deferred`.

**Follow-up review recommended:** true -- a `high` was patched. Unverified risk: the swipe regression was traced to the toast's `max-md:in-data-[summary-bar]:bottom-28` class by bisecting, and replaced by a CSS variable; the implementer could not explain how that class broke touch handling in the photo viewer, so a related interaction between the fixed toast container and touch events may remain.

**Verification:** lint and typecheck clean; `npm run build` green with `/hotels/[hotelId]` as Partial Prerender; `npx playwright test --workers=1` 105 passed, 5 skipped, 0 failed; `npm test` 424 to 430 of 432 pass in a full run, with 1 to 8 load timeouts in the slow calendar, search-bar and home-search tests (see `deferred`), and 289/289 for those files plus `src/app/hotels`, `src/domain` and `src/features` in a smaller batch.

**Residual risks:** the toast clearing the phone summary bar has no browser check; "Only N left" and the all-sold-out state are unit-tested only (read-only e2e projects cannot create Bookings); the summary and Reserve render up to three times, switched by CSS; `/book` is a 404 until story 12.
