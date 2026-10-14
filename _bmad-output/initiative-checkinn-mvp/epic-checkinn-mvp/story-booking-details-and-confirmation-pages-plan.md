---
title: 'Booking details and confirmation pages'
type: 'feature'
ticket: '12'
created: '2026-10-14'
status: 'built'
baseline_revision: '3bcc3217e00a93adfbd7f2d83457ed7b9ab7646a'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-booking-details.html'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-confirmation.html'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Reserve lands on a 404 and `confirmBooking` has no form or result page, so a guest still can't book (FR-21, FR-22; UJ-1, UJ-2).

**Approach:** Build `/book` (step 2: the booking summary with the cancellation line, a guest form with an error summary, Back to rooms) on `confirmBooking`, and `/bookings/[reference]` as the confirmation (step 3: "You're booked!", the reference block with COPY, the stored summary, a "Manage this booking" link). Ship the UJ-1 and UJ-2 end-to-end journeys.

## Boundaries & Constraints

**Always:** `/book` reads `hotel`, the criteria, `sel` and `k` only through the codec. A missing or unknown Hotel goes to `/search` with the criteria; a missing or invalid Stay, `sel` or `k`, or a selection that no longer fits the party, goes to the Hotel page's room table with the criteria kept (AD-8). Rooms that ran out before the form loads go to the Hotel page with the room-unavailable notice, as at confirm. If a Booking already has that `k`: a visitor whose cookie holds its token sees the existing confirmation instead of the form ("Already booked"); any other visitor sees no Booking data and no form, only a short "already confirmed" page linking to Manage booking, with a title that matches its headline. The `/book` summary is computed on the server from the catalog and `src/domain/pricing.ts` with the same code `createBooking` uses, so it always equals what gets stored; amounts in rand and cents through `formatZar`; lines in the Hotel's Room type order. The cancellation line uses `cancellationLine(…, now)`, so a passed deadline reads "Free cancellation ended on …"; Non-refundable reads "Non-refundable. This booking can't be cancelled." The page says no payment is taken and the Hotel is fictional. Form fields per FR-21: first name, last name, email, then mobile number, estimated arrival time and special requests marked "(optional)", using the rules and messages in `src/domain/guest.ts` (one rule set for form and server). Each field validates on blur and the form on submit; on errors focus moves to the error summary, whose links focus their fields; messages are tied with `aria-describedby`. While confirming, the button reads "Confirming…" and is disabled and the form is read-only; a `SERVER_ERROR` keeps what the guest typed and offers Try again. Back after confirming shows the confirmation, not the form, including after an earlier refused try. `/bookings/[reference]` normalises the reference, reads the Booking's snapshot only (AD-16), and requires its token in `checkinn_access`; without one, or for an unknown reference, it redirects to `/manage?reference=…` (AD-15). The reference is selectable text; COPY is named "Copy booking reference CI-XXXXXX", shows the toast "Reference copied", and selects the text when the clipboard is blocked. Booking reads go through a new `src/features/booking/queries.ts` (`server-only`, `await io()` first) inside `<Suspense>`; view models live in `src/domain/types.ts`. Each step's headline takes focus after an in-app navigation; titles follow "{context} · CheckInn". The step list ("1 Your selection", "2 Your details", "3 Confirmation", `aria-current="step"`) is one shared component used on the Hotel page and both new pages. Booking e2e specs live in `e2e/booking/` with `uniqueGuestEmail()`. Copy verbatim from EXPERIENCE.md, the PRD and the mockups. DESIGN.md tokens only; targets ≥ 44px; no horizontal scroll from 320px. Follow `main`'s conventions.

