---
review-of: ../architecture-checkinn.md
lens: currency (were committed decisions checked against the web, the registry, the installed project or live behaviour, or asserted from memory?)
date: 2026-10-09
environment: Windows 11 x64, Node v24.21.0, npm 11.19.0, Next 16.4.0 (installed docs in node_modules/next/dist/docs)
---

# Currency review: CheckInn MVP architecture spine

## Verdict

**Pass with fixes.** Every version in the Stack table is the current `latest` on npm as of 2026-10-09, and the stack installs and runs on Node 24 on Windows without build tools. The Next 16.4 claims hold against the installed docs. Two decisions still break when run outside Next, and both were asserted rather than tried: `import "server-only"` in `src/db` (used by tsx scripts and Vitest), and the async `getAvailability` inside a synchronous `db.transaction`. The spine also misses `io()`, the Next 16.3+ API that fits `partialPrefetching` better than `connection()`.

## What was verified, and how

| Claim | Method | Result |
| --- | --- | --- |
| better-sqlite3 13.0.3 is latest | `npm view` | Yes. `engines.node >=22`. Published 2026-08 |
| Prebuilt binaries on Windows / Node 24 | `npm pack`, inspected the tarball, loaded it | v13 ships N-API prebuilds inside the package (`prebuilds/win32-x64.node`, plus arm64, linux, musl and darwin). It has no `prebuild-install` dependency. Loaded on Node 24.21 and returned SQLite 3.53.4 |
| drizzle-orm 0.45.4 is latest | `npm view` | Yes (`latest`, published 2026-10-08). Peer `better-sqlite3 >=7` |
| drizzle-kit 0.31.11 is latest | `npm view`, `drizzle-kit --version`, ran `generate` | Yes. `generate` produced SQL from a TS schema |
| @types/better-sqlite3 9.6.0 is latest | `npm view` time | Yes (2026-08-01). It supersedes 7.6.13 |
| tsx 4.23.15 is latest | `npm view` | Yes. `engines.node >=18`. Also a transitive dependency of drizzle-kit (`^4.21.0`) |
| Import paths `drizzle-orm/better-sqlite3` and `drizzle-orm/better-sqlite3/migrator` | Package `exports` and a runtime script | Both exist. `migrate()` with WAL and `foreign_keys = ON`, a sync `db.transaction`, insert and select all worked against 13.0.3 |
| better-sqlite3 is in Next's built-in server external packages | `node_modules/next/dist/lib/server-external-packages.jsonc:33` and the `serverExternalPackages` doc | Yes. No `next.config.ts` change needed |
| `connection()` from `next/server` keeps sync DB reads out of the prerender | `03-api-reference/04-functions/connection.md` and `08-caching.md:416` | Yes. Both docs name better-sqlite3. See F3 for the newer `io()` |
| `redirect()` in server actions | `redirect.md` | Supported. It throws `NEXT_REDIRECT`, so call it outside `try` (see F5) |
| `error.tsx` | `03-file-conventions/error.md` | Exists. It must be a Client Component. `retry` prop stable since 16.3 |
| `server-only` | Next docs, npm, runtime | Optional inside Next because Next handles it internally. It is not installed. Outside Next it breaks (F1) |
| `node:sqlite` | Loaded on Node 24.21 | Loads with no experimental warning. Next docs name it next to better-sqlite3. drizzle-orm 0.45.4 has no `node:sqlite` driver, so better-sqlite3 remains the right pairing with Drizzle. Note only: the user chose better-sqlite3 |
| `next start -H 0.0.0.0` | `06-cli/next.md:71,123` | Valid flag, but `0.0.0.0` is already the default. Harmless and redundant |
| Native TS instead of tsx | `node s/a.ts` on 24.21 | Not viable. Type stripping is on, but Node does not resolve `@/` tsconfig paths and needs ESM or `.mts`. tsx resolved `@/` correctly. Keep tsx |
| `no-img-element` severity | `@next/eslint-plugin-next/dist/index.js:87,103` | `warn` in `recommended`, and not raised to error by `core-web-vitals`. `npm run lint` (`eslint`, no `--max-warnings`) does not fail on it. The per-file disable is hygiene, not a gate |

## Findings

