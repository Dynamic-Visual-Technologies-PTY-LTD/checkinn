---
title: 'Reset and e2e isolation'
type: 'feature'
ticket: '3'
created: '2026-10-13'
status: done
baseline_revision: '179bf40ffe14966a72f1423de9ee6f14ee782c71'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The only way back to fresh-clone data is deleting the DB file, which fails on Windows while the server holds it (AD-6). The e2e suite reuses the developer's dev server and writes to `data/checkinn.db`, so once Bookings exist, tests and the developer corrupt each other's data (AD-18).

**Approach:** `npm run db:reset` opens the same file and, in one transaction, empties every table and re-inserts the seed. It is safe while the app runs. Playwright runs its own server on a dedicated port against a temp DB file, resets it in global setup, and has serial `booking-desktop` → `booking-mobile` projects ready for the booking specs.

## Boundaries & Constraints

**Always:** Reset never deletes or recreates the file. It runs in one transaction, covers every app table (catalog now, bookings later, with no edit needed), and leaves `__drizzle_migrations` alone. It works with the dev server running, and the server shows the reset data on its next request. E2E never reuses an existing server and never opens `data/checkinn.db`. Booking specs (`e2e/booking/**`) run only in the booking projects, serially, mobile after desktop; read-only specs run in `chromium` and `mobile`. A `uniqueGuestEmail()` helper exists for booking specs. CI keeps working with no workflow change.

