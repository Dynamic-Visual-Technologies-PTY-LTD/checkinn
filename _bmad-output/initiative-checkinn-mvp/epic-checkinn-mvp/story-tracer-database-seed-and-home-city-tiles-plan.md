---
title: 'Tracer: database, seed and Home City tiles'
type: 'feature'
ticket: '2'
created: '2026-10-13'
status: 'built'
baseline_revision: 'ee59b2a08688c4ff35f5a8d5bd4fc55a53edb87c'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CheckInn has no data. Every later story needs the catalog in SQLite, and nothing yet proves the path from the seed through a query to the browser.

**Approach:** Install the data stack, commit the seed unchanged, and add a Drizzle catalog schema with a committed migration. A lazy client migrates and seeds on first access (AD-6, AD-12). Home shows the 6 City tiles (catalog Hotel count, photo, credit) through a `RemoteImage` that falls back to a placeholder (AD-14), read under `io()` inside Suspense (AD-2).

## Boundaries & Constraints

**Always:** Seed copied byte-for-byte to `data/seed/hotel-booking-demo.json`; seed ids are primary keys. Catalog tables only: `cities`, `hotels`, `hotel_images`, `room_types`. The DB opens lazily on first query, never at import or build time. Exported functions in `src/features/*/queries.ts` call `await io()` first and import `server-only`; `src/db` and `*.repo.ts` do not. `src/domain` imports nothing from Next, React or db. DESIGN.md tokens only. Tile link: `/search?q=<City name>`, accessible name "<City>, <n> hotels". With seed photos blocked, the name and count still show on the placeholder.

**Never:** Change `next.config.ts`, `tsconfig.json`, the ESLint config or CI. No `next/image` for seed photos. No `"use cache"` on DB reads. No bookings tables, `db:reset`, e2e DB isolation (story 3), search bar or criteria codec (stories 4–5), or `/search` route (story 7). Never commit a `*.db` file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh clone | No `data/checkinn.db`; GET `/` | DB created, migrated, seeded; 6 tiles whose counts sum to 12 | No error expected |
| Restart | DB exists and seeded | No reseed; same 6 tiles | No error expected |
| Build | No DB file; `npm run build` | Build succeeds; no DB file created | — |
| Photos blocked | Seed photo hosts unreachable | Each tile shows the placeholder with name and count; credit still shown | `RemoteImage` swaps on `error` or on mount if already failed |
| Repo test | `:memory:` DB via the test helper | `countHotels` = 12; 6 cities with 2 hotels each | No error expected |
| Custom path | `CHECKINN_DB_PATH` set | DB opened at that path | — |

## Decisions (user, 2026-10-13)

- **Dependencies approved:** `better-sqlite3@13.0.3`, `drizzle-orm@0.45.4`; dev `drizzle-kit@0.31.11`, `@types/better-sqlite3@9.6.0`. Pin these exact versions.
- **City photo credit:** a "Photo credit" link to the City image's `sourceUrl`, placed outside the tile link. The seed stays unchanged.
- **Home hero now:** h1 "Find your stay." with the lead "Twelve hotels in six South African cities. Pick your dates and book in a few steps." (EXPERIENCE.md), in DESIGN.md tokens; update the h1 tests. Story 5 adds the search bar.
- **Plan size:** keep the full plan; a tracer bullet is not split.

</frozen-after-approval>

## Code Map

- `C:\Users\lntsinde\Downloads\hotel-booking-demo.json` -- seed source: 6 cities, 12 hotels, 24 room types, 24 hotel images. City `image{url,alt,sourceUrl,creditInstructions}`; photo hosts `commons.wikimedia.org`, `images.unsplash.com`.
- `.gitignore:30-34` -- already ignores `*.db`, `*.db-shm`, `*.db-wal`; `data/` is not ignored. No change needed.
- `src/app/page.tsx`, `src/app/page.test.tsx`, `e2e/home.spec.ts:4-11` -- current h1 "CheckInn" and tagline; default Tailwind sizes (deferred from story 1, fix with tokens here).
- `e2e/home.spec.ts:82-125` -- "no console errors or failed requests" and the offline-Poppins test assert empty failure lists; both must ignore seed-photo hosts only.
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md` -- `io()` from `next/cache`; suspends in prerender, resolves at request time.
- Next lists `better-sqlite3` in its default server external packages, so no config change is needed.
- DESIGN.md:587-589 (Home grid 3/2/1), :744-748 (City tile), :804-806 (placeholder); `ux-checkinn/mockups/key-home.html:93-98,158-159` (220px image, 15px gap).

## Tasks & Acceptance

**Execution:**
- [ ] `package.json` -- add `better-sqlite3`, `drizzle-orm`, dev `drizzle-kit`, `@types/better-sqlite3` (exact versions in Decisions); script `db:generate` -- data stack.
- [ ] `data/seed/hotel-booking-demo.json` -- byte-identical copy of the seed -- AD-6.
- [ ] `src/db/schema.ts`, `drizzle.config.ts`, `drizzle/` -- catalog schema and the generated, committed migration -- AD-5.
- [ ] `src/db/seed.ts` -- `seedCatalog(db, seed)` in one transaction -- AD-6.
- [ ] `src/db/client.ts` -- `getDb()`: one connection per process (`globalThis` in dev), pragmas, `CHECKINN_DB_PATH`, `mkdirSync`, migrate, seed if `hotels` is empty -- AD-12.
- [ ] `src/db/test-db.ts` -- `createTestDb()`: `:memory:`, migrated and seeded -- AD-18.
- [ ] `src/features/hotels/catalog.repo.ts` + test -- `listCityTiles(db)` and `countHotels(db)`; test file starts `// @vitest-environment node`.
- [ ] `src/features/search/queries.ts` -- `getCityTiles()`: `server-only`, `await io()`, then repo.
- [ ] `src/components/remote-image.tsx` + test -- client `<img>` with placeholder fallback; `no-img-element` disabled in this file only.
- [ ] `src/components/city-tiles.tsx` + test -- presentational grid from view models; async wrapper inside `<Suspense>` on Home.
- [ ] `src/app/page.tsx`, `page.test.tsx` -- hero per Decisions, then "Explore a city" h2 and the tiles; tokens only.
- [ ] `e2e/home.spec.ts` -- 6 tiles with count total 12; ignore seed-photo failures only; a blocked-photos test sees placeholders.
- [ ] `README.md` -- seed-to-table mapping and `CHECKINN_DB_PATH`.

