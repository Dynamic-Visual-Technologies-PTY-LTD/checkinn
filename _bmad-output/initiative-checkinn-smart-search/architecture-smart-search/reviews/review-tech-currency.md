---
review: tech-currency
target: ../architecture-smart-search.md
reviewed: 2026-10-19
lens: "Was every committed decision web-researched or reality-checked rather than asserted from training data: current versions, that each named technology still exists and fits, and the live defaults it leans on?"
verdict: PASS WITH FIXES
---

# Tech-currency review: Smart search architecture spine

## Verdict

**Pass with fixes.** Every named technology exists, is current and fits. The version pins match the registry and the installed tree. The memlog's recorded checks hold up, and I re-ran them. The one open "assumed" item (embeddings on the Foundry v1 API) is now confirmed against the published v1 OpenAPI spec.

Two live-default problems need fixing in the spine before build:

- The reasoning-effort default of `gpt-6-luna` puts the 2.5 s interpretation budget at risk.
- The way SDK 7.28.0 assembles Responses text is a problem for a reasoning model's output.

Three smaller corrections make rules match observed behaviour: the reset hazard, React `cache` keys, and abort-error mapping.

## How I checked

- **npm registry:** `npm view` for `openai` and `sqlite-vec`.
- **SDK source:** the `openai@7.28.0` and `@7.39.0` tarballs, unpacked into the scratchpad (nothing installed into the repo). I read their `.d.ts`, `client.js`, `lib/ResponsesParser.js` and `CHANGELOG.md`.
- **Azure v1 API:** the Azure v1 OpenAPI spec (`azure-rest-api-specs/.../OpenAI.v1/azure-v1-v1-generated.json`), downloaded and inspected.
- **Microsoft Learn:**
  - v1 API lifecycle page (updated 2026-06-05)
  - Models sold by Azure (updated 2026-10-08)
  - Reasoning models (updated 2026-09-29)
  - Model retirement schedule (updated 2026-09-23)
- **Other web sources:** the OpenAI embeddings FAQ, react.dev `cache`, and the Node v24 `process.md` docs.
- **Local Node 24.21.0 experiments:**
  - Against the repo's installed `better-sqlite3` 13.0.3 and `drizzle-orm` 0.45.4: an FTS5 table, `bm25()`, `PRAGMA table_list`, a Drizzle migrator applying a hand-written `CREATE VIRTUAL TABLE`, and the current reset pattern run against FTS shadow tables.
  - `drizzle-kit generate --custom`, writing to a scratch copy of `drizzle/`. The repo tree was unchanged afterwards.
  - `process.loadEnvFile` semantics.
- **Repo files:** `node_modules/next/dist/docs/` (`io.md`, `connection.md`, `environment-variables.md`, `optimizing-prefetching.md`, `adopting-partial-prefetching.md`), the Playwright runner source, `playwright.config.ts`, `.github/workflows/ci.yml`, `.gitignore` and `src/db/reset.ts`.

## Verification ledger

