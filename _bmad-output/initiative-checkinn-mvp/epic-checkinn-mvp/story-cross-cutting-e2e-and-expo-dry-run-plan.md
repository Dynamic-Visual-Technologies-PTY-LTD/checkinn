---
title: 'Cross-cutting e2e and expo dry-run'
type: 'chore'
ticket: '15'
created: '2026-10-14'
status: done
baseline_revision: '6c12c4d6726ae7f68523518ce66fb43f6b86304f'
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
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/epic-checkinn-mvp.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Each story shipped the e2e spec for its own flow. Nothing yet proves the epic's cross-cutting "Done when" items: every flow completes with the network blocked, `npm run db:reset` restores a fresh clone while the app runs, the whole journey works at a phone viewport, and the key pages render fast enough for a stand. The expo dry-run itself needs a presenter laptop, a projector and two phones.

**Approach:** Add Playwright specs for the four cross-cutting checks, and write the dry-run checklist the presenter follows on the day. The dry-run is a human step: this story prepares it and records that it is still to do.

## Boundaries & Constraints

**Always:** The new specs run with `npm run test:e2e` against `npm start` on the e2e server and database (never the dev database), on the projects `playwright.config.ts` already defines. Specs that create or cancel Bookings, or reset the database, live in `e2e/booking/` and run serially with `uniqueGuestEmail()` (AD-18). "Network blocked" means every request that is not to the app's own origin is aborted; a flow passes only if it completes, photos show placeholders, the layout holds and no request to the app fails. The reset spec runs the real `npm run db:reset` command against the e2e database while the server is up. Timing checks are spot checks with generous limits, so they flag a regression without failing on a slow machine. Query by role and accessible name. The checklist is written for a presenter who has not seen the code.

**Never:** No app behaviour change: if a cross-cutting spec finds a bug, fix the bug only when it is a direct correction, record it in the notes, and otherwise report it. No change to `.github/workflows/`, `infra/`, `next.config.ts` or other config. No new dependencies. Do not weaken or skip an existing spec. Do not claim the dry-run happened. Do not edit AGENTS.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Blocked network, browse | Home → search "Cape Town" → Hotel page → photo viewer, all external requests aborted | Each page renders; City and Hotel photos are placeholders with the name; no request to the app fails; no horizontal scroll | — |
| Blocked network, book | UJ-1 with external requests aborted | Reaches "You're booked!" with a `CI-` reference and R 4 900,00 | — |
| Blocked network, manage | Look up that Booking and view it | The Booking view shows | — |
| Reset while running | Make a Booking that lowers a Room type's Availability, run `npm run db:reset` against the e2e database, reload | The Room type is back to its seed Availability; the Booking's reference no longer resolves (lookup shows the not-found message); a default search shows 12 properties | The server is not restarted |
| Phone journey | 390px wide: Home → search → Hotel → rooms → details → confirmation → Manage → cancel a Free cancellation Booking | Completes with the collapsed search bar, the room cards, the mobile summary bar and sheets; no horizontal scroll on any step | — |
| Render spot check | `/search` (default) and a Hotel page with dates, warm server | Main headline visible within 1 second of navigation start, measured over several loads (median) | A miss fails with the measured times in the message |
| CI mode | `CI=1 npm run test:e2e` after `npm run build` | All specs pass against `npm start` without a rebuild | — |

## Human step (not done by this build)

Expo dry-run, epic "Done when" item 6: `npm run build && npm start -- -H 0.0.0.0` on the presenter laptop serves the projector and two phones over plain HTTP; Share falls back to the dialog; booking access works through the cookie; `npm run db:reset` runs between sessions.

</intent-contract>

## Code Map

