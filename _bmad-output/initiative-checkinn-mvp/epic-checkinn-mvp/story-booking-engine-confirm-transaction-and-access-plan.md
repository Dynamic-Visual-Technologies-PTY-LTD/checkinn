---
title: 'Booking engine: confirm transaction and access'
type: 'feature'
ticket: '11'
created: '2026-10-14'
status: 'built'
baseline_revision: 'a77808102a144cff687db94fb5488c799fea0f95'
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
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Nothing can create a Booking. Confirming must never oversell a Room when several expo visitors confirm at once, never make two Bookings from a double click or a refresh, and must let the guest who just booked see their Booking without their email in a URL (FR-22; AD-3, AD-10, AD-15, AD-16). Two Hotel page behaviours this story depends on are also wrong today: a Free cancellation deadline that has already passed is shown as an open offer, and the room-ran-out alert can name a Room type that is not short and comes back on every reload.

**Approach:** Add one synchronous create transaction in `src/features/booking/booking.repo.ts` and a `confirmBooking` server action, plus the pure pieces they need: the Booking reference and its normaliser, guest validation, the deadline as a stored instant, and the access-cookie helper. Fix the passed-deadline wording and the room-ran-out alert on the Hotel page.

## Boundaries & Constraints

**Always:** Bookings are created only in `src/features/booking/actions.ts` through `booking.repo.ts` (AD-3). The create is one synchronous `db.transaction(...)`, immediate, with no `await` or promise inside: look up the idempotency key first; if a Booking has it, return that Booking; otherwise re-check every line against the Hotel's Room types, `availabilityFor` and the party-fit rule, and only if all fit insert the Booking, its lines and its snapshot (AD-16: Stay, Party, per line `unitPriceRand`, `quantity`, `lineTotalRand`; `bookingTotalRand`; `cancellationPolicy`; `cancellationDeadline` as an ISO UTC instant, null for Non-refundable). If any line no longer fits, insert nothing and report which Room types ran out. The action re-parses its input with the criteria codec and never trusts client values; prices and policy are read from the catalog inside the transaction. References: `CI-` plus 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, stored uppercase and unique, regenerated on a collision; all reference input goes through `normaliseReference` (trim, uppercase, add `CI-` if missing). Email is stored and compared trimmed and lowercased. A new Booking gets a random access token minted on the server, added to the `checkinn_access` cookie (httpOnly, `SameSite=Lax`, `Path=/`, not `Secure`, at most 20 tokens with the oldest dropped, 30 days). **A key that already has a Booking grants that Booking's token only when the submitted email (normalised) equals the stored email, or the request's cookie already holds that token; otherwise the action redirects to the Booking URL and sets nothing**, so a `/book` URL in history or a shared link is not a credential. Success ends in `redirect("/bookings/<reference>")` after the transaction, outside any `try`. A Room type running out redirects to the Hotel page with the criteria, the guest's full `sel`, `notice=room-unavailable` and `rt`. Expected failures return the existing `ActionResult` with `fieldErrors` for guest fields; unexpected errors are logged without name, email, phone or token (Drizzle error messages carry query parameters, so log the error's name and code only) and return `SERVER_ERROR`. On the Hotel page, the cancellation line compares the deadline with "now" read at request time: a passed deadline shows no Mint badge and reads "Free cancellation ended on Wed 11 Nov 2026, 14:00." (EXPERIENCE.md). The room-ran-out alert names a Room type only when the quantity asked for in `sel` is more than is left, takes focus once, and is removed from the URL (replace, not push) once shown so a reload or Back does not bring it back; the lowered quantity is not announced through the live region while the alert shows. Repo and domain tests start with `// @vitest-environment node`. Follow the code conventions already on `main`.

**Never:** No `/book`, `/bookings/[reference]` or `/manage` page, guest form UI, cancel or lookup (stories 12 and 13). No stored availability counter. No email or token in a URL or a log. No new dependencies. No schema change: the `bookings` and `booking_lines` tables on `main` already hold everything this contract needs. No change to the Listing card (a separate change). Do not edit AGENTS.md.

## I/O & Edge-Case Matrix

Seeded `:memory:` database for repo tests.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Confirm | Harbourlight, 2 nights, 1 Standard Double, valid guest | A Confirmed Booking with a `CI-` reference; snapshot total R 4 900; Availability of that Room type lower by 1 for each Night of the Stay and unchanged for other Nights | — |
| Two lines | Coral Coast, 5 nights, 1 Family + 1 Standard | Lines R 13 750 and R 11 000; total R 24 750; Free cancellation with a deadline | — |
| Last Room, twice | Two creates with different keys for the last Room | Exactly one Booking; the other reports that Room type as ran out and inserts nothing | — |
| Partial fit | Two lines, one of which no longer fits | Nothing inserted; only the Room type that ran out is reported | — |
| Repeated key, same email | The same key and email again, even written differently | The first Booking; no second row; the token is granted | — |
| Repeated key, other email | The same key with another, empty or missing email, no matching token in the cookie | Redirect to the Booking URL; no cookie set | — |
| Repeated key, token held | The same key, any email, cookie already holds the Booking's token | Redirect to the Booking URL; cookie keeps the token | — |
| Reference | Generated references | Match `^CI-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$`; a collision retries | — |
| Normalise | " ci-7k3p9q ", "7K3P9Q" | "CI-7K3P9Q" for both | — |
| Deadline instant | Check-in 2026-11-13, `checkInTime` 14:00 | Stored "2026-11-11T12:00:00.000Z" | Non-refundable: null |
| Email | " Thandi@Example.COM " | Stored "thandi@example.com" | — |
| Cookie cap | 20 tokens already in the cookie | The oldest is dropped; the new one is kept | — |
| Validation | Missing first name, last name or email, or a malformed email | `{ ok: false, code: "VALIDATION", fieldErrors, message }`; nothing inserted | — |
| Tampered input | Room type of another Hotel, quantity 0, stale Stay, party that doesn't fit | Redirect to the Hotel page with the criteria; nothing inserted | — |
| Room ran out | A line no longer fits at confirm | Redirect to `/hotels/<id>?<criteria>&sel=<full sel>&notice=room-unavailable&rt=<ids>` | — |
| Alert shown | Hotel page with that URL | An alert naming the Room type ("only N left" wording from `roomRanOutMessage` or its successor) takes focus; `notice` and `rt` leave the URL; a reload shows no alert | A Room type named in `rt` but not over-asked in `sel`: not named; nothing to name: no alert |
| Deadline open | Free cancellation Hotel, check-in 3 days away | Mint "Free cancellation" with "until <deadline>" | — |
| Deadline passed | Free cancellation Hotel, check-in tomorrow (the default search) | No Mint badge; "Free cancellation ended on <deadline>." in the availability section and the summary | — |
| Unexpected error | The repo throws | `SERVER_ERROR`; a log line with no personal data | — |

</intent-contract>

## Code Map

- `src/features/booking/actions.ts` -- `"use server"`; `startBooking(input: StartBookingInput): Promise<ActionResult>` takes a typed object (not FormData), re-parses through `serializeCriteria` / `parseCriteria(params, todayIn(), { defaultStay: false })`, checks Room types inline, then `clampSelection` and `reserveBlock`, mints `k` with `node:crypto` `randomUUID`, logs only `error.name`, redirects outside the `try`. Add `confirmBooking(input: ConfirmBookingInput)` beside it in the same style; extract the inline "Room types of this Hotel" check into a shared helper rather than writing it twice.
- `src/features/booking/booking.repo.ts` -- only `hotelRooms(db, hotelId): SelectableRoom[]`; its comment reserves this file for Booking writes. Add the create transaction and a read by key here.
- `src/domain/types.ts` -- `ErrorCode`, `ActionResult` (failure only; success redirects), `SearchCriteria` with `hotel`, `sel`, `k`, `notice`; `CriteriaNotice` for `room-unavailable` with `roomTypeIds`.
- `src/db/schema.ts`, `drizzle/0001_bookings.sql` -- `bookings` (reference, idempotency key and access token each unique; status CHECK; stay CHECK; guest `firstName`, `lastName`, `email`, nullable `phone`, `arrivalTime`, `specialRequests`; `bookingTotalRand`; `cancellationPolicy`; nullable `cancellationDeadline`; `createdAt`, `cancelledAt`) and `booking_lines` (primary key booking + Room type; `quantity` CHECK > 0; `unitPriceRand`, `lineTotalRand`). No migration needed.
- `src/features/hotels/availability.repo.ts` -- `availabilityFor(db: Db, …)` is synchronous but typed for `Db`, which a Drizzle transaction does not satisfy; widen it to the transaction-compatible type `CatalogWriter` already used by `src/db/seed.ts` and `reset.ts`.
- `src/domain/selection.ts` -- `clampSelection`, `reserveBlock` (party fit), `summaryLines`, `roomRanOutMessage(names)`, `loweredMessage`. `pricing.ts` -- `stayTotalRand`, `bookingTotalRand`. `criteria.ts` -- `parseCriteria`, `serializeCriteria` (order q … sel, k, notice, rt), `hotelHref(hotelId, criteria)`; there is no `/book` builder.
- `src/domain/cancellation.ts` -- `cancellationDeadline(checkIn, checkInTime)` returns `{ date, time }` with no zone maths; `deadlineLabel`; `cancellationLine(policy, checkIn, checkInTime)` returns `{ kind: "free", until, text } | { kind: "non-refundable", text }`. Add the UTC instant (Johannesburg is UTC+2 all year) and the passed state here; keep one place that knows the rule. `clock.ts` -- `todayIn(now?)`, `nowIso(now?)`, `TIME_ZONE`.
- `src/app/hotels/[hotelId]/` -- `hotel-details.tsx` (`HotelContent` reads the clock after `io()`), `availability-section.tsx` (renders `AvailabilityAlert` from `criteria.notice` and `roomRanOutMessage`), `availability-alert.tsx` (client, `role="group"`, focuses on mount; does not clear the URL), `room-selection.tsx` (selection in the URL via `replaceState`, live-region announcements), `booking-summary.tsx` (shows `CancellationLine`).
- `src/db/test-db.ts` -- `createTestDb()`, `insertTestBooking(db, { hotelId, stay, lines, status? })`.
- Test conventions on `main`: `vi.hoisted` mocks of `server-only`, `next/navigation` (`redirect` throws `NEXT_REDIRECT <url>`), `@/db/client` (`getDb` returns a test database), `@/domain/clock`; page tests mock `next/cache` `io`.
- E2E: `playwright.config.ts` defines serial `booking-desktop` and `booking-mobile` projects for `e2e/booking/**`, which does not exist yet. Table View City Lodge's Family Room has 0 inventory, so a read-only spec can reach the alert by URL with `sel=<that room>:1&rt=<that room>` and no fixture Bookings.
- `node_modules/next/dist/docs/` -- read the `cookies`, server actions and `redirect` guides first.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/reference.ts`, `guest.ts` + tests -- generator (random source injectable), `normaliseReference`, guest field rules with per-field messages.
- [x] `src/domain/cancellation.ts` + test -- deadline instant and passed state.
- [x] `src/features/hotels/availability.repo.ts` -- accept a transaction.
- [x] `src/features/booking/booking.repo.ts` + test -- create transaction and read by key; every repo row of the matrix.
- [x] `src/features/booking/access.ts` + test -- pure token-list helpers and the cookie attributes.
- [x] `src/features/booking/actions.ts` + test -- `confirmBooking` with the access rule; shared Room-type check.
- [x] `src/app/hotels/[hotelId]/` + tests -- passed-deadline wording; the alert names only over-asked Room types, takes focus once, clears `notice`/`rt` from the URL; no lowered-quantity announcement while it shows.
- [x] `e2e/hotel.spec.ts` (read-only projects) -- the alert by URL (text, focus, URL cleared, none after reload) and the passed-deadline wording for a check-in tomorrow.

**Acceptance Criteria:**
- Given two confirms for the last Room, then exactly one Booking exists and the other outcome names the Room type.
- Given a confirm, then Availability for each booked Room type is lower by the quantity for every Night of the Stay.
- Given a used key posted with a different email from a browser without the token, then no access cookie is set.
- Given `npm run build` with no database file, then it succeeds and creates none.

## Implementation Notes

## Plan Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 2 findings — high 0, medium 1, low 1, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` `AvailabilityAlert` read `window.location` during render; after the confirm redirect (a client-side navigation) Next writes the URL only at commit, so the alert could stay hidden and the guest's rooms be cut back with no message — fixed: it starts visible (the server renders it only when the notice names something) and reads the URL only in an effect, to clear `notice`/`rt` or to hide when restored from history; a test simulates the late URL commit.
  - `[low]` `[patch]` While the alert showed, every lowered line went unannounced, including Room types the alert does not name — fixed: only the lines the alert names are left out of the announcement; test added.

## Design Notes

- The repo returns a discriminated result (`created`, `existing`, `unavailable` with Room type ids, `invalid`), so the action maps outcomes to redirects without parsing errors.
- The idempotency lookup comes first inside the transaction, so a retry after the Rooms sold out still returns the guest's own Booking (subject to the access rule).
- This contract was first built on a branch that diverged from `main`; its two review passes produced the access rule, the passed-deadline wording and the alert behaviour above, which is why they are written into the contract here.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` created by the build.
- `npm run test:e2e` -- expected: all specs pass on every project.
- `npm run design:lint` -- expected: passes.

## Auto Run Result

Status: built (2026-10-14).

**Summary:** Ported the booking engine onto `main`: `createBooking` in one synchronous immediate transaction (idempotency lookup, re-check of Room types, party fit and Availability, then the Booking, its lines and its snapshot), the `confirmBooking` action, Booking references, guest validation, the deadline as a stored instant, and the access cookie, with a used key granting access only with the matching email or a held token. On the Hotel page, a passed deadline now reads "Free cancellation ended on …", and the room-ran-out alert names only over-asked Room types, takes focus once and clears itself from the URL.

**Files changed:**
- `src/domain/reference.ts`, `guest.ts`, `cancellation.ts`, `selection.ts` (+ tests).
- `src/features/booking/booking.repo.ts`, `access.ts`, `actions.ts`; `src/features/hotels/availability.repo.ts` (+ tests).
- `src/app/hotels/[hotelId]/hotel-details.tsx`, `availability-section.tsx`, `availability-alert.tsx`, `booking-summary.tsx`, `room-selection.tsx` (+ tests).
- `e2e/hotel.spec.ts`, `e2e/room-table.spec.ts`.

**Review:** 2 findings, both patched: 1 medium (the alert could stay hidden after the confirm redirect) and 1 low (unrelated lowered lines went unannounced). Deferred: 0. Rejected: 0.

**Follow-up review recommended:** false (patched: high 0, medium 1, low 1).

**Verification (after the patches):** `npm run lint` clean; `npm run typecheck` clean; `npm test` passed; `npm run build` succeeds; `npm run test:e2e` passed with 5 skipped; `npm run design:lint` 0 errors, 0 warnings.

**Residual risks:**
- `confirmBooking` has no caller until story 12, so the confirm redirect has not run in a browser; the alert's late-URL case is covered by a unit test that imitates Next's commit order.
- `e2e/room-table.spec.ts` "an alert names the Room type that ran out" now asks for 11 Standard Doubles against 10, because an `rt` with nothing over-asked no longer shows an alert.
- The alert and the room table each read Availability once per request.
- Guest field length caps (names 100, email 254, phone 30, arrival 50, requests 1000) were chosen here.
