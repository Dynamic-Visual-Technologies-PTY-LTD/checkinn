---
review: reconcile
target: ../architecture-checkinn.md
date: 2026-10-09
inputs:
  - ../../prd-checkinn/prd-checkinn.md
  - ../../prd-checkinn/addendum.md
  - ../../ux-checkinn/EXPERIENCE.md
  - ../../../../AGENTS.md
  - package.json, next.config.ts, playwright.config.ts, vitest.config.mts, .gitignore, .github/workflows/ci.yml, src/app/*
  - node_modules/next/dist/docs (server-only, connection(), Cache Components random/time rules)
spine_modified: false
---

# Reconcile review: architecture spine vs PRD, UX, AGENTS.md and code

Spine reviewed: `architecture-checkinn.md` (AD-1 to AD-14, draft, 2026-10-09). The spine was not changed. Each gap names the AD or section where the fix should go.

## Gaps

### High

**G1. The confirmation page and Booking view are "gated by email", but nothing carries the email there.**
- Source: FR-22 (confirmation page after confirm), FR-23, EXPERIENCE "Already booked", Flow 4. Spine: Conventions › Routes, AD-3 (`redirect()` to `/bookings/CI-XXXXXX`), AD-10.
- Conflict: AD-3 redirects to `/bookings/[reference]` with only the reference. The route is gated by email, so the guest who just booked can't see their own confirmation. Putting the email in the query string would leak personal data into URLs, history and server logs (PRD §5 public-repo hygiene, Logging convention). A Manage lookup has the same problem, because it is a POST and the result is a GET route.
- Fix (AD-10, Routes): pick one mechanism and write it down. For example, a successful confirm or lookup sets an httpOnly, same-site cookie that grants access to that reference (signed, or holding a random token stored on the booking), and `/bookings/[reference]` without the grant shows the Manage form. Or the action renders the confirmation directly, with no GET route. State plainly that email never appears in a URL.

**G2. `db:reset` deletes the database file while the server holds it open.**
- Source: FR-26, EXPERIENCE Flow 4 step 1 (the presenter resets between sessions with the app running), SM-2 ("no restart needed"). Spine: AD-6, AD-12.
- Conflict: AD-12 keeps one long-lived connection with WAL. On Windows, deleting the open file fails with EBUSY. On macOS and Linux the server keeps writing to the unlinked inode, so the reset is invisible until a restart. The `-wal` and `-shm` files are left behind either way.
- Fix (AD-6): reset runs in one transaction against the live file. Delete `booking_lines` and `bookings`, then re-apply the catalog from the seed. Alternatively, add an explicit "stop the server first" rule and accept that SM-2 needs a restart. Name the WAL side files in the rule.

**G3. AD-1's `import "server-only"` and AD-2's `connection()` break the Vitest and `tsx` paths that the spine itself prescribes.**
- Source: Conventions › Tests ("Queries and actions: Vitest against `:memory:`"), AD-6 (`npm run db:reset` "runs the same migrate-and-seed"), Structural Seed (`scripts/db-reset.ts`). Reality: the `server-only` package is not installed (Next resolves it internally, per `05-server-and-client-components.md`), and `vitest.config.mts` runs everything in `jsdom`.
- Conflict:
  - Under Vitest and `tsx`, `import "server-only"` either fails to resolve or resolves to the throwing default entry.
  - `connection()` called outside a Next request scope throws (`throwForMissingRequestStore` in `next/dist/server/request/connection.js`). Every `queries.ts` function calls it first (AD-2), so the prescribed query tests can't run.
  - `scripts/db-reset.ts` can't import `src/db/*` if every file there starts with `server-only`.
- Fix (AD-1, AD-2, Tests convention):
  - Split each query into a pure data function that takes `db` and is tested against `:memory:`, plus a thin exported wrapper that calls `connection()`. Alternatively, mock `next/server` and alias `server-only` in Vitest.
  - Keep `src/db/migrate.ts` and `src/db/seed.ts` free of `server-only`, or run `tsx --conditions=react-server`.
  - DB tests use `// @vitest-environment node`.
  - Changing `vitest.config.mts` is not on the ask-first list. Installing `server-only` would be.

**G4. The e2e database isolation the spine claims doesn't exist, and Playwright runs in parallel against one database.**
- Source: Conventions › Tests ("Playwright with a fresh database per run"), AD-12 ("temporary path for e2e"), Deferred › CI ("e2e uses a temporary `CHECKINN_DB_PATH`"). Reality: `playwright.config.ts` `webServer` sets no `env`. It uses `npm run dev` locally with `reuseExistingServer: true`, so e2e mutates the developer's `data/checkinn.db`. CI uses `npm run start` after `npm run build`. `fullyParallel: true` with two projects (desktop and Pixel 7) shares one server and one database.
- Conflict: the spine describes this as already true. Parallel booking specs (last-room, sold-out, cancel) will race and flake, and a reused dev server ignores any temporary path.
- Fix (AD-12, Tests convention):
  - Ratify a `webServer.env.CHECKINN_DB_PATH` temp path and a reset in `globalSetup`. Editing `playwright.config.ts` is not ask-first.
  - Turn off `reuseExistingServer`, or use a dedicated port, when the database matters.
  - Isolation rule: each booking spec uses its own Hotel or far-future dates, or booking specs run `serial`.
  - CI needs no `ci.yml` change if the env is set in the Playwright config. Say so in Deferred.

### Medium

**G5. A stale URL clears the Stay in EXPERIENCE, but AD-8 applies defaults.**
- Source: EXPERIENCE "Stale or invalid criteria" (invalid values become defaults, Stay is cleared, the search or table is not run until dates are picked) and "Hotel page without dates" (FR-16). Spine: AD-8 ("returns … the defaults plus a list of problems", default = tomorrow, 1 night).
- Fix (AD-8): the codec's result must model "no Stay" separately from "default Stay". For example, `{ criteria, stay: Stay | null, problems }`. Write down which surface applies the default Stay: Search results with no params runs the default search (FR-2), while Hotel page and Booking details show the no-dates state.

**G6. The "room ran out" return path has no defined URL or transport.**
- Source: FR-22 ("told which Room type ran out, returned to the room table with Stay and Party kept"), EXPERIENCE "Room ran out at confirm" (`alert-error` at the top of the availability section, focus moves to it, other selections kept, Flow 2 failure). Spine: AD-11 (`ROOM_UNAVAILABLE` carries the names), AD-8 (param list).
- Gap: AD-11 returns a result to the Booking details form, but the alert has to render on the Hotel page. Nothing defines how the action gets there (redirect with a param such as `unavailable=roomTypeId`, or client navigation), and the selection is not carried.
- Fix (AD-8, AD-11): add the param, or a rule that the client navigates using the codec, to `/hotels/[hotelId]?…&sel=…&unavailable=…`. Rule: the server clamps `sel` to current Availability on render.

**G7. AD-8 limits `sel` to Booking details, but EXPERIENCE puts the selection in the Hotel page URL too.**
- Source: FR-21 ("Back returns to the Hotel page with the selection kept"), EXPERIENCE Navigation ("Room quantities replace the URL state"), Stay and Party picker (clamp a quantity that now exceeds Availability, and announce it), Share (copies the URL with criteria).
- Fix (AD-8): `sel` is valid on `/hotels/[hotelId]` and `/book`. Selection changes use `router.replace`, and criteria changes use push. Put the clamp rule (qty ≤ Availability, drop unknown room type ids) in `src/domain` so the server render and client agree. Decide whether Share includes `sel`.

**G8. "Already booked" on Back or refresh is not guaranteed by AD-10's idempotency key.**
- Source: EXPERIENCE "Already booked" (refresh or Back after confirming shows the existing confirmation), FR-22. Spine: AD-10 ("each booking form render includes a hidden `idempotencyKey`"). The memlog says "client-generated key", which is inconsistent.
- Conflict: Back to `/book` re-renders the page. If it is not served from bfcache, the page gets a new key, so a second Confirm creates a second Booking. A server-generated UUID also needs `connection()` before `crypto.randomUUID()` under Cache Components (the Next caching guide, "Random values and timestamps").
- Fix (AD-10): say where the key comes from. Two options: derive it deterministically from the `/book` URL plus a key stored in `sessionStorage` per selection, or after success mark the selection consumed (a cookie or history `replace`) so `/book` redirects to the existing confirmation. Note the `connection()` requirement, and reconcile the memlog.

**G9. The server-error retry must keep form data, but AD-11 sends unexpected errors to `error.tsx`.**
- Source: EXPERIENCE "Server error" (an `alert-error` with Try again that repeats the last action; "Any entered form data is kept"). Spine: AD-11.
- Conflict: a route-level `error.tsx` replaces the segment, so the guest form and manage form lose their input.
- Fix (AD-11): server actions catch unexpected errors, log them with `console.error` (no email or phone), and return `{ ok:false, code:"SERVER_ERROR" }` so the form stays mounted. Reserve `error.tsx` for render-time failures. Add `SERVER_ERROR` to the code list.

**G10. Cache Components applies to time and random values, not only DB reads.**
- Source: AD-2 covers only DB reads. AD-9 (clock: "today" for defaults, deadlines) and AD-10 (UUID) run in server components. The Next docs say `Date.now()`, `new Date()` and `crypto.randomUUID()` cause prerender errors unless they follow `connection()`.
- Fix (AD-2): widen the rule to "anything that reads the DB, the clock (`src/domain/clock.ts` server use) or randomness runs after `await connection()` inside `<Suspense>`". `generateMetadata` that reads a Hotel name (page titles) follows the same rule.

**G11. The Poppins font is fetched from Google, which conflicts with offline and fresh-clone use.**
- Source: PRD §5 (the only network use is photos), FR-11, EXPERIENCE "No internet at the stand" (Poppins is self-hosted), addendum ("Poppins self-hosted through `next/font`"). Reality: `src/app/layout.tsx` uses `next/font/google`, which downloads at build time and in dev. An offline `npm run dev` or `npm run build` falls back to a default font or fails to fetch.
- Fix (AD-14, or a new AD on offline assets): use `next/font/local` with committed Poppins files (OFL, safe for a public repo). Rule: no runtime or build-time network fetch except remote photos in the browser.

**G12. AD-13's closed list of client components misses components EXPERIENCE requires.**
- Source: EXPERIENCE Component Patterns, Interaction Primitives.
- Missing from the list:
  - the price-match dialog and the cancel-confirmation dialog
  - the share-fallback dialog
  - See rooms (scroll and focus the heading)
  - the city tile, which must read the current Stay and Party from the search bar because Home has no criteria in its URL
  - the collapsed mobile search bar
  - the mobile summary bar and its sheet
  - focus-to-headline after navigation
  - restoring the scroll position and the focused card on Back to results
- Fix (AD-13): replace "only these" with a criterion: client only for state, effects or browser APIs, as in AGENTS.md. Keep the list as examples, and add a shared `useFocusOnNavigate` or equivalent. Clarify that city tiles on Home are links built client-side, with counts from the catalog and not from `searchHotels`. AD-7 currently says tiles call `searchHotels`, which would make the counts depend on Availability. FR-27 says "number of Hotels".

**G13. The `/book` URL doesn't identify the Hotel.**
- Source: AD-8 parameter list (`q`, `checkIn`, `checkOut`, `adults`, `children`, `rooms`, `sel`). Routes list `/book`.
- Fix (AD-8, Routes): add `hotel` to the codec, or use `/hotels/[hotelId]/book`. EXPERIENCE "No valid selection" also needs that id to redirect back to the right Hotel.

### Low

**G14. The responsiveness target isn't recorded.** PRD §5 asks for Search results and the Hotel page within 1 second on a laptop. The spine doesn't mention it. AD-4 (one aggregate query) makes it likely, but there is no budget or check. Fix: one line in Conventions or AD-4: "`getAvailability` runs one grouped query per request, never per Hotel per Night".

**G15. Accessibility (PRD §5, WCAG 2.1 AA) has no architectural home.** Deferred sends component detail to DESIGN and EXPERIENCE, which is fine. Route-level items still need a convention:
- `generateMetadata` titles in the form "<context> · CheckInn"
- focus moves to the main heading on navigation
- the live-region pattern

Fix: a Conventions row, "Page titles and focus".

**G16. Creating `data/` and the CI build.** `data/` doesn't exist yet, and `better-sqlite3` won't create parent directories. `src/db/client.ts` must `mkdir -p` the directory of `CHECKINN_DB_PATH`. The connection must also be opened lazily (`getDb()`), not when the module is imported, so that `next build` page-data collection never creates a database file. That lazy opening is what keeps the Deferred › CI claim true. Fix: AD-12.

**G17. Native module risk on a fresh clone.** `better-sqlite3` needs a prebuilt binary for Node 24 on each workshop OS. Without one it falls back to node-gyp, which needs a compiler (SM-3). Fix: a Deferred or Stack note to check prebuilds for Node 24 on win32, darwin-arm64 and linux-x64 before the workshop. Node 24's built-in `node:sqlite` is a dependency-free fallback.

**G18. The clock and deadline e2e tests.** AD-9 injects the clock in unit tests only, and Config says `CHECKINN_DB_PATH` is the only environment variable. "Deadline passed" is still testable end to end by booking a check-in for tomorrow, which falls inside 48 hours. Record that, so nobody adds a `CHECKINN_NOW` override without a decision. Fix: Tests convention.

**G19. A hydration note for the saved heart.** The `localStorage` state (`checkinn:saved`) must be read in an effect after mount, rendering not-pressed on the server, to avoid a hydration mismatch. Fix: one clause in AD-13.

**G20. The memlog and the Stack disagree on `@types/better-sqlite3`.** The memlog has 7.6.13 and then 9.6.0, and the Stack says 9.6.0 "(to install)" without "ask first". Every new dependency is ask-first under AGENTS.md. Fix: Stack, and add `server-only` if G3 is solved by installing it.

## Covered (no action)

- FR-2, FR-3, FR-5, FR-7 and PRD §5 workshop-ready: AD-7 gives search one seam with documented types.
- FR-5, FR-17, FR-22 and FR-24 Availability: AD-4 derives it, and the check-in-inclusive rule is pure.
- FR-22 oversell and §5 reliability: AD-3 uses one synchronous transaction, and AD-12 runs a single process with WAL.
- FR-22 reference format and FR-23 identical not-found: AD-10.
- FR-19, FR-20 and SM-4 money and totals: AD-9, through `pricing.ts` and `formatZar`.
- FR-24 deadline in SAST: AD-9 and `clock.ts`.
- FR-25 seed used unchanged, FR-26 reset command and §5 fresh clone migrate-and-seed: AD-6, apart from G2 and G3.
- FR-10, FR-11 and FR-27 photo fallback and credits, without a `next.config` change: AD-14.
- FR-9 save in the browser only: AD-13.
- FR-4 and FR-16 criteria in the URL through one codec: AD-8, apart from G5, G7 and G13.
- PRD §5 public-repo hygiene: `*.db`, `*.db-wal` and `*.db-shm` are already in `.gitignore`; Conventions › Logging never logs email or phone; no `.env` is committed.
- Loading skeletons: AD-2 uses Suspense.
- Not found: `not-found.tsx` is in the Structural Seed.
- AGENTS.md: the `@/` imports, the ask-first dependency list in Stack, server components by default, `"use client"` limited, no `next.config` or `tsconfig` change needed (`better-sqlite3` is in Next's built-in `serverExternalPackages`), tests beside the code, one app and no DB server. No AD contradicts AGENTS.md outright. G3 and G12 are the tensions.
- CI e2e builds and then runs `npm start`. That works with AD-2 because the build needs no database, provided G16 (lazy open) holds.
- Azure, RAG, observability and rate limiting are deferred on purpose.
