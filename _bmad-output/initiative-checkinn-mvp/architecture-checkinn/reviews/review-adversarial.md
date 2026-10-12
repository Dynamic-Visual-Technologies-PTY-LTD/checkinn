---
reviews: ../architecture-checkinn.md
lens: adversarial (compliant-but-incompatible sibling units)
reviewer: adversarial subagent
date: '2026-10-09'
verdict: NOT READY. 2 critical, 6 high, 7 medium, 5 low
---

# Adversarial Review: CheckInn MVP Architecture Spine

**Method.** For each hole I build two units one level below the spine (epics or stories) that each follow every AD to the letter but still don't fit together when integrated. Each hole gets a severity and a concrete AD fix. I checked the spine against the PRD (FR-1 to FR-27, addendum), EXPERIENCE.md (state patterns, flows) and the actual seed file (`hotel-booking-demo.json`).

**Verdict.** The spine is a solid start: layering, one write path, derived availability and the result contract are the right ideas. But the seams between the booking epic and its neighbours are still underspecified. The two critical holes would show up in the first integration build, not at the expo. Close C1, C2 and H1 to H4 before stories are written.

---

## Critical

### C1. `getAvailability` is async (AD-2), but must run inside a synchronous transaction (AD-3, AD-5)

- **Unit A, "Availability query" story (hotels epic):** follows AD-2, so `getAvailability` is `async` and starts with `await connection()`. Follows AD-4, so it is "the one query" feeding search and the room table.
- **Unit B, "Confirm booking" story (booking epic):** follows AD-3, so it runs one synchronous `better-sqlite3` `db.transaction(...)`. Follows AD-5, so it may read bookings "only through `getAvailability`". The sequence diagram shows `getAvailability` inside `BEGIN … COMMIT`.
- **Divergence:** `better-sqlite3` transactions cannot span an `await`. If the function passed to `db.transaction` returns a Promise, the transaction commits before the awaited reads run. Unit B can either (a) await `getAvailability` before the transaction and lose the oversell guarantee (TOCTOU, so PRD §5 reliability fails), or (b) write its own synchronous SQL and break AD-4/AD-5's "one query". Both are compliant readings. Neither gives one atomic check-and-insert. A further, smaller issue: `booking/actions.ts` importing from `features/hotels/queries.ts` is a cross-feature dependency AD-1 never addresses.
- **Severity:** critical. It defeats the oversell guarantee, the spine's main reliability claim.
- **Fix (tighten AD-4, AD-2 and AD-3):**
  > **AD-4 Rule (replace):** Availability is computed by one **synchronous** function `availabilityFor(db, hotelId | null, stay): Map<roomTypeId, number>` in `src/features/hotels/availability.ts` (server-only, not a `queries.ts` file). It returns, per Room type, `totalRooms − max over Nights of booked Rooms`, floored at 0. `getAvailability` in `queries.ts` is a thin `async` wrapper (`await connection()` then `availabilityFor(...)`) for pages. `booking/actions.ts` calls `availabilityFor` directly inside its `db.transaction`. No `await` may appear inside a `db.transaction` callback.
  >
  > **AD-1 addition:** `src/features/booking` may import `src/features/hotels/availability.ts`. No other cross-feature imports.

### C2. The Booking view is "gated by email", but no AD says how the email reaches it

- **Unit A, "Confirm booking" story:** follows AD-3, so it calls `redirect('/bookings/CI-7K3P9Q')`. The URL carries no email, so the gate either fails or Unit A adds `?email=…`.
- **Unit B, "Manage booking" story:** follows AD-10/AD-11, so `findBooking` is a server action that returns `{ ok: true, booking }` and renders inline on `/manage`. It never uses `/bookings/[reference]`. Or it redirects there with the email in a query string.
- **Unit C, "Cancel" story:** follows AD-3 and needs the email to re-authorise. It might trust a hidden form field, re-prompt, or read a cookie.
- **Divergence:** three stories, three ways to carry the credential: a query string (puts guest email in URLs, history, share links and proxy logs, against the logging convention), a cookie, or an inline render. A confirmation link shared or refreshed after a cookie expires shows "not found" right after a successful booking. The cancel action may accept a reference without the email (an insecure direct object reference) because no AD says it must re-check both.
- **Severity:** critical. It breaks the confirmation climax of every flow (SM-1) and allows cancelling bookings by reference alone.
- **Fix (new AD-15 "Booking access"):**
  > A Booking view is authorised by an **access grant**. Each Booking gets a random `access_token` (128-bit, stored `UNIQUE` on `bookings`). An httpOnly, `SameSite=Lax` cookie `checkinn_access` holds the tokens this browser has earned, by confirming or by a successful reference + email lookup. Ids are never put in the cookie because they can be guessed. `confirmBooking` and `findBooking` append the token, then `redirect('/bookings/{REFERENCE}')`. `/bookings/[reference]` renders when one of the cookie's tokens belongs to that Booking; otherwise it shows the Manage booking form pre-filled with the reference. Email never appears in a URL. `cancelBooking(reference)` re-checks the grant inside its transaction and returns `NOT_FOUND` when it is missing.

