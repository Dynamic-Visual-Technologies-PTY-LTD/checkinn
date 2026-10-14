---
title: 'Manage booking and cancel'
type: 'feature'
ticket: '13'
created: '2026-10-14'
status: 'built'
baseline_revision: '37cf02f2f025404ae80bb170d4cbfc38be0ef993'
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
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-confirmation.html'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A guest who closed the confirmation page can't get back to their Booking, and nobody can cancel one (FR-23, FR-24; UJ-3). The header's "Manage booking" link is a 404.

**Approach:** Build `/manage`, a reference and email lookup that grants access through the cookie, and extend `/bookings/[reference]` into the Booking view with status, the four cancellation states and a cancel dialog. Add the `findBooking` and `cancelBooking` server actions and the repo's cancel transaction. Ship the UJ-3 end-to-end journey.

## Boundaries & Constraints

**Always:** Lookup normalises the reference (`normaliseReference`) and the email (trim, lowercase) and matches both. A wrong reference and a right reference with a different email give the same `NOT_FOUND` result and the same message, "We couldn't find that booking. Check the reference and email." A successful lookup adds the Booking's token to `checkinn_access` and redirects to `/bookings/<reference>`. Email never appears in a URL; `/manage?reference=…` pre-fills only the reference, normalised and then cut to the field's length limit. Cancelling happens only in `src/features/booking/actions.ts` through `booking.repo.ts`, in one synchronous transaction that re-checks the snapshot's policy and deadline against "now" from `src/domain/clock.ts`, then sets `status` and `cancelled_at` (AD-3, AD-9, AD-16). It requires the Booking's token in the cookie; without it, or for an unknown reference, it redirects to `/manage?reference=…` and changes nothing. Outcomes follow AD-11: success redirects to the Booking view with `notice=cancelled`; `NOT_CANCELLABLE` (Non-refundable), `DEADLINE_PASSED` and `ALREADY_CANCELLED` return results the page shows. A cancelled Booking's Rooms count as available again through `availabilityFor`, with no other write. The Booking view reads the snapshot only. The same route shows "You're booked!" right after confirming and the Booking view otherwise; how it tells them apart puts nothing in the URL beyond `notice`, grants no access, and a lookup of one Booking never changes how another Booking's page shows. The cancel dialog uses the existing `Dialog`, focuses Keep booking first, returns focus to its trigger, never shows again on Back after a cancel was sent, and clears any earlier refusal when the guest tries again. Forms validate like the guest form (every blur and submit, error summary, `aria-describedby`), reusing story 12's form field and error summary. Copy verbatim from EXPERIENCE.md. Booking e2e specs live in `e2e/booking/` with `uniqueGuestEmail()` and their own date slots. DESIGN.md tokens only; targets ≥ 44px; no horizontal scroll from 320px. Follow `main`'s conventions.

**Never:** No editing a Booking, no un-cancel, no list of Bookings. No email, name or token in a URL or a log. No schema change, new dependencies or config changes. Do not edit AGENTS.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Manage page | `/manage` | h1 focused after navigation; Reference and Email fields with visible labels; "Find booking"; title "Manage booking · CheckInn" | — |
| Lookup | " ci-7k3p9q " and " Thandi@Example.COM " for an existing Booking, without the cookie | Redirect to `/bookings/CI-7K3P9Q`; the Booking view shows | While pending: "Finding…", disabled |
| Wrong reference / wrong email | Unknown reference, or a real reference with another email | `alert-error` "We couldn't find that booking. Check the reference and email." in both cases; values kept; focus on the alert | — |
| Empty fields | Submit empty | Error summary with a link per field; no lookup | — |
| Pre-filled | `/manage?reference=CI-7K3P9Q`, or 20 characters without `CI-` | Reference field holds it, valid for the form's own rule; email empty | — |
| Booking view, confirmed | Free cancellation, before the deadline | Status Confirmed; Mint "Free cancellation" with the deadline; "Cancel booking" secondary button | — |
| Cancel dialog | Activate Cancel booking | "Cancel your booking at Coral Coast Resort for Fri 13 – Wed 18 Nov 2026? This can't be undone."; Keep booking focused; Escape or Keep booking closes with no change | — |
| Cancel | Confirm in the dialog | "Cancelling…" disabled; then the Booking view with `alert-success` "Your booking is cancelled.", status Cancelled with the date, no cancel button; the Rooms are available again for those Nights | Back afterwards: no dialog |
| Deadline passed | Free cancellation, now after the deadline | "Free cancellation ended on Wed 11 Nov 2026, 14:00."; no cancel button | The deadline passes while the dialog is open: confirming shows this message, nothing is cancelled |
| Non-refundable | Any Non-refundable Booking | "Non-refundable. This booking can't be cancelled."; no cancel button | The action called anyway: `NOT_CANCELLABLE`, no change |
| Already cancelled | Cancel called on a Cancelled Booking | `ALREADY_CANCELLED`, no change; the view stays viewable | — |
| No token | Cancel called without the Booking's token | No change; redirect to `/manage?reference=…` | — |
| Just booked | Confirm, then reload the page | "You're booked!" | After a lookup of a different Booking, a reload of the first still shows "You're booked!" |
| UJ-3 | Book a Free cancellation Hotel, clear cookies, Manage booking from the header, look up, cancel | Ends on the cancelled Booking view; a new search shows the Hotel's Rooms back | — |
| Header link | "Manage booking" in the header | Opens `/manage` | — |