**Never:** No edits to `.github/workflows/`, `next.config.ts`, `tsconfig.json` or the ESLint config. No bookings tables or booking specs (stories 11+). No `next dev` as the e2e server. No duplicating the seed mapping outside `src/db/seed.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Reset while running | `npm run dev` up; extra rows inserted; `npm run db:reset` | Exit 0; `/` shows 6 tiles summing to 12 without a restart | busy_timeout 5000 covers a brief lock |
| Reset, no DB | No file at the path | File created, migrated and seeded (same as first access); exit 0 | — |
| Reset fails mid-way | Insert throws | Transaction rolls back; previous data intact; non-zero exit with message | Error printed, exit 1 |
| Custom path | `CHECKINN_DB_PATH` set | Resets that file only | — |
| E2E with dev running | `npm run dev` on 3000; `npm run test:e2e` | Suite runs on its own port and temp DB; `data/checkinn.db` mtime unchanged | — |

## Decisions (user, 2026-10-13)

- **Runner:** add dev dependency `tsx@4.23.15` (exact pin); `db:reset` is `tsx scripts/db-reset.ts`.
- **E2E server:** always a production server on the e2e port. Locally `next build` then `next start`; on CI `next start` only (CI builds first).
- **Workers:** cap local workers in `playwright.config.ts` (`isCI ? undefined : 2`) to avoid the Windows `spawn UNKNOWN` launch failures.
- **Plan size:** keep the full plan; the reset and the isolation are coupled.

</frozen-after-approval>

## Code Map

- `src/db/client.ts:24` `openDb(file)` (dir, pragmas WAL/foreign_keys/busy_timeout, migrate, seed-if-empty); `:50` `getDb()` cached on `globalThis` in dev; `:60` `dbPath()` reads `CHECKINN_DB_PATH`. Reuse `openDb` + `dbPath` for the script.
- `src/db/seed.ts:65` `loadSeed()`; `:74` `seedCatalog(db, seed)` inserts in its own `db.transaction` and deletes nothing. The reset needs the inserts inside its own transaction: split out an insert function that takes a transaction and is reused by both.
- `src/db/schema.ts` — 4 tables; FKs hotels→cities, images/room_types→hotels, no `onDelete`. Delete children first, or defer FKs.
- `src/db/test-db.ts` `createTestDb()` — `:memory:` helper for unit tests.
- `playwright.config.ts:3-5,19-29` — `baseURL` from `PORT ?? 3000`; projects `chromium` (Desktop Chrome) and `mobile` (Pixel 7); webServer `npm run start` on CI and `npm run dev` locally, `reuseExistingServer: !isCI`, no env, no globalSetup. Playwright's TS loader honours `@/` paths, so global setup can import `src/db` directly.
- `.github/workflows/ci.yml` e2e job — `npm run build`, then `npm run test:e2e` with `CI` set. A config-only port/env change needs no workflow edit.
- `e2e/*.spec.ts` — all read-only, relative `goto`, no hardcoded port.
- `AGENTS.md:102` — the e2e line to rewrite; `:92-95` command rows. `README.md` Data section — add `db:reset`.
- Verified locally: `next build` with `next dev` running succeeds, and dev keeps serving (dev uses `.next/dev`). A second `next dev` exits ("already running").

## Tasks & Acceptance

**Execution:**
- [ ] `src/db/seed.ts` -- extract the inserts so they can run in a caller's transaction; `seedCatalog` keeps its behaviour -- reuse in reset.
- [ ] `src/db/reset.ts` + `reset.test.ts` -- `resetDb(db, seed)`: one transaction, delete every user table except `__drizzle_migrations` (FK-safe), re-insert. Tests (node env, temp file DB): mutated data restored to 12 Hotels; a second open connection sees the reset; a forced failure leaves data intact -- AD-6.
- [ ] `scripts/db-reset.ts` -- `openDb(dbPath())`, `resetDb`, close, log counts; exit 1 on error.
- [ ] `package.json` -- `db:reset` script `tsx scripts/db-reset.ts`; dev dependency `tsx@4.23.15` (exact).
- [ ] `e2e/global-setup.ts` -- reset the e2e DB file -- AD-18.
- [ ] `e2e/support/guest.ts` -- `uniqueGuestEmail()`.
- [ ] `playwright.config.ts` -- dedicated port, `webServer.env.CHECKINN_DB_PATH` (temp file under `os.tmpdir()`), `reuseExistingServer: false`, server command `npm run build && npm start -- --port <e2e port>` locally and `npm start -- --port <e2e port>` on CI, local workers capped at 2, globalSetup, booking projects with `dependencies` and `fullyParallel: false`; read-only projects ignore `e2e/booking/**`.
- [ ] `AGENTS.md`, `README.md` -- `db:reset` row; e2e line describes the port, temp DB and build.

**Acceptance Criteria:**
- Given `npm run dev` is running and extra rows are in the catalog, when `npm run db:reset` runs, then it exits 0 and `/` again shows 12 Hotels across 6 tiles.
- Given `npm run dev` is running, when `npm run test:e2e` completes, then all specs pass and `data/checkinn.db` is unchanged.

## Implementation Notes

## Plan Change Log

## Review Triage Log

Verdicts: 1 medium, 0 high, 0 low, 0 false, 0 maybe-false; 1 note outside the diff.

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | Booking projects run concurrently with `chromium`/`mobile` | medium | `playwright.config.ts`: `booking-desktop` has no `dependencies`, so once booking specs land, they share the server and temp DB with read-only specs that read availability, the race AD-18 forbids. | patch: `booking-desktop` depends on `chromium` and `mobile` |
| 2 | Untracked `dev-server.log` could be committed | — | Not in the diff; a stray local log from an earlier session. | rejected as out of diff; the file was deleted |

## Design Notes

- Enumerate tables from `sqlite_master` (`type='table'`, excluding `sqlite_%` and `__drizzle_migrations`), with `PRAGMA defer_foreign_keys = ON` inside the transaction. Order then doesn't matter, and future tables get reset automatically.
- `getDb()` is not used by the script: no `globalThis` caching in a one-shot process.


## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- With `npm run dev` running: note the `data/checkinn.db` mtime, then run `npm run test:e2e` -- expected: all pass, mtime unchanged.
- With `npm run dev` running: `npm run db:reset` -- expected: exit 0; `curl localhost:3000` still lists the 6 tiles.