---

## High

### H1. The criteria codec always applies defaults, but two surfaces need "no dates"

- **Unit A, "Search results" story:** follows AD-8. With no `checkIn`, parse returns tomorrow for 1 night, so search runs (FR-1, FR-2). This is correct.
- **Unit B, "Hotel page availability" story:** follows AD-8. A shared link without dates parses to tomorrow, so the table shows prices. That violates FR-16 ("Reached without dates … shows 'Select dates…'"). And for a stale link, AD-8 says "defaults plus problems", so it has a valid Stay of tomorrow, while EXPERIENCE says "Stay is cleared … not run until dates are picked".
- **Divergence:** one story renders prices for tomorrow, the other hand-rolls a "was the date actually present?" check by reading `searchParams` directly, which bypasses the codec AD-8 exists to protect. The two surfaces show different states for the same stale link.
- **Severity:** high.
- **Fix (tighten AD-8):**
  > `parseCriteria(params, today)` returns `{ criteria: { q, stay: Stay | null, party }, problems: Problem[], source: 'url' | 'default' }`. `stay` is `null` when the dates are absent or invalid. Each surface then applies one written policy: **Search results** with `stay === null` and no problems uses `defaultStay(today)`. **Search results** and the **Hotel page** with problems, and the **Hotel page** with absent dates, render the no-dates state. **Booking details** with `stay === null` redirects to the Hotel page. These policies live in `src/domain/criteria.ts` as `resolveStayFor(surface, parsed, today)`.

### H2. `/book` cannot identify the Hotel, and `sel` is not validated against one

- **Unit A, "Reserve" story (hotel page):** builds `/book?checkIn…&sel=hotel-001-standard:1`. The Room type ids in the seed (`hotel-001-standard`) imply the Hotel, so it does not add a hotel parameter.
- **Unit B, "Booking details" story:** follows AD-8's parameter list exactly, so it has no hotel parameter. It derives the Hotel from the first `sel` entry, or expects `hotelId` and sends a guest who arrives without it to not-found.
- **Divergence:** the URL contract is incomplete. Neither unit is told to reject `sel=hotel-001-standard:1,hotel-002-family:1`, which mixes Hotels and breaks FR-18's "A Booking is for one Hotel only". Duplicate ids, `qty=0`, `qty>5` and unknown ids are also unchecked. AD-3 re-checks availability but not that the lines share the Booking's Hotel. Party-capacity (FR-18) re-validation in the action is not assigned either, and no domain module owns the capacity rule.
- **Severity:** high.
- **Fix (tighten AD-8 and AD-3, add a domain rule):**
  > **AD-8:** Booking details carries `hotel` (the Hotel id) plus `sel`. `parseSelection` returns `{ roomTypeId, qty }[]` sorted by id, merges duplicates, drops `qty = 0`, and rejects `qty` outside 1–5 and more than 2 lines.
  >
  > **AD-3:** the create transaction verifies that every Room type belongs to `hotel`, that total `qty` ≥ 1, and that `fitsParty(lines, party)` holds (`src/domain/occupancy.ts`: Σ maxGuests × qty ≥ adults + children). Any failure returns `VALIDATION`.

### H3. AD-3 "always `redirect()`" conflicts with AD-11 "return a result" for the outcomes the UX navigates on