**Never:** No `/manage` page, lookup or cancel (story 13): "Manage this booking" and the no-token redirect may 404 until then. No email in any URL. No recomputing a confirmed Booking's prices from the catalog. No schema change. No new dependencies or config changes. Do not edit AGENTS.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| UJ-1 | Phone: Home, "Cape Town", a 2-night Stay, Search, Harbourlight, 1 Standard Double, Reserve, name and email, Confirm booking | Step 2 summary total "R 4 900,00" and "Non-refundable. This booking can't be cancelled."; then "You're booked!" with a `CI-` reference and the same total | — |
| UJ-2 | Desktop: Party 2 adults, 3 children, 2 rooms; "Durban"; 5 nights; Coral Coast Resort; 1 Family + 1 Standard; Confirm | Total "R 24 750,00"; "Free cancellation until …" with the deadline 48 hours before check-in at 14:00; the confirmation shows both lines | — |
| Booking details | Valid `/book` URL | Step 2 current; h1 focused after navigation; summary (Hotel, dates and Nights, Party, lines, total, "Includes taxes. No extra fees.", cancellation line); the no-payment and fictional statement | — |
| Phone | Width < 768px | Summary first, then the form; a fixed bottom bar with the total and Confirm booking | — |
| Required fields | Submit empty | No Booking; error summary "3 details need fixing" focused, linking to first name, last name and email | — |
| Email format | "thandi@" then blur | The email message shows | Submit blocked |
| Back to rooms | Activate the link | Hotel page with dates, Party and `sel` kept | — |
| No valid selection | `/book` without `sel`, with another Hotel's Room type, or without `k` | Redirect to the Hotel page room table with the criteria | Unknown Hotel: `/search` |
| Double submit | Confirm pressed twice, or the confirmation refreshed | One Booking | — |
| Back after confirming | Browser Back to `/book?…&k=<used>`, also after a refused try then a successful one | The confirmation for that Booking; no form | — |
| Used key, other browser | `/book?…&k=<used>` without the token | "already confirmed" page, link to Manage booking, no Booking data; matching title | — |
| Room ran out at confirm | Another Booking takes the last Room before Confirm | Hotel page with the room-unavailable alert naming the Room type, focused (the redirect is an in-app navigation, which 1.11 could not test) | — |
| Passed deadline | Free cancellation Hotel, check-in tomorrow | Summary reads "Free cancellation ended on …"; the Booking can still be confirmed | — |
| Confirmation | `/bookings/CI-XXXXXX` with the token | Step 3; Mint tick, "You're booked!", reference block, Hotel, Stay, lines, guest name, total, cancellation line, "Manage this booking"; title names the reference | — |
| Lowercase reference | `/bookings/ci-xxxxxx` | Same page | — |
| No token | `/bookings/CI-XXXXXX` in a fresh browser | Redirect to `/manage?reference=CI-XXXXXX` | Unknown reference: the same redirect |
| COPY | Clipboard works / blocked | Toast "Reference copied" / the reference text is selected | — |
| Server error | `confirmBooking` returns `SERVER_ERROR` | An error alert with the message and Try again; typed values kept | — |

</intent-contract>

## Code Map