</intent-contract>

## Code Map

- `src/features/booking/actions.ts` -- `startBooking`, `confirmBooking` (typed input, called from the client inside a transition; `ActionResult` on failure, redirect on success; errors logged by name and code only). Add `findBooking` and `cancelBooking` in the same style. A private `grantAccess`-style cookie write exists in `confirmBooking`; share it.
- `src/features/booking/booking.repo.ts` -- `hotelRooms`, `bookingByKey`, `createBooking` (immediate transaction), the shared pricing function, and story 12's reads by reference. Add the lookup by reference and email and `cancelBooking(db, id, now)` (one immediate transaction).
- `src/features/booking/queries.ts` (story 12) -- reads a Booking by reference or key with the access check; `access.ts` -- `ACCESS_COOKIE`, `ACCESS_COOKIE_OPTIONS`, `parseAccessTokens`, `addAccessToken`, `serializeAccessTokens`, `hasAccessToken`.
- `src/features/hotels/availability.repo.ts` -- `availabilityFor` already counts only Confirmed lines, so a cancel frees Rooms with no other write; prove it in a repo test.
- `src/domain/` -- `cancellation.ts` (`cancellationLine`, `deadlinePassed`, `deadlineLabel`, `cancellationDeadlineInstant`): add the four-state rule for a stored Booking (its deadline instant and "now"). `reference.ts` (`normaliseReference`, `bookingPath`), `guest.ts` (`normaliseEmail`, email rule and messages), `criteria.ts` (`notice` with `cancelled`), `types.ts` (`BookingView`, `ActionResult`, `ErrorCode` already has `NOT_FOUND`, `NOT_CANCELLABLE`, `DEADLINE_PASSED`, `ALREADY_CANCELLED`), `clock.ts` (`nowIso`).
- `src/app/bookings/[reference]/` -- story 12's confirmation (redirects to `/manage?reference=…` without a token). The Booking view is the same route.
- `src/components/` -- story 12's `page-heading`, `booking-summary`, `booking-steps`, `form-field`, `error-summary`, `reference-block`, `booking-confirmation`; `dialog.tsx`, `button-styles.ts`, `toast.tsx`, icons. `site-header.tsx` links to `/manage`; check its prefetch setting now the route exists.
- `src/app/book/booking-details-form.tsx` -- the client form pattern: transition, `fieldErrors`, error summary focus, redirect handling (`redirectTarget`) and Back after a server action; reuse rather than copy.
- `e2e/booking/` and `e2e/support/booking.ts` -- story 12's journeys, `bookingStay(testInfo, slot)` date slots and the direct-booking helper. UJ-3 needs a Free cancellation Hotel (Coral Coast `hotel-005` or Beachside Breeze `hotel-006`) and a check-in far enough ahead that the deadline is open. The deadline-passed state can't be reached with real time in e2e: cover it in unit and action tests with an injected clock.
- `node_modules/next/dist/docs/` -- forms, server actions, `cookies`, `redirect` guides.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/cancellation.ts` + test -- the four-state rule for a stored Booking.
- [x] `src/features/booking/booking.repo.ts` + test -- lookup and the cancel transaction; Rooms freed.
- [x] `src/features/booking/actions.ts` + test -- `findBooking`, `cancelBooking`.
- [x] `src/app/manage/` (+ tests) and the lookup form.
- [x] `src/app/bookings/[reference]/` + tests -- confirmation versus Booking view, status, the four states, the cancel dialog, the cancelled alert with focus.
- [x] `e2e/booking/uj-3.spec.ts` -- the journey, the same not-found message for both wrong inputs, Non-refundable shows no cancel, Back after cancelling.

**Acceptance Criteria:**
- Given a wrong email or a wrong reference, then the same not-found message shows.
- Given a Free cancellation Booking before its deadline, when the guest cancels, then its Rooms are available again.
- Given Non-refundable and past-deadline Bookings, then no cancel button shows.
- Given `npm run build` with no database file, then it succeeds and creates none.

## Implementation Notes

- Confirmation versus Booking view: a second httpOnly cookie, `checkinn_booked`, lists the references this browser confirmed (set by `confirmBooking` on `created` only). `/bookings/[reference]` shows "You're booked!" when the Booking is Confirmed and listed, and the Booking view otherwise. `findBooking` removes only the Booking it found (deleting the cookie when empty), so a lookup never changes another Booking's page. The cookie holds references, never tokens, and grants nothing: `getBooking` still needs the token in `checkinn_access`. Helpers live in `access.ts`; `wasJustBooked` in `queries.ts` (after `io()`).
- Domain: `cancelState` (open, deadline-passed, non-refundable, cancelled) and `instantDateLabel` in `cancellation.ts`; `src/domain/lookup.ts` holds the lookup rule (`validateLookup`, `LOOKUP_LIMITS.reference` = 20, `prefilledReference`, `NOT_FOUND_MESSAGE`); `guest.ts` exports `emailError`, shared by both forms; `reference.ts` gains `managePath` (replaces `manageBookingHref` in `booking-confirmation.tsx`); `criteria.ts` exports `parseNotice` and adds `serializeNotice`, so the Booking view URL carries `notice=cancelled` and nothing else; `BookingView` gains `cancelledAt`.
- Repo: `bookingByLookup(db, reference, email)` and `cancelBooking(db, id, now)` (one immediate transaction; re-reads the snapshot and applies `cancelState`). `BookingRecord` gains the internal `id`. The repo test proves `availabilityFor` frees the Rooms with no other write.
- Actions: `findBooking` and `cancelBooking` (imported from the repo as `cancelStoredBooking`). Refusal messages: `NOT_CANCELLABLE` uses the Non-refundable line, `DEADLINE_PASSED` the "Free cancellation ended on …" line from the snapshot.
- UI: `src/app/manage/` (page, Suspense content reading only `reference`, client form reusing `FormField`, `ErrorSummary` and the shared button styles). `src/app/bookings/[reference]/booking-view.tsx` (status, reference, guest, Hotel, the four states), `cancel-booking.tsx` (badge, button and dialog), `cancelled-alert.tsx` (focus once, then `notice` leaves the address bar via `replaceState`). Shared: `src/components/server-action.ts` (`redirectTarget`, `NETWORK_ERROR`, moved out of the booking form), `src/components/cancellation-line.tsx` (the line, now also used by `BookingSummary`, whose `cancellation` prop is optional), `primaryButtonDisabled` and `secondaryButtonDisabled` in `button-styles.ts`. The header link to `/manage` now prefetches.
- Back after a cancel: the e2e run showed that Back renders the Booking view afresh from the router cache rather than from Activity, so a component ref was not enough. `cancel-booking.tsx` keeps a module-level set of references whose cancel redirected; a view of one of them never offers the dialog and refreshes from the server on mount and on Activity re-show.
- A refusal (`NOT_CANCELLABLE`, `DEADLINE_PASSED`, `ALREADY_CANCELLED`) closes the dialog and replaces the badge and button with an `alert-error` that takes focus. A server error shows the alert above the button; opening the dialog again clears it.
- Review fixes:
  - `cancelled-alert.tsx`: under `npm run dev`, StrictMode ran the mount effect twice. The first run removed `notice` from the URL and the second hid the alert. A `shown` ref now makes the effect run once per instance. A test renders the alert inside `<StrictMode>`, and it fails without the guard.
  - `cancel-booking.tsx`: a server error or network failure now shows Try again (EXPERIENCE.md Server error), which repeats the cancel and reads "Cancelling…" while it runs. A test covers it.
  - `cancel-booking.tsx`: after a final refusal the component calls `router.refresh()`, so the page is re-rendered from the server. An `ALREADY_CANCELLED` Booking then shows status Cancelled with its date, and a passed deadline or a Non-refundable policy shows its static line. The refusal alert goes away with the refresh because the server view replaces the component. Tests check the refresh.
- e2e: `bookingStay` gains slots 10 to 13 in their own windows after the 6 calendar windows, beyond the phone calendar, so they are reached by URL only; UJ-3 uses 10 and 11. `bookRoomsElsewhere` now returns the reference and email it inserted. `e2e/manage.spec.ts` covers the lookup page in the read-only projects (header link, title, focus, empty submit, not found, pre-fill and cut, 320px).
- Copy written here (not in EXPERIENCE.md): the `/manage` lead "Enter your booking reference and the email you booked with.", the labels "Booking reference" and "Email", "Enter your booking reference.", the field-length messages, the dialog title "Cancel booking", the Booking view headline "Your booking" (from the mockup) and its row terms, "Cancelled on <date>", "This booking is already cancelled.", and "Check the reference and email and try again." for a server-side validation result.

## Plan Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 3 findings — high 0, medium 1, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` Under `npm run dev` the "Your booking is cancelled." alert vanished at once: StrictMode runs the mount effect twice and the second run hid it after the first removed `notice` — fixed with a once-per-instance guard; a test renders it inside `<StrictMode>`.
  - `[low]` `[patch]` A server error while cancelling had no Try again button, against EXPERIENCE.md's Server error state — added; it repeats the cancel.
  - `[low]` `[patch]` After `ALREADY_CANCELLED` the alert said cancelled while the Status row still read Confirmed — a final refusal now refreshes the page from the server.