- **Unit A, "Confirm booking" story:** on `ROOM_UNAVAILABLE`, follows AD-11 and returns `{ ok: false, code: 'ROOM_UNAVAILABLE', names }` to the `/book` form, which renders the alert on the Booking details page.
- **Unit B, "Hotel page room table" story:** follows EXPERIENCE ("Returns to the Hotel page room table … `alert-error` … naming the Room type"). It expects to be navigated to with something in the URL telling it which Room type ran out. AD-8's codec has no such parameter.
- **Unit C, "Cancel" story:** follows AD-3, so it redirects after success, and the `alert-success` "Your booking is cancelled." has nowhere to come from. Or it returns `{ ok: true }` and ignores AD-3.
- **Divergence:** there is no agreed transport for post-action one-time messages, and `{ ok: true, … }` is unreachable when `redirect()` throws.
- **Severity:** high. This is the documented failure path of Flows 1 and 2.
- **Fix (tighten AD-11):**
  > Success always ends in `redirect()`. `{ ok: true }` is never returned, so the success branch is removed from the type. One-time outcomes travel as a codec-owned URL parameter `notice` (`notice=cancelled`, `notice=unavailable:hotel-001-standard`), parsed by `criteria.ts` and removed with `router.replace` after it is announced. `ROOM_UNAVAILABLE` redirects to `/hotels/{hotel}?{criteria}&sel={kept lines}&notice=unavailable:{ids}#rooms`. Other `{ ok: false }` results render in place.

### H4. A per-render `idempotencyKey` does not survive Back or refresh

- **Unit A, "Booking details" story:** follows AD-10, so it generates a new UUID on every server render of `/book`.
- **Unit B, "Already booked" state (EXPERIENCE):** "Reached by refresh or Back after confirming. Shows the existing confirmation."
- **Divergence:** after the redirect, Back re-renders `/book` (with `cacheComponents` and dynamic data there is no guaranteed bfcache) and issues a new key. The guest presses Confirm again and a second Booking is made, which breaks FR-22. Unit B cannot detect "already booked" because nothing links the `/book` URL to the earlier Booking. Each unit is compliant on its own.
- **Severity:** high.
- **Fix (tighten AD-10):**
  > The idempotency key is minted on the **Reserve** navigation and carried in the `/book` URL as `k` (UUID v4, parsed by the codec). It is not minted per render. `/book` first looks up a Booking by `k`: if one exists **and** the browser holds an access grant (C2), it redirects to `/bookings/{ref}`; if one exists without a grant, it shows "This booking is already confirmed. Use Manage booking." A `k` reused with a different payload returns `VALIDATION`.

### H5. The canonical stored form of the reference is undefined

- **Unit A, "Reference generator" story:** stores `CI-7K3P9Q` (AD-10: "`CI-` plus 6 characters … stored `UNIQUE`").
- **Unit B, "Manage lookup" story:** "normalises case and an optional `CI-` prefix" by stripping the prefix to `7K3P9Q` and querying, so it never matches. The `/bookings/[reference]` route story accepts `/bookings/ci-7k3p9q` and renders without a canonical redirect, so share links, the copy button and the page title differ.
- **Severity:** high. Lookups fail silently, and AD-10 makes failure look like "not found".
- **Fix (tighten AD-10):**
  > The canonical reference is uppercase with the prefix (`CI-7K3P9Q`), stored and displayed exactly so. `normaliseReference(input)` in `domain/reference.ts` trims, uppercases, adds `CI-` when missing, and returns `null` when the result fails `^CI-[A-HJKMNP-Z2-9]{6}$`. Every lookup and the `/bookings/[reference]` route use it. A non-canonical route param `redirect`s to the canonical one.

### H6. Reset deletes the file while the per-process singleton still holds it

- **Unit A, "db:reset" story:** follows AD-6, so it deletes `data/checkinn.db`, then migrates and seeds.
- **Unit B, "DB client" story:** follows AD-12, so it holds one open connection on `globalThis`, in WAL mode.
- **Divergence:** at the expo the presenter runs `npm run db:reset` between sessions while `next start` is running. On Windows (the presenter laptop is not pinned) the delete fails with `EBUSY`. On macOS and Linux the server keeps writing to the unlinked inode, so the app still shows the old Bookings and new ones vanish on restart. The `-wal` and `-shm` files are also left behind. This defeats FR-26 and SM-2 ("no restart needed").
- **Severity:** high (an operational failure at the demo itself).
- **Fix (tighten AD-6 and AD-12):**
  > Reset never deletes the file. `resetDatabase(db)` in `src/db/seed.ts`, in one transaction, deletes `booking_lines`, `bookings` and the catalog tables, then re-inserts the seed. `npm run db:reset` opens the same path and calls it, and it is safe while the server runs (WAL plus a busy timeout of `busy_timeout = 5000`). A full rebuild (delete the file) is a separate `db:rebuild` that requires the server to be stopped.