- `playwright.config.ts` -- projects `chromium`, `mobile` (read-only, parallel; they ignore `booking/**`) and `booking-desktop` then `booking-mobile` (serial, `workers: 1`); the web server runs a production build with `npm start` on port 3100 against `CHECKINN_DB_PATH = E2E_DB_PATH`; with `CI` set it skips the build. `e2e/global-setup.ts` resets that database once per run and adds no Bookings.
- `e2e/support/` -- `db.ts` (`E2E_DB_PATH`), `guest.ts` (`uniqueGuestEmail`), `booking.ts` (journey steps, `bookingStay(testInfo, slot)` with slots per project and retry, slots 10 to 13 reachable by URL only, `bookRoomsElsewhere` returning `{ reference, email }`). Add new slots for new booking specs rather than reusing taken ones.
- Specs to reuse rather than copy: `e2e/home.spec.ts` and `e2e/search.spec.ts` (seed photo hosts aborted; `weekendStay()` days +3 to +5), `e2e/hotel.spec.ts` (photo viewer, plain-HTTP host mapping for Share), `e2e/room-table.spec.ts`, `e2e/booking/uj-1.spec.ts`, `uj-2.spec.ts`, `uj-3.spec.ts`, `booking-details.spec.ts`, `e2e/manage.spec.ts`.
- `scripts/db-reset.ts`, `package.json` `db:reset` -- the reset reads `CHECKINN_DB_PATH`; `src/db/reset.ts` empties every app table and reseeds in one transaction, safe while the server runs.
- The epic's "Done when" list in `epic-checkinn-mvp.md` items 1 to 6; architecture AD-17 (nothing loads from the network except seed photos) and AD-18.
- A local `data/checkinn.db` created on an older branch has a different bookings table and makes every confirm fail; the checklist's setup step must say to delete it once before the expo build.
- Known open items for the presenter, from the story 8 to 14 plans' "Residual risks": copy written where the UX documents gave none; swipe and screen-reader announcements not tried on a real phone; "You're booked!" shows for a short time after confirming, then the Booking view.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/offline.spec.ts` (read-only projects) and `e2e/booking/offline-booking.spec.ts` -- the blocked-network rows.
- [x] `e2e/booking/reset.spec.ts` -- reset while running; it must leave the database as later specs expect (it runs in the serial booking projects; make sure no later spec depends on Bookings made before it, and say how that is ensured).
- [x] `e2e/booking/phone-journey.spec.ts` -- the phone journey on `booking-mobile`.
- [x] `e2e/render-time.spec.ts` -- the spot check.
- [x] `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/expo-dry-run-checklist.md` -- setup (find the laptop's IP, firewall, same Wi-Fi), start, the checks for the projector and each phone, reset between sessions, recovery after a crash, known open items, and a sign-off table left blank.
- [x] `README.md` -- a short "Running at the expo" section pointing at the commands and the checklist.

**Acceptance Criteria:**
- Given `npm run build` then `CI=1 npm run test:e2e`, then every spec passes against `npm start`.
- Given the checklist, when a presenter follows it without help, then they can start the app, reach it from a phone, and reset it between sessions.
- Given this story's result, then it states plainly that the dry-run has not been performed.

## Implementation Notes

- **Slots.** All 14 existing slots were taken, and the phone journey needs a calendar slot (see the review fixes below for the final use of slots 10 and 13). `e2e/support/booking.ts` now starts at day +6 (after the read-only days +1 to +5) with 11 calendar slots in 55-day windows, and the URL slots moved to 11 to 14. `bookingStay` throws if a calendar slot's Stay would end after the phone sheet's last month (only slot 10 of the last retry's window with more than 3 nights could). UJ-3 moved from slots 10, 11 to 11, 12. New: 10 phone journey, 13 offline booking, 14 reset.
- **Blocked network.** `e2e/support/network.ts` `blockNetwork` aborts every request not to the app's origin, records any remote request that is not a seed photo (AD-17) and any app request that fails or answers 400+. `net::ERR_ABORTED` on app requests is ignored: that is the browser cancelling a previous page's prefetch on navigation. `expectNoHorizontalScroll` is shared by the new specs.
- **Reset ordering.** `e2e/booking/reset.spec.ts` runs the real `npm run db:reset` with `CHECKINN_DB_PATH` set to the e2e database, while the e2e server is up, and checks the seed Availability, the not-found lookup, the default search's 12 properties and zero `bookings` rows. It is safe for the specs around it because the booking projects run one test at a time after the read-only projects, and every booking spec makes the Bookings it checks inside its own test and slot; none reads a Booking made by another test (global setup makes none). The reasoning is written at the top of the spec.
- **Phone journey** runs only on `booking-mobile` (skipped on `booking-desktop`), at 390 × 844, and books Coral Coast Resort (Free cancellation) through the Home calendar sheet.
- **Render spot check** times navigation start to the visible headline from the test runner, 5 warm loads, median under 1 second; the message lists every load.
- **No bugs found.** No app code changed.
- **Review fixes (2026-10-14):**
  - Checklist: the projector's Share step now expects "Link copied" (`localhost` is a secure context); each phone has a Share row that expects the fallback dialog with the link selected, and the copy row expects the reference to be selected. Share and copy are described as the icons they are (the share icon beside the heart; the copy icon beside the reference).
  - `offline-booking.spec.ts` now runs UJ-1 from the Home bar, picking dates in the calendar, with the network blocked. It takes calendar slot 10 on `booking-desktop` only; on `booking-mobile` the phone journey (slot 10 there) now runs under `blockNetwork` too, so booking, lookup and cancel all run with the network blocked on a phone. The two specs each run in one project, so they never share a window. URL slot 13 is now free.
  - `offline.spec.ts` asserts the placeholders by role and accessible name: each City tile's "<City> destination photograph", the first card's and the Hotel page's photo alt texts, on top of the existing no-`<img>` check.
  - One seed photo host list and one `blockSeedPhotos`, in `e2e/support/network.ts`; `support/booking.ts` re-exports it, and `render-time.spec.ts` imports it.
  - The `net::ERR_ABORTED` exemption now covers only requests a navigation cancels: a document load or a Next.js router fetch (GET with the `rsc` or `next-router-prefetch` header), or a request the app had already answered without an error status. The last case is the server actions that redirect (Reserve, Confirm, Find booking, Cancel): the router follows the redirect before the answer's body is read to the end, and Chromium reports the action as aborted. An action or fetch aborted before an answer still fails the test.
- **Dry-run not performed.** The checklist is `expo-dry-run-checklist.md`, with a blank sign-off table; the human step above is still to do.

## Plan Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 7 findings — high 0, medium 1, low 6, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` The checklist never confirmed Share falls back to the dialog over plain HTTP (epic "Done when" item 6): the projector uses localhost, a secure context, and the phone table had no Share row — added a per-phone Share row expecting the dialog with the link selected; the projector expects "Link copied".
  - `[low]` `[patch]` The checklist named "COPY" and "Share" buttons, which are icon-only — now described as the copy icon beside the reference and the share icon in the hotel header; the phones expect the reference to be selected.
  - `[low]` `[patch]` The blocked-network booking spec jumped to the results URL instead of running UJ-1 — it now searches from Home and picks dates in the calendar (calendar slot 10, `booking-desktop` only, since the phone journey holds that slot on `booking-mobile`).
  - `[low]` `[patch]` The offline placeholder checks matched names shown with or without photos — they now find the placeholders by role and exact name on the City tiles, the first card and both Hotel photos.
  - `[low]` `[patch]` Cancelling never ran with the network blocked — the phone journey now uses `blockNetwork` and checks the network is clean at the end. Desktop books and looks up blocked but does not cancel blocked.
  - `[low]` `[patch]` The seed photo host list was copied into three e2e files — one list and one `blockSeedPhotos` helper in `e2e/support/network.ts` for the new specs; the older read-only specs keep their own lists.
  - `[low]` `[patch]` Every `net::ERR_ABORTED` on an app request was ignored — now only document loads, router fetches (RSC or prefetch), and requests already answered without an error status (redirecting server actions, which Chromium reports as aborted).

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` created by the build.
- `npm run test:e2e` -- expected: all specs pass on every project.
- `CI=1 npm run test:e2e` (after the build) -- expected: all specs pass without a rebuild.

**Results (2026-10-14, Windows 11):**
- `npm run lint`, `npm run typecheck`, `npm test` (70 files, 649 tests) and `npm run build`: green. `data/checkinn.db` was not touched by the build.
- `npm run test:e2e`: 171 passed, 7 skipped (existing project-specific skips plus the phone journey on `booking-desktop`).
- `CI=1 npx playwright test` after the build: 171 passed, 7 skipped, without a rebuild.
- Expo dry-run: **not performed**.

**Manual checks (if no CLI):**
- The expo dry-run on the presenter laptop with the projector and two phones, following the checklist. Not performed by this build.

## Auto Run Result

Status: built (2026-10-14). The expo dry-run (epic "Done when" item 6) has **not** been performed.

**Summary:** Added Playwright specs for the epic's cross-cutting checks: every guest flow with the network blocked (browse, book, look up, and cancel on the phone), `npm run db:reset` against the running app restoring fresh-clone results, the full journey at a phone viewport, and a render spot check (median time to the headline under 1 s on `/search` and a Hotel page). Wrote the presenter's dry-run checklist and a "Running at the expo" README section. No app code changed; the new specs found no app bugs.

**Files changed:**
- `e2e/offline.spec.ts`, `e2e/render-time.spec.ts`, `e2e/booking/offline-booking.spec.ts`, `reset.spec.ts`, `phone-journey.spec.ts`, `e2e/support/network.ts`.
- `e2e/support/booking.ts` (date slots start at day +6; 11 calendar slots, URL slots 11 to 14), `e2e/booking/uj-3.spec.ts` (renumbered slots).
- `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/expo-dry-run-checklist.md`, `README.md`.

**Review:** 7 findings, all patched: 1 medium (the checklist never confirmed the Share fallback on the phones) and 6 low (icon wording, UJ-1 not run in the blocked booking spec, loose placeholder checks, cancel not run blocked, copied host list, a too-wide aborted-request exemption). Deferred: 0. Rejected: 0.

**Follow-up review recommended:** false (patched: high 0, medium 1, low 6).

**Verification (after the patches):** `npm run lint` clean; `npm run typecheck` clean; `npm test` 649 passed; `npm run build` succeeds and creates no database file; `npm run test:e2e` 170 passed, 8 skipped; `CI=1 npx playwright test` after the build 170 passed, 8 skipped with no rebuild; `npm run design:lint` 0 errors, 0 warnings.

**Residual risks:**
- The expo dry-run on the presenter laptop with a projector and two phones is still to do; the checklist's firewall and IP steps are untried on real hardware.
- The 1-second render limit has a small margin on a slow CI runner (each test took about 0.4 to 0.5 s locally).
- Booking specs now start at day +6, leaving less room for more calendar-picked booking specs.
- Desktop does not run the cancel flow with the network blocked; the phone journey does.