**Acceptance Criteria:**
- Given a fresh clone, when `npm install && npm run dev` runs and `/` opens, then 6 City tiles show and their counts sum to 12.
- Given no DB file, when `npm run build` runs, then it succeeds and `data/checkinn.db` does not exist afterwards.

## Implementation Notes

## Plan Change Log

- **2026-10-13, review loop 1 (triage #6).** Trigger: the task list put the presentational `city-tiles.tsx` in `src/features/search/`, which breaks the architecture layer table (Presentation lives in `src/app/` and `src/components/`; features hold only repo, queries and actions). Amended: the task path is now `src/components/city-tiles.tsx` + test. Known-bad state avoided: UI components in the application layer, and features importing `src/components`. KEEP: everything else as built. The human chose a targeted file move over a full revert and re-derivation.

## Review Triage Log

Pre-review fix: `city-tiles.test.tsx:49` expected the raw seed URL, but `RemoteImage` deliberately sizes Wikimedia requests (`?width=800`, covered in `remote-image.test.tsx`). The assertion now expects `sizedPhotoUrl(url)`. E2E 32/32 with `--workers=1`; the parallel run's failures were Chromium `spawn UNKNOWN` launch errors, not app failures.

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | README "Delete the file to start again" | medium | `README.md:49`; client sets WAL, so `-wal`/`-shm` stay beside the DB and a stale WAL can replay; Windows `EBUSY` while the server holds it (AD-6). | patch |
| 2 | AGENTS.md says no database / not installed | medium | AGENTS.md "Current state" and "Agreed but not installed yet" contradict the installed data stack. | defer (agent-context file) |
| 3 | `h-[220px]` not a token | low | No 220px token in `globals.css`; value from the mockup. Developers rarely meet it, and the fix adds a new token (not a direct correction). | reject |
| 4 | Credit link white, not muted | low | `city-tiles.tsx`: `<a className="text-on-surface ...">` overrides the muted `<p>`; DESIGN.md:745-747 says muted. Direct correction. | patch |
| 5 | Tests query the DOM, not by role | low | The remaining DOM queries target `aria-hidden` content or assert that no `<img>` exists. Role queries cannot express either, so a fix needs workarounds. | reject |
| 6 | `city-tiles.tsx` presentation component in `src/features/` | medium | Architecture layer table: Presentation is `src/app/`, `src/components/`; features hold repo/queries/actions, and the graph has no features → components edge, yet `city-tiles.tsx` imports `@/components/remote-image`. The plan's task list names this path, so later stories will copy the precedent. | bad_plan: plan amended; human chose a targeted move to `src/components/` over a full revert |
| 7 | Placeholder lacks centred name | false | DESIGN.md:747-748 City tile rule: the tile keeps the placeholder *and the overlay text*; the overlay already shows the name, so a centred label would duplicate it. | reject |
| 8 | No e2e test with photos loading | low | Photos are external hosts, and e2e must not depend on external services; jsdom tests cover the `<img>` path. A fix needs locally fulfilled routes (added complexity). | reject |

## Design Notes

- Arrays (aliases, amenities, beds, room amenities, policies) are JSON text columns (`text({ mode: "json" })`). City image fields are columns on `cities`. `amenityLabels` stays in the seed file for later stories.
- `getDb()` resolves migrations from `process.cwd()/drizzle`, so nothing opens at import.
- `RemoteImage` also checks `complete && naturalWidth === 0` on mount, because the image can fail before hydration. The placeholder has `role="img"` and the seed alt, and the overlay text stays visible.
- The tiles' Suspense fallback is 6 placeholder blocks of tile size, `aria-hidden`.
- The credit sits outside the tile `<a>`, so anchors never nest.

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green; no `data/checkinn.db` after build.
- `npm run test:e2e` -- expected: all specs pass on chromium and mobile.
- `git status --short data/` -- expected: only `data/seed/hotel-booking-demo.json`.