---

## Medium

### M1. "Available" means three different things across search, the card price and the room table

- **Search story:** FR-5 says a Hotel is listed if some Room type has availability ≥ 1 for every Night.
- **Listing card price story:** FR-6 says "lowest Nightly price among available Room types × Nights × the Party's Rooms". With `rooms=3` and the cheapest type at 1 left, one reading uses availability ≥ 1 and shows a price nobody can book; the other uses availability ≥ `party.rooms`.
- **Room table story:** the summary total depends on the selection, not `party.rooms`. AD-9 says totals come from `pricing.ts`, but SM-4's "same total everywhere" holds only when the selection equals `party.rooms` × the cheapest type.
- **Fix (new rule in AD-7, extend AD-4):**
  > `src/domain/availability.ts` exports `isAvailable(n) = n ≥ 1`, used everywhere. The card "from" price uses `cheapestAvailable(roomTypes, avail)` × Nights × `party.rooms` (FR-6, accepting that it is indicative). Ranking's "lowest Nightly price" uses the same function. The room table's initial suggested selection is `party.rooms` × that Room type, so the summary total equals the card's total before the guest changes anything (SM-4).

### M2. Night coverage: the pure function vs the SQL predicate

- **Domain story:** writes `coversNight(stay, night)` with check-in included and check-out excluded (AD-4).
- **Query story:** cannot call a TypeScript function inside SQL, so it writes `check_in <= :night AND check_out > :night`, or `check_in < :checkOut AND check_out > :checkIn` per Booking (an overlap test, not a per-Night maximum, which over-counts when two Bookings don't overlap each other). Both satisfy "one function decides".
- **Fix (tighten AD-4):**
  > The query loads Confirmed lines overlapping the Stay (`check_in < :checkOut AND check_out > :checkIn`) and computes the per-Night maximum in TypeScript with `domain/availability.ts` `bookedPerNight(lines, stay)`, which is built on `coversNight`. No other Night arithmetic is allowed in SQL. The Stay lives on `bookings` (`check_in`, `check_out` as `YYYY-MM-DD` TEXT), not on lines.

### M3. Booking total and policy: snapshot or recompute?

- **Confirm story:** stores `booking_total_rand` and `nightly_price_rand` per line (it is natural to snapshot).
- **Booking view story:** AD-9 says "Totals are computed only in `pricing.ts`", so it recomputes from the current `room_types`. The cancel story reads the cancellation type and `checkInTime` live from `hotels`.
- **Divergence:** the views agree today only because the catalog is read-only. A seed edit followed by `db:reset` deletes the Bookings anyway, but a future seed change applied by migration would silently reprice old Bookings. The SM-4 test also checks different code paths.
- **Fix (add to AD-9 and AD-3):**
  > The create transaction snapshots `nightly_price_rand` per line, plus `booking_total_rand`, `cancellation_type` and `check_in_time` on `bookings`, all computed by `pricing.ts` at insert time. Every Booking view and the cancel action read the snapshot. Recomputing is only for pre-booking surfaces.

### M4. View-model ownership is unassigned (except search)

- **Hotel page story:** defines `RoomRowView` in `features/hotels/queries.ts`. Then `components/room-table` cannot import it, because AD-1 forbids components from importing `queries`.
- **Room table story:** defines its own props type, with fields like `price` vs `nightlyPriceRand` and `left` vs `available`.
- **Fix (tighten AD-7 into a general rule):**
  > Every view model passed to a component is declared in `src/domain/types.ts` (or `src/domain/view-models.ts`): `ListingCardView`, `HotelPageView`, `RoomRowView { roomTypeId, name, bedsLabel, sleeps, amenityLabels, nightlyRand, stayTotalRand | null, available: number | null }`, `BookingSummaryView` and `BookingView { reference, status: 'confirmed' | 'cancelled', … }`. Queries map rows to these types, and components import only these types.

### M5. Email matching normalisation

- **Confirm story:** stores the email as typed (`Thandi@Example.com `).
- **Lookup story:** compares it after lowercasing and trimming, or compares it as typed. AD-10 says "both match", not how.
- **Fix (AD-10):**
  > Email is stored as `trim().toLowerCase()` and compared the same way. The normalisation lives in `domain/booking.ts` `normaliseEmail`. Validation uses one regex from the same module, on both client and server.

### M6. AD-6's example ids are wrong, so URL assumptions diverge

AD-6 cites `harbourlight-retreat` as a catalog id, but the seed's Hotel ids are `hotel-001` … `hotel-012` and its Room type ids are `hotel-001-standard` and `hotel-001-family`. One story builds `/hotels/harbourlight-retreat` (a slug, following the AD's example); another builds `/hotels/hotel-001` (following the seed, as the Rule requires). Tests, mocks and e2e paths will disagree.