- **[high] AD-1 `import "server-only"` in every `src/db` file (AD-1; AD-6 `db:reset`; Conventions "Tests")**. I checked this at runtime. `server-only` is not installed. Outside Next, `import "server-only"` throws `ERR_MODULE_NOT_FOUND`. With the npm package installed, its `default` export condition throws "This module cannot be imported from a Client Component module". Only the `react-server` condition maps to `empty.js`. So `scripts/db-reset.ts` under tsx and the Vitest query and action tests against `:memory:` both crash as soon as they import `src/db/client.ts`. *Fix*: add `server-only` as a dependency (ask first), and say how non-Next runners resolve it. Run scripts with `tsx --conditions=react-server` (verified: it resolves to `empty.js`). In `vitest.config.ts`, alias `server-only` to an empty module. Alternatively, keep `seed.ts` and the migrate code free of `server-only`, with only `client.ts`, `queries.ts` and `actions.ts` guarded.

- **[high] AD-3 and the sequence diagram: `getAvailability` inside `db.transaction` (AD-2, AD-3, AD-4)**. AD-2 makes every `queries.ts` export `async`, with `await connection()` first. AD-3 and the diagram call `getAvailability` inside the synchronous better-sqlite3 transaction. I confirmed that drizzle-orm 0.45.4 on better-sqlite3 13.0.3 throws "Transaction function cannot return a promise" for an async callback. *Fix*: split it. Put a synchronous `computeAvailability(tx, …)` in the data or feature layer with no `connection()` call, and use it inside the transaction. Have the `getAvailability` query wrap it after `await connection()`. Update AD-4's "one query feeds both" wording to match.

- **[medium] AD-2 picks `connection()` without considering `io()` (AD-2)**. Next 16.3 added `io()` from `next/cache`. The installed `connection.md` says that with Cache Components you should "prefer `io()`". `io.md` explains that `connection()` stays suspended until a full navigation reaches the server and "blocks prefetches". This app has `partialPrefetching` on. Both APIs keep sync DB reads out of the static shell. The choice changes prefetch behaviour on `/search` and hotel links. *Fix*: record the choice explicitly. Use `io()` for catalog and search reads. Keep `connection()` only where availability must never come from a client prefetch, if that is the intent. Either way, cite the 16.3 docs. Both resolve immediately outside a request, so Vitest is unaffected.

- **[medium] AD-9 "now" and AD-10 UUID under `cacheComponents` (AD-9, AD-10)**. `io.md` lists `new Date()` and `crypto.randomUUID()` as reads that need `await io()` (or a request-time API before them) under Cache Components. AD-2 only guards DB reads. Server-rendered criteria defaults ("tomorrow") on a page that hasn't awaited `searchParams`, such as Home's search bar, and the server-generated `idempotencyKey` would fail the build or freeze into the static shell. *Fix*: add a rule that `clock.ts` callers in server components, and the idempotency key generation, sit after `await searchParams`, `io()` or `connection()`, inside `<Suspense>`. Or generate the key in the client form component.

- **[low] Other small claims and gaps**.
  - **AD-3 / AD-11 `redirect()`**: valid, but it throws. It must run after the transaction returns and outside any `try`. Inside the `db.transaction` callback it would roll back the insert. AD-11's `{ ok: true }` success branch is also never returned on the redirect path. *Fix*: state "redirect after commit, outside try".
  - **AD-13 list omits `error.tsx`**: an error boundary must be `"use client"`. *Fix*: add `error.tsx` (and `global-error.tsx` if used).
  - **Stack `[ASSUMPTION]` tags**: drizzle-orm 0.45.4, drizzle-kit 0.31.11 and tsx 4.23.15 are now confirmed `latest`. drizzle-orm also has `1.0.0-rc.4` and `beta` tags with a new major on the way. *Fix*: drop the tags, pin exact versions, and note "Drizzle 1.0 RC exists; stay on 0.45.x for MVP".
  - **npm 11.19 install-script gating**: a fresh `npm install` lists better-sqlite3 (implicit `node-gyp rebuild`) and esbuild as unapproved install scripts. The stack works with them blocked, which I verified: the prebuild loads and drizzle-kit and tsx run. Approving better-sqlite3's would run node-gyp, which needs Python and Visual Studio on Windows. *Fix*: note "do not approve better-sqlite3 install script; prebuild is bundled".
  - **`-H 0.0.0.0`**: this is the default. Keep it for clarity or drop it.
  - **`no-img-element`**: severity is `warn`, so lint passes either way. The disable comment is fine.
  - **Vitest**: the default `environment: "jsdom"` applies. *Fix*: tag DB tests with `// @vitest-environment node`.

## Not checked

- The Playwright and CI behaviour with a temporary `CHECKINN_DB_PATH`. CI was not run.
- Turbopack bundling of better-sqlite3 in `next build`. This is expected to work because the package is on the built-in externals list, but no build was run with the dependency installed.