| Spine claim | Checked against | Result |
| --- | --- | --- |
| `openai` 7.28.0 exists; a sensible pin | npm `time` | Confirmed. Published 2026-10-04, 15 days old. It is the newest release at least 14 days old: `7.29.0` is in the changelog but was never published to npm (404), and `7.30.0` is from 2026-10-06. Latest is 7.39.0 (2026-10-19). Not deprecated. `engines: node >=22`, and all 6 peers are optional. |
| SDK supports `responses.create` with `text.format` json_schema `strict`, `store`, `instructions`, reasoning | 7.28.0 `responses.d.ts`, `shared.d.ts` | Confirmed. `ResponseFormatTextJSONSchemaConfig { name, schema, strict }`, `store?: boolean`, `instructions`, `max_output_tokens`. `ReasoningEffort` includes `'none' … 'max'`, and `reasoning.mode` (`standard`/`pro`) is present. |
| `embeddings.create` with `dimensions` | 7.28.0 `embeddings.d.ts` | Confirmed (`dimensions?: number`). Floats are returned, with no base64 default in this version. |
| `maxRetries: 0`, AbortSignal | 7.28.0 `client.d.ts`, `request-options.d.ts` | Confirmed. `maxRetries` defaults to 2; per-request `signal` is supported. See F-5 for the error class an abort raises. |
| `new OpenAI({ baseURL: …/openai/v1/, apiKey })`, no api-version | Learn v1 page; v1 OpenAPI spec | Confirmed. The spec's `api-version` query parameter is optional and defaults to `v1`. Auth is `api-key` or `authorization`; the SDK sends `Authorization: Bearer <key>`, which the spec accepts. The `*.services.ai.azure.com/openai/v1/` host also works. |
| Embeddings on the v1 API (memlog: "assumed from spec, confirm in pre-flight") | v1 OpenAPI spec | **Now confirmed.** `POST /embeddings` exists with `input, model, encoding_format, dimensions, user`, and `dimensions` is "only supported in text-embedding-3 and later". Pre-flight still proves the deployment. |
| Responses API on v1 | v1 OpenAPI spec | Confirmed. `/responses`. The request has `text.format` (json_schema, `strict`), `store` (**defaults to true** on Azure, so the spine's `store: false` is needed), `reasoning`, `instructions`, `max_output_tokens`. |
| `text-embedding-3-large` at 1024 dims, unit-normalised | Learn models page and retirement schedule; OpenAI embeddings FAQ | Confirmed. GA, retirement 2028-02-09, native 3072 dims. The OpenAI FAQ says outputs are L2-normalised "including after shortening with the dimensions parameter". Normalising on load (the spine's convention) is still the right safeguard for the Azure deployment. |
| `gpt-6-luna` | Learn "Models sold by Azure", "Reasoning models", Azure blog, Foundry catalog | **Exists.** Version 2026-09-22, GA. It is a reasoning model with Responses, structured outputs, reasoning effort (including `none`), verbosity and temperature, and needs no access request. It is not in the 2026-09-23 retirement table yet, which is expected for a model that new. See F-1 and F-6. |
| SQLite 3.53.4 with FTS5 in better-sqlite3 13.0.3 | Local `sqlite_version()`, `pragma_compile_options` | Confirmed. `ENABLE_FTS5`. `tokenize='porter unicode61'` works, including porter stemming (`pools` matches `pool`) and diacritic folding (`cafe` matches `café`). `bm25()` returns negative scores, best first, so the spine is right to negate them. |
| `PRAGMA table_list` reports `shadow` | Local | Confirmed. The FTS table is `virtual`, and the five `_data/_idx/_config/_docsize/_content` tables are `shadow`. See F-3 for what the spine gets wrong about the hazard. |
| `drizzle-kit generate --custom` (0.31.11) | Local, writing to a scratch copy of `drizzle/` | Confirmed. It writes an empty `0002_<name>.sql` plus a journal entry. The snapshot is not changed, so later `db:generate` runs never try to drop the FTS table. |
| Drizzle migrator applies a hand-written FTS5 `CREATE VIRTUAL TABLE` | Local `migrate()` from `drizzle-orm/better-sqlite3/migrator` | Confirmed. It works inside the migrator's transaction, using `--> statement-breakpoint`. |
| FTS `MATCH` built by quoting tokens and joining with `OR` | Local | Confirmed safe. `"it""s"`, `"AND"`, `"NEAR"`, `"a*b"`, `"x:y"` and `"wi-fi"` all parse as phrases, and an empty `""` phrase is harmless. |
| Node 24 `process.loadEnvFile` | Node v24 docs; local test | Confirmed. Added in v21.7.0/v20.12.0 and **stable since v24.10.0** (on earlier 24.x it prints an experimental warning; `.nvmrc` says `24`). It does **not** overwrite variables that are already set, and it throws `ENOENT` when the file is missing, so the spine's "when the file exists" check is needed. |
| Next 16 runtime env reads after `io()` / `connection()` | `io.md`, `connection.md`, `environment-variables.md` (Next 16.4.0) | Confirmed. `io()` was added in v16.3.0 and the docs prefer it to `connection()`. `io()` is a no-op inside `"use cache"` scopes, so the spine's "no `use cache` on Provider paths" rule is what makes `io()` safe. "Uncached work is already left out of prefetches", so `partialPrefetching` will not trigger Provider calls. |
| `.env.local` vs explicit env in e2e | `environment-variables.md` load order | Confirmed. `process.env` wins over `.env.local`. The 3100 server's explicit `CHECKINN_PROVIDER=off` beats a developer's `.env.local`, as long as `config.ts` checks `off` before it looks at the Azure variables (the spine says it does). |
| React `cache` for per-request dedupe | react.dev `cache` | Confirmed for Server Components, invalidated per request. Arguments are compared with `Object.is`, and calls outside a component render bypass the cache. See F-4. |
| `AbortSignal.timeout` | Node 24.21.0 | Confirmed (`AbortSignal.any` is also available). |
| `sqlite-vec` pre-v1 | npm | Confirmed. `latest` is 0.1.9, `alpha` is 0.1.10-alpha.4. It is not used, which is correct. |
| E2E: two servers from one build, no CI change | Playwright runner source; `playwright.config.ts`; `ci.yml` | Feasible. Plugin setup tasks run in order, so server 1 can `build && start` and server 2 only `start`. The CI `e2e` job already runs `npm run build` then `npm run test:e2e`. |
| `.env.local` gitignored, `.env.example` committed | `.gitignore` | Already true (`.env*`, `!.env.example`). `.eval-results/` is **not** ignored yet, so the build must add it. |

## Findings

### F-1 (Medium): Reasoning effort is deferred, but the 2.5 s budget depends on it

`gpt-6-luna` is a reasoning model. Learn documents reasoning effort for it, including `none`. Learn also says GPT-5.6-generation models default to `medium`, and it gives no lower default for the GPT-6 family. The spine fixes a 2.5 s interpretation timeout (AD-22) and a 5 s reasons timeout (AD-27), but it defers "any reasoning-effort setting" (Deferred). At a medium default, many Queries could time out into the fallback on stage, and nobody would see why. A related point: reasoning tokens count against `max_output_tokens`. A capped response comes back with `status: "incomplete"` and truncated JSON.

**Fix:**

- Commit a starting value in AD-22 and AD-27: `reasoning: { effort: "none" }`, or `"low"` if quality needs it, plus an explicit `max_output_tokens`.
- Treat `status !== "completed"` as `INVALID_OUTPUT`.
- Have `search:preflight` time `interpret` (p50/p95 over a few calls) and fail when p95 exceeds 2.5 s.
- Keep only the exact value as a tuning item.

### F-2 (Medium): SDK 7.28.0 `output_text` and `responses.parse` include non-final message phases

7.28.0 types output messages with `phase?: 'commentary' | 'final_answer'`. In both 7.28.0 and 7.39.0, `addOutputText` concatenates **every** `output_text` part across all message items. In 7.28.0, `responses.parse`/`output_parsed` also parses commentary-phase messages; this was fixed in 7.30.1 ("parse structured text only in final message phases"), but 7.30.1 is only 11 days old, too new under the two-week rule. If `gpt-6-luna` emits a preamble message, `JSON.parse(response.output_text)` fails and the guest drops into the fallback.

**Fix:** in AD-19, rule that `azure.ts` does the following:

- reads the last `type: "message"` item whose `phase` is `null` or `"final_answer"`
- `JSON.parse`s its `output_text` content
- does not use `responses.parse` or `output_parsed` at 7.28.0

The domain validators are unchanged. Re-evaluate if the pin moves to 7.30.1 or later.

### F-3 (Low–Medium): The reset hazard is real but described wrongly; the `table_list` rule needs its filters

`better-sqlite3` turns on `SQLITE_DBCONFIG_DEFENSIVE` (`src/objects/database.cpp:172`). Locally, `DELETE FROM search_chunks_fts_data` throws `table search_chunks_fts_data may not be modified`, so it does not silently corrupt the index. The real impact: today's `resetDb`, which lists `sqlite_master WHERE type='table'`, would see the FTS table *and* all five shadow tables, because `sqlite_master` labels them all `table`. The reset transaction would then roll back, and every `db:reset` and e2e global setup would fail.

`PRAGMA table_list` also returns `sqlite_schema`, plus `sqlite_temp_schema` for the `temp` schema. Locally, a reset that deletes `type IN ('table','virtual')` in `main`, excluding `sqlite_%` and `__drizzle_migrations`, passes FTS5 `integrity-check`.

**Fix:**

- Correct the AD-24 wording ("deleting from shadow tables fails under better-sqlite3's defensive mode and would corrupt the index if it did not").
- State the full filter: `schema = 'main'`, `type IN ('table','virtual')`, name not `sqlite_%`, not `__drizzle_migrations`.
- Name a `reset.test.ts` case with the FTS table present.

### F-4 (Low): React `cache` keys by reference; `getMatchReasons(preferences, hotelIds)` takes an array

react.dev says non-primitive arguments hit only by the same reference (`Object.is`). If each card builds or slices its own `hotelIds`, there is one Provider call per card, which breaks AD-27's "one call per set".

**Fix:** in AD-20, key the cached function by primitives, for example `getMatchReasons(preferences, hotelIds.join(","))`, or require one array reference passed down from the list.

### F-5 (Low): Abort surfaces as `APIUserAbortError`, not a timeout error

In 7.28.0, a caller-supplied `signal` that aborts raises `APIUserAbortError`. Only the SDK's own `timeout` option raises `APIConnectionTimeoutError`. Mapping by error class alone would report Provider timeouts as something other than `TIMEOUT`.

**Fix:** in AD-19, `azure.ts` maps `APIUserAbortError` to `TIMEOUT` when `signal.reason?.name === "TimeoutError"`. The alternative is to pass the SDK's per-request `timeout` with the same values. For the `fetch` fallback, send the key as `api-key` (spec `ApiKeyAuth`) or `Authorization: Bearer`; both are accepted.

### F-6 (Low): Pin down `gpt-6-luna` beyond the name

The deployment exists, but the spine records no model version and no deployment-type assumption. Learn notes that GPT-6 models "may require quota requests depending on quota tier" (Tier 5/6 get quota by default). Standard deployments are Global Standard or Data Zone, across all 28 Global regions.

**Fix:**

- Record `gpt-6-luna (2026-09-22)` and "Global Standard" in the Stack table.
- Add a quota/deployment check to the pre-flight item in PRD §7.
- Answer memlog question 38 at doc level (strict json_schema: yes; reasoning effort: yes, including `none`), and leave the 2.5 s latency check to pre-flight (F-1).
- The user still has to confirm the exact deployment names (memlog question 35).

### F-7 (Info): Migration file naming

The Structural Seed shows one `drizzle/000N_search_index.sql`. In practice, `search_chunks` and `search_chunk_vectors` come from `schema.ts` through a normal `drizzle-kit generate`, and the FTS table comes from a separate `--custom` file. That makes two migrations. **Fix:** show two files, for example `000N_search_index.sql` and `000N+1_search_fts.sql`.

### F-8 (Info): FTS5 IDF floor on a small corpus

FTS5 clamps IDF at about 1e-6 for terms in more than half the rows. Locally, `pool` in 2 of 3 rows scored -8.7e-7. Over about 150 chunks, words like "room" or "hotel" will add almost nothing to `exact`. That is good behaviour, but it affects how `BM25_K` is tuned. **Fix:** none required. Mention it next to `BM25_K` in Deferred tuning.

## Not flagged (verified current and fitting)

`better-sqlite3` 13.0.3, `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, `next` 16.4.0, `react` 19.3.0 and Node 24.21.0 match `package.json` and the installed tree. The decision not to use `sqlite-vec` holds. So does excluding `@azure/openai` and `@azure/identity`: the Learn v1 page uses the plain `OpenAI` client for key auth. Requiring `store: false` is correct, since it defaults to true on Azure. Using no `"use cache"` on Provider paths is correct under Next 16's `io()` semantics.

## Sources

- [npm: openai](https://www.npmjs.com/package/openai) (versions and `time` via `npm view`)
- [npm: sqlite-vec](https://www.npmjs.com/package/sqlite-vec)
- [openai-node CHANGELOG 7.28.0 to 7.39.0](https://github.com/openai/openai-node/blob/master/CHANGELOG.md)
- [Azure OpenAI v1 API (Learn)](https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle)
- [Azure v1 OpenAPI spec](https://github.com/Azure/azure-rest-api-specs/blob/main/specification/ai/data-plane/OpenAI.v1/azure-v1-v1-generated.json)
- [Foundry Models sold by Azure (Learn)](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure)
- [Azure OpenAI reasoning models (Learn)](https://learn.microsoft.com/en-us/azure/foundry/openai/how-to/reasoning)
- [Model retirement schedule (Learn)](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule)
- [Foundry Models lifecycle (Learn)](https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirements)
- [GPT-6 Astra, Sol and Luna in Microsoft Foundry (Azure blog)](https://azure.microsoft.com/en-us/blog/gpt-6-astra-sol-and-luna-for-production-agents-in-microsoft-foundry/)
- [Foundry catalog: gpt-6-luna](https://ai.azure.com/catalog/models/gpt-6-luna)
- [OpenAI embeddings FAQ](https://help-lb.openai.com/en/articles/6824809-embeddings-faq)
- [React `cache`](https://react.dev/reference/react/cache)
- [Node v24 `process.loadEnvFile`](https://nodejs.org/docs/latest-v24.x/api/process.html#processloadenvfilepath)
- Local: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md`, `connection.md`, `01-app/02-guides/environment-variables.md`, `optimizing-prefetching.md`; `node_modules/better-sqlite3/src/objects/database.cpp`; `node_modules/playwright/lib/runner/index.js`