- **Fix:** correct the example to `hotel-001` and `hotel-001-standard`, and state "URLs use seed ids verbatim; no slugs in the MVP".

### M7. Reading the current time vs `cacheComponents` prerendering

- **Search bar story (client component on Home):** computes the default "tomorrow" and disables past days with `clock.ts` during render.
- **Criteria story:** `parseCriteria` calls `clock.today()` in the page body, outside any `queries.ts`, so AD-2's `connection()` has not run yet.
- **Divergence:** Next 16 raises a current-time prerender error (`blocking-prerender-current-time[-client]`, see `node_modules/next/dist/docs`) for any time read during prerender outside a dynamic boundary. AD-2 only guards database reads.
- **Fix (extend AD-2):**
  > Any code that reads the clock or `searchParams` runs after `await connection()` (server), or inside a `<Suspense>`-wrapped client component that reads the time in an effect or event, never during render. The server passes `today` (ISO) to client components as a prop. Clients never call `new Date()` for business rules.

---

## Low

| # | Pair that diverges | Fix |
|---|---|---|
| L1 | The cancellation story uses the seed's per-Hotel `timeZone`; the clock story hardcodes `Africa/Johannesburg` (AD-9). They agree today because every Hotel uses JHB. | AD-9: "Use `hotel.timeZone` for the deadline. The seed currently makes it JHB." Or state that `timeZone` is ignored and drop it from the schema. |
| L2 | Status: the DB stores `confirmed`; one view shows `confirmed` raw, another maps it to "Confirmed". `cancelled_at` is stored as UTC; one view shows a UTC date, another a JHB date. | Consistency table: status displayed via `formatStatus`. Every timestamp is displayed in `Africa/Johannesburg` through `lib/format.ts`. |
| L3 | Ranking ties (same score and same lowest price): the search story leaves insertion order; the e2e story asserts alphabetical order. | AD-7: the final tie-break is Hotel name ascending, then id. |
| L4 | Deadline boundary: one story offers cancel while `now < deadline`, another while `now ≤ deadline`. | AD-9: cancellable iff `now < deadline`. EXPERIENCE copy "until 14:00" means up to but not including. |
| L5 | AD-7 says city tiles "call `searchHotels`". The Home story calls it per tile at render (6 searches plus availability); the tile story only links to `/search?q=Cape%20Town`. | AD-7: tiles are links built with the codec. Home does not call `searchHotels` unless it shows counts. |

---

## Summary of AD changes requested

| AD | Change |
|---|---|
| AD-1 | Allow `booking` → `hotels/availability.ts`; forbid other cross-feature imports |
| AD-2 | Extend to clock and `searchParams` reads; client time only after render |
| AD-3 | No `await` in a transaction; validate Hotel, lines and capacity; snapshot price and policy |
| AD-4 | Synchronous `availabilityFor` plus an async wrapper; per-Night maximum in TypeScript; one `isAvailable` |
| AD-6 / AD-12 | Reset is in-place and transactional; correct the id examples |
| AD-7 | Card price and ranking rules; tie-break; tiles are links |
| AD-8 | `stay: Stay \| null` plus a per-surface policy; `hotel`, `k` and `notice` parameters; strict `sel` |
| AD-10 | Canonical reference form; email normalisation; key minted at Reserve |
| AD-11 | Success always redirects; one-time outcomes via `notice` |
| New AD-15 | Booking access grant (cookie) for `/bookings/[reference]` and cancel |
| Types | All view models in `src/domain` |