- `src/features/booking/actions.ts` -- `confirmBooking(input: ConfirmBookingInput)` where `ConfirmBookingInput = StartBookingInput & { k: string; guest: GuestInput }` (`hotelId, q, stay, party, sel, k, guest`). It takes a typed object, not FormData, and returns `ActionResult` on failure (`VALIDATION` with `fieldErrors`, `SERVER_ERROR`); success redirects. The Hotel page calls `startBooking` inside `useTransition` (`src/app/hotels/[hotelId]/room-selection.tsx`); follow that pattern. `bookingPath(reference)` is private here: move it to `src/domain/reference.ts` and export it.
- `src/features/booking/booking.repo.ts` -- `hotelRooms`, `bookingByKey(db, key)` (`reference, accessToken, email`), `createBooking` (`created | existing | unavailable | invalid`). Add reads by reference (snapshot plus line names via `room_types`) and a quote for `/book` that shares the pricing and ordering with `createBooking`. `src/db/schema.ts` lines ~122–190 list every `bookings` and `booking_lines` column.
- `src/features/booking/access.ts` -- `ACCESS_COOKIE`, `ACCESS_COOKIE_OPTIONS`, `parseAccessTokens`, `addAccessToken`, `serializeAccessTokens`, `mintAccessToken`; no "has access" helper yet.
- `src/features/hotels/queries.ts` -- the `server-only` + `await io()` pattern to copy for `src/features/booking/queries.ts`; `getHotelPage(id)` gives `rooms`, `cancellationPolicy`, `checkInTime`.
- `src/domain/` -- `guest.ts` (`validateGuest`, `GuestInput`, `GuestDetails`, `GUEST_LIMITS`, `GUEST_MESSAGES`, `normaliseEmail`), `reference.ts` (`normaliseReference`), `cancellation.ts` (`cancellationLine(policy, checkIn, checkInTime, now)`, `CancellationLine`), `selection.ts` (`summaryLines`, `selectionTotalRand`, `clampSelection`, `reserveBlock`), `criteria.ts` (`parseCriteria`, `serializeCriteria`, `hotelHref`, `searchHref`; no `/book` builder), `types.ts` (`ActionResult`, `ErrorCode`), `clock.ts` (`todayIn`, `nowIso`).
- `src/app/hotels/[hotelId]/` -- `booking-summary.tsx` (`BookingSummary({ hotelName, stay, party, lines, roomCount, totalRand, cancellation, reserve })`, `reserve: null` hides Reserve), `mobile-summary-bar.tsx` (`MobileSummaryBar({ roomCount, totalRand, reserve, summary })`, sets `--toast-offset`), `availability-section.tsx` (private `STEPS` list rendered as `<ol aria-label="Booking steps">`), `hotel-details.tsx` (request-time order: params, searchParams, `io()`, clock, parse). Move what both flows use to `src/components/` and generalise the bar's action rather than copying.
- `src/components/` -- `toast.tsx` (`useToast()` → `{ toast, show, dismiss }`, `<Toast>`), `copy-fallback-dialog.tsx`, `dialog.tsx`, `button-styles.ts`, `icons/icons.tsx` (`check`, `copy`, `error`, `warning`, `info`). `src/lib/clipboard.ts` `copyText(text): Promise<boolean>`. `src/app/search/results-heading.tsx` `ResultsHeading` is the focus-after-navigation headline. No form-field or error-summary component exists yet.
- Next.js patterns on `main`: sync page with `PageProps<"/route">` wrapping an async inner component in `<Suspense>`; `generateMetadata`; `notFound()` and `redirect()` from `next/navigation`; `cookies()` from `next/headers` (only in actions so far). Docs: `node_modules/next/dist/docs/01-app/02-guides/forms.md`, `02-guides/server-actions.md`, `03-api-reference/04-functions/cookies.md`, `redirect.md`, `io.md`.
- E2E -- `playwright.config.ts` serial `booking-desktop` then `booking-mobile` projects run `e2e/booking/**/*.spec.ts`; `e2e/support/guest.ts` `uniqueGuestEmail()`, `e2e/support/db.ts` `E2E_DB_PATH`; `e2e/global-setup.ts` resets the database once per run and adds no Bookings. Read-only specs use Stays at days +3 to +5 (Harbourlight's full 10 Standard Doubles, Coral Coast). Booking specs must use days from +20 onwards, a different range per project and per retry, so they never collide with each other or the read-only specs. The room-ran-out case needs a Booking made outside the browser: add an e2e support helper that inserts one into `E2E_DB_PATH`.
- Seed: Harbourlight Retreat `hotel-001`, Non-refundable, check-in 14:00, Standard Double R 2 450; Coral Coast Resort `hotel-005`, Free cancellation, check-in 14:00, Standard R 2 200, Family R 2 750.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/reference.ts`, `types.ts` + tests -- exported `bookingPath`; Booking view and quote view models.
- [x] `src/features/booking/booking.repo.ts`, `queries.ts`, `access.ts` + tests -- quote, reads by reference and key, the access check.
- [x] `src/components/` + tests -- shared step list, booking summary and mobile bar (moved from the Hotel page), form field and error summary, reference block.
- [x] `src/app/book/` + tests -- step 2, the redirects, already-booked and used-key states.
- [x] `src/app/bookings/[reference]/` + tests -- the confirmation and the no-token redirect.
- [x] `e2e/booking/uj-1.spec.ts`, `uj-2.spec.ts` and a details/confirmation spec, `e2e/support/` booking helpers -- every matrix row a browser can see, on both booking projects.
- [x] `e2e/room-table.spec.ts` -- Reserve now lands on a real step-2 page.

**Acceptance Criteria:**
- Given UJ-1 and UJ-2, when run on both booking projects, then the totals read R 4 900,00 and R 24 750,00 and a reference shows.
- Given a confirmed Booking, when the guest goes Back and submits again, then the same Booking shows and no second one exists.
- Given `npm run build` with no database file, then it succeeds and creates none.

## Implementation Notes

- Pricing: `booking.repo.ts` has one private `priceSelection` used by both `bookingQuote` (for `/book`) and `createBooking`. `cancellationLine` now goes through `snapshotCancellationLine`, which works from the stored deadline instant. The confirmation therefore reads only the snapshot, and its wording always matches `/book`.
- Back after confirming: Next keeps `/book` in the DOM with Activity. When a server action redirects, Next rejects the action promise with an already-handled redirect error. If that error reaches the RedirectBoundary, the page subtree remounts and loses its state. The form catches that error (`isRedirect`, which checks the `NEXT_REDIRECT` digest), so its "confirming" flag survives. When Activity shows the page again, the form calls `router.refresh()`, and the server's used-key check renders the confirmation. Any other rejection is shown as the server error with Try again.
- Shared components moved to `src/components/`: `PageHeading` (was `ResultsHeading`, now takes a `className`), `BookingSummary` (takes an `action` slot and `guestName`), `MobileSummaryBar` (takes an `action` slot) and `BookingSteps`. `ReserveButton` stays on the Hotel page in `reserve-button.tsx`.
- Review fixes:
  - The form counts a redirect as a confirmed Booking only when it goes to `/bookings/…` (`redirectTarget` reads the URL from the digest). Before this, any `NEXT_REDIRECT` counted. `confirmBooking` also redirects to the Hotel page when nothing was booked (Rooms ran out, or input was invalid or tampered with). That case now clears the "confirming" flag, so Back shows the form again instead of a stuck "Opening your booking…". A component test covers a redirect to the Hotel page followed by Back.
  - Every field now validates on blur, as FR-21 and EXPERIENCE.md require, including a required field the guest tabs through empty. The test that expected no message is replaced by one that expects "Enter your first name."
  - The COPY e2e test books its own slot (9) instead of sharing slot 7 with the confirmation test.
- Room-table redirects add `#availability-<hotelId>` (`roomTableHref` in `src/domain/hotel.ts`).
- Local environment: the e2e temp database and `data/checkinn.db` both had a `bookings` schema from the earlier diverged branch (`mobile_number`, `booking_lines.id`). Its migration timestamp is later than the committed `0001_bookings`, so Drizzle never applied the committed schema and every confirm failed with `SQLITE_ERROR`. I deleted the e2e temp database. `data/checkinn.db` was left alone and needs deleting before booking works under `npm run dev`.

## Plan Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 3 findings — high 0, medium 1, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` The form treated every `NEXT_REDIRECT` as a confirmed Booking, but `confirmBooking` also redirects to the Hotel page when nothing was booked; after Back the guest could be left on "Opening your booking…" with no form and no Booking — fixed: only a redirect to `/bookings/…` counts as confirmed; any other redirect resets the confirming state; component test added.
  - `[low]` `[patch]` Fields validated on blur only after typing, against the plan and EXPERIENCE.md — fixed: every blur validates; the test now expects the message after tabbing through an empty required field.
  - `[low]` `[patch]` Two booking e2e tests used the same Stay slot — the COPY test has its own slot.

## Design Notes

- This contract was first built on a branch that diverged from `main`; its review found the Back-after-a-refused-try case, the quote line order and the used-key page title, which is why they are written in here.
- Arrival time can be a select: "Not sure yet", then hourly slots from the Hotel's check-in time to midnight, within `GUEST_LIMITS.arrivalTime`.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` created by the build.
- `npm run test:e2e` -- expected: all specs pass on every project, including `booking-desktop` and `booking-mobile`.
- `npm run design:lint` -- expected: passes.

## Auto Run Result

Status: built (2026-10-14).

**Summary:** Built `/book` (step 2: the booking summary priced by the same code that stores the Booking, the guest form with blur and submit validation and an error summary, Back to rooms, the redirects for an invalid selection, the already-booked and used-key states) and `/bookings/[reference]` (step 3: "You're booked!", the reference block with COPY, the stored summary, "Manage this booking", the no-token redirect). A guest can now book end to end on `main`'s code. Shipped the UJ-1 and UJ-2 journeys.

**Files changed:**
- `src/app/book/`, `src/app/bookings/[reference]/` (+ tests).
- `src/components/` -- `page-heading`, `booking-summary`, `mobile-summary-bar` (moved from the Hotel page), `booking-steps`, `form-field`, `error-summary`, `reference-block`, `booking-confirmation` (+ tests); the Hotel page now uses the shared step list and summary.
- `src/features/booking/booking.repo.ts`, `queries.ts`, `access.ts` (+ tests).
- `src/domain/reference.ts`, `guest.ts`, `hotel.ts`, `types.ts` (+ tests).
- `e2e/booking/uj-1.spec.ts`, `uj-2.spec.ts`, `booking-details.spec.ts`, `e2e/support/booking.ts`, `e2e/room-table.spec.ts`.

**Review:** 3 findings, all patched: 1 medium (a redirect without a Booking was treated as confirmed) and 2 low (blur validation, a shared e2e slot). Deferred: 0. Rejected: 0.

**Follow-up review recommended:** false (patched: high 0, medium 1, low 2).

**Verification (after the patches):** `npm run lint` clean; `npm run typecheck` clean; `npm test` passed; `npm run build` succeeds; `npm run test:e2e` passed on all four projects; `npm run design:lint` 0 errors, 0 warnings.

**Residual risks:**
- Back after confirming relies on reading Next's redirect error (`NEXT_REDIRECT` and its URL), an internal format; the e2e Back tests would catch a change.
- A local `data/checkinn.db` created on the earlier diverged branch has a different bookings table; every confirm fails until that file is deleted (it is gitignored and recreated from the seed).
- "Manage this booking" and the no-token redirect lead to `/manage`, a 404 until story 13.
- Copy written here: the already-confirmed page, "Opening your booking…", the page titles "Your details · <Hotel>" and "Booking CI-XXXXXX", and the arrival-time options.
- The server-error path is covered by component tests only.