## Design Notes

- This contract was first built on a branch that diverged from `main`; its review found the dialog reappearing on Back, a refusal alert that never cleared, the pre-filled reference length, and a lookup clearing another Booking's just-booked state, which is why they are written in here.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` created by the build.
- `npm run test:e2e` -- expected: all specs pass on every project.
- `npm run design:lint` -- expected: passes.

## Auto Run Result

Status: built (2026-10-14).

**Summary:** Built `/manage` (reference and email lookup that grants access through the cookie, with the same not-found message for a wrong reference or a wrong email) and extended `/bookings/[reference]` into the Booking view: status, the four cancellation states, the cancel dialog and the cancelled alert. Added `findBooking` and `cancelBooking` and the repo's cancel transaction; a cancel frees the Rooms. Shipped the UJ-3 journey.

**Files changed:**
- `src/app/manage/` and `src/app/bookings/[reference]/` (`booking-content`, `booking-view`, `cancel-booking`, `cancelled-alert`) (+ tests).
- `src/features/booking/booking.repo.ts`, `actions.ts`, `queries.ts`, `access.ts` (+ tests).
- `src/domain/cancellation.ts`, `lookup.ts`, `guest.ts`, `reference.ts`, `criteria.ts`, `types.ts` (+ tests).
- `src/components/server-action.ts`, `cancellation-line.tsx`, `button-styles.ts`, `booking-summary.tsx`, `site-header.tsx`.
- `e2e/booking/uj-3.spec.ts`, `e2e/manage.spec.ts`, `e2e/support/booking.ts`.

**Review:** 3 findings, all patched: 1 medium (the cancelled alert vanished under StrictMode) and 2 low (no Try again on a cancel server error; a stale status after a final refusal). Deferred: 0. Rejected: 0.

**Follow-up review recommended:** false (patched: high 0, medium 1, low 2).

**Verification:** see the commit and PR; full checks run after merging `main`.

**Residual risks:**
- A `checkinn_booked` cookie (httpOnly, references only, no access) tells "You're booked!" from the Booking view; it is not in AD-15.
- Back after a cancel relies on Next's Back behaviour and the redirect digest format, as story 12's form does.
- After a final refusal the page refreshes and the focused alert is replaced by the server view, so focus falls back to the document.
- The deadline-passed state is covered with an injected clock only.
- Copy written here: the `/manage` lead, the field labels and messages, the dialog title "Cancel booking", "Cancelled on <date>", "This booking is already cancelled.", "Check the reference and email and try again."
