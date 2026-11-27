---
title: 'Azure Provider adapter and pre-flight'
type: 'feature'
ticket: '2'
created: '2026-10-20'
status: 'built'
baseline_revision: 'b6fbc71f4e748993c7ea86779a3806591f03df7d'
route: 'full'
route_source: 'auto'
risk: 'high'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md'
  - '{project-root}/AGENTS.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** Smart search can only run on the fake Provider. Nothing talks to the approved Azure AI Foundry deployments (`gpt-6-luna`, `text-embedding-3-large`), so the presenter cannot check them before going on stage.

**Approach:** Add the `openai` SDK at 7.28.0 (approved) and `provider/azure.ts`, which implements all four port methods against the Foundry v1 endpoint as AD-19 sets out. Then add:
- the Azure branch of `getProvider`
- the import guard
- `toUnitVector` with a 1024-dimension check
- `.env` loading for scripts
- the Azure variable names in `.env.example`
- `npm run search:preflight` (AD-32)

## Boundaries & Constraints

**Always:**
- AD-19, AD-25, AD-29 and AD-32 exactly:
  - Responses API only, never chat completions (user decision), with strict `json_schema` output.
  - `store: false` and `maxRetries: 0`; no tools.
  - `reasoning: { effort: "none" }` and an explicit `max_output_tokens` on every Responses call.
  - Parse JSON only from the final output message (`phase` null or `final_answer`), never from `output_text` or `responses.parse`. A `status` other than `completed` is `INVALID_OUTPUT`.
  - `embed` sends `dimensions: 1024`.
- Guest text (Query, Preferences) goes only in `input`, never in `instructions`.
- `provider/azure.ts` is the only importer of `openai`.
- Logs and pre-flight output carry codes, statuses and deployment names only, never the key, the Query or the Preferences.
- The port in `provider/types.ts` keeps its shape (story 1.1 handoff).
- `npm test` makes no network call.

**Never:**
- Chat completions or `responses.parse`.
- Retries, or reading `output_text`.
- The Prepared index model check (2.3).
- Wiring `embed`, `reasons` or `judge` into the app (2.x).
- Prompt tuning beyond a clear first version.
- Changes to `.github/workflows` or `next.config.ts`.
- Committing any `.env` file or key.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Interpret OK | Stub returns `status: completed` and a final message with valid JSON | Parsed `Interpretation` | — |
| Commentary first | Output holds a `phase: commentary` message, then a `final_answer` message | Only the final message is parsed | — |
| No final message, or bad JSON | Only commentary, or text that is not JSON | — | `ProviderError("INVALID_OUTPUT")` |
| Incomplete | `status: incomplete` (e.g. hit `max_output_tokens`) | — | `INVALID_OUTPUT` |
| Timeout | Caller's `AbortSignal.timeout` fires, so the SDK throws `APIUserAbortError` with `signal.reason.name === "TimeoutError"` | — | `TIMEOUT` |
| Rate limit | SDK `RateLimitError` / 429 | — | `RATE_LIMITED`, with `status` 429 |
| Other API failure | 401, 403, 404, 5xx, or a connection error | — | `UNAVAILABLE`, with `status` when known |
| Embed OK | 1024-length vectors | Unit-length vectors, in input order | — |
| Embed wrong size | Any vector whose length is not 1024 | — | `INVALID_OUTPUT` |
| Config | `CHECKINN_PROVIDER` unset or `azure`, with all four Azure variables | Azure provider, one per process | — |
| Config partial | Any Azure variable missing, or `CHECKINN_PROVIDER=off` | `null` (MVP) | — |
| Import guard | A file outside `src/features/search` imports `provider/`, or a file other than `azure.ts` imports `openai` | Test fails, naming the file | — |
| Pre-flight | Keyed environment | Prints both deployment names and OK, or the failing check. Exits non-zero on failure | A quota or rate-limit error is reported as such |

</intent-contract>

## Code Map

**Existing, from story 1.1**
- `src/features/search/provider/types.ts`: the port. Keep its shapes:
  - `interpret(query, context, signal): Promise<Interpretation>`
  - `embed(texts, signal): Promise<number[][]>`
  - `reasons(ReasonsInput, signal): Promise<ReasonOutput[]>`
  - `judge(JudgeInput, signal): Promise<JudgeVerdict>`
  - `ProviderError(code, { status, cause })`
- `src/features/search/provider/config.ts`: `getProvider(env = process.env)` and the `globalThis.__checkinnProvider` state. The Azure branch currently returns null; replace it, keeping off and fake as they are. `config.test.ts` asserts Azure gives null, so update that test.
- `src/features/search/provider/fake.ts`: the reference adapter shape.
- `src/domain/interpretation.ts`: the `Interpretation` type with every AD-22 field. The strict schema must list exactly these fields; each is nullable and every one is required, as strict mode demands.
- `src/features/search/actions.ts`: already maps `TimeoutError`/`AbortError`. No change.

**Domain and data**
- `src/domain/relevance.ts`: new. `toUnitVector(values: ArrayLike<number>): Float32Array`. Throw on an all-zero vector, which the adapter maps to `INVALID_OUTPUT`.
- `data/seed/hotel-booking-demo.json` via `loadSeed()` in `src/db/seed.ts`: the pre-flight's City list, so the pre-flight needs no database.

**Scripts and config**
- `scripts/db-reset.ts` and `package.json` scripts (`"db:reset": "tsx scripts/db-reset.ts"`): the script pattern. Add `"search:preflight": "tsx scripts/search-preflight.ts"`.
- `.env.example`: now has `CHECKINN_PROVIDER=`. Add the four AD-29 Azure names and `CHECKINN_SEARCH_DEBUG`, with no values.
- The SDK: after `npm install openai@7.28.0 --save-exact`, read `node_modules/openai` for:
  - the `OpenAI` client options (`baseURL`, `apiKey`, `maxRetries`)
  - `responses.create` request and response types (`output` items, `phase`, `status`, `text.format`)
  - `embeddings.create` with `dimensions`
  - the error classes: `APIUserAbortError`, `RateLimitError`, `APIError.status`, `APIConnectionError`

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- `npm install openai@7.28.0 --save-exact` -- approved dependency (AD-25)
- [x] `src/domain/relevance.ts` + test -- `toUnitVector` -- AD-26 vectors
- [x] `src/features/search/provider/azure.ts` + `azure.test.ts`
  - `createAzureProvider({ baseURL, apiKey, chatDeployment, embeddingDeployment }, client?)`.
  - `client` defaults to `new OpenAI({ baseURL, apiKey, maxRetries: 0 })`. Tests inject a stub with `responses.create` and `embeddings.create`.
  - All four methods, the `finalJson(response)` parser, `mapError(error)`, and the strict schemas: interpretation, reasons `{ reasons: [{ hotelId, reason, citedChunkIds }] }`, judge `{ grounded, explanation }`.
  - Interpretation instructions: today, the Cities with aliases, the nickname map, and the field rules. Guest text goes only in `input`.
  - `max_output_tokens` starts at interpret 600, reasons 1500, judge 300.
  - Pass `{ signal }` on every call.
  - Covers every adapter row in the matrix.
- [x] `src/features/search/provider/config.ts` + test
  - The Azure branch: `CHECKINN_PROVIDER` unset or `azure`, with all four variables, gives one cached Azure provider.
  - Partial or off gives null.
- [x] `src/features/search/provider/imports.test.ts` -- scans `src/**/*.{ts,tsx}`; fails on a `provider/` import outside `src/features/search`, or an `openai` import outside `provider/azure.ts` -- AD-19 guard
- [x] `scripts/load-env.ts` -- loads `.env` then `.env.local` with `process.loadEnvFile` when each exists -- AD-29 script loading
- [x] `scripts/search-preflight.ts`, `package.json` script
  - Loads env, builds the Azure provider from env, and exits 1 with the missing variable names if it is not fully configured.
  - Calls `interpret` 5 times with a fixed sample Query and the seed Cities, each with a 2.5 s `AbortSignal.timeout`, and reports p95 against 2.5 s.
  - Calls `embed` once and checks 1024 dimensions.
  - Calls `reasons` once with a fixed sample Hotel and chunk.
  - Prints both deployment names, then OK or the failing check. A `RATE_LIMITED` failure is printed as a quota or rate limit.
  - Exits non-zero on any failure. Never prints the key.
- [x] `.env.example` -- Azure variable names and `CHECKINN_SEARCH_DEBUG`, no values -- AD-29

**Acceptance Criteria:**
- Given `npm test` with no `.env`, when it runs, then every adapter behaviour is proven against a stubbed client and no network call is made.
- Given the four Azure variables in `.env.local` and no `CHECKINN_PROVIDER`, when the app renders Home, then the Smart search box is present. Given one variable is missing, the box is absent.
- Given the presenter's key in `.env.local`, when they run `npm run search:preflight`, then it prints both deployment names and OK, with interpretation p95 under 2.5 s, and exits 0. This is a human step (hitl).
- Given a source file outside `src/features/search` that imports `provider/`, when `npm test` runs, then the import guard fails and names that file.

## Implementation Notes

- **SDK install.** The implementing agent's `npm install openai@7.28.0 --save-exact` was denied by the auto-mode permission classifier, so the user ran it.
  - That install also changed `drizzle-kit` to `^0.18.1` and `eslint-config-next` to `^14.2.35`, and moved several unrelated packages in the lockfile.
  - Both pins were restored to their baseline values, and `package-lock.json` was rebuilt from the baseline, so it changes only for `openai`.
- **Error classes for tests.** `azure.ts` re-exports the SDK error classes so `azure.test.ts` can build real SDK errors while the import guard keeps every other file off `openai`.
- **`createAzureClient`** is exported so the default client's `maxRetries: 0`, `baseURL` and `apiKey` are tested.
- **`load-env` order.** `.env.local` loads before `.env`, so it wins, as in Next: `process.loadEnvFile` never overwrites a variable that is already set. The plan's ".env then .env.local" wording is the order of precedence, not of loading.
- **Vitest scripts tests.** `vitest.config.mts` now also includes `scripts/**/*.test.ts`, for `scripts/load-env.test.ts`. The Vitest config is not on the AGENTS.md ask-first list.
- **Pre-flight timeouts.** The embed timeout (1.5 s) and the reasons timeout (5 s) come from the architecture's Consistency Conventions.

## Plan Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 5 findings — high 0, medium 3, low 2, false 0, maybe-false 0
- findings:
  - `[medium]` `[patch]` `load-env` loaded `.env` first, so `.env` beat `.env.local` (the reviewer checked this on Node 24), the opposite of Next. Fixed: `.env.local` loads first; `scripts/load-env.test.ts` covers the precedence.
  - `[medium]` `[patch]` The lockfile carried unrelated upgrades from the user's install: `typescript-eslint` 8.72, `zod` 4.6.7, `browserslist` and others. AGENTS.md makes dependency changes ask-first. Fixed: `package-lock.json` restored to the baseline and reinstalled, so the diff is now only the `openai` entry (42 lines).
  - `[low]` `[patch]` Nothing tested that the default client keeps `maxRetries: 0`. Fixed: `createAzureClient` is exported and tested for `maxRetries`, `baseURL` and `apiKey`.
  - `[medium]` `[patch]` `embed` accepted duplicate or missing indexes, which misaligns vectors with their inputs. Fixed: it now requires `data[i].index === i`, with tests for `[0,0]` and `[0,2]`.
  - `[low]` `[patch]` The judge test barely checked its request body. Fixed: it now asserts the model, `reasoning`, the strict `json_schema` and that there are no `tools`.

## Design Notes

**Final-message parsing.** At 7.28.0, `output_text` and `responses.parse` can include commentary text. So `finalJson` walks `response.output` for `type: "message"` items with `phase` null or `final_answer`, takes the last such message's `output_text` content, and `JSON.parse`s it. Anything else is `INVALID_OUTPUT`.

**Strict JSON schema.** Every property is listed in `required`, nullable through `type: ["string", "null"]` and similar, with `additionalProperties: false`.

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` -- expected: all green
- `npm run test:e2e` -- expected: green, unchanged (no `.env` in e2e)

**Manual checks (if no CLI):**
- With the presenter's key in `.env.local`, `npm run search:preflight` prints both deployment names and OK, with p95 under 2.5 s. This is a human step: no key is present on this machine.

## Auto Run Result

**Summary.** The Azure AI Foundry Provider adapter is in place behind the existing port, with `openai` 7.28.0 pinned exactly and approved.
- With all four Azure variables set and `CHECKINN_PROVIDER` unset or `azure`, `getProvider()` returns one cached Azure provider, so the Smart search box appears.
- `npm run search:preflight` checks the live deployments. It is not yet run with a key; that is the presenter's step.

**Files changed**
- `package.json`, `package-lock.json`: `openai` 7.28.0 and the `search:preflight` script.
- `src/features/search/provider/azure.ts` and its test:
  - all four methods
  - strict schemas
  - `finalJson`
  - `mapError`
  - `createAzureClient`
  - 1024-dimension unit vectors in input order
- `src/features/search/provider/config.ts` and its test: the Azure branch, `AZURE_VARIABLES`, `missingAzureVariables` and `azureConfig`.
- `src/features/search/provider/imports.test.ts`: the AD-19 import guard.
- `src/domain/relevance.ts` and its test: `toUnitVector`.
- `scripts/load-env.ts` and its test: Next's `.env` precedence for scripts.
- `scripts/search-preflight.ts`: the pre-flight.
- `.env.example`: the Azure variable names and `CHECKINN_SEARCH_DEBUG`, with no values.
- `vitest.config.mts`: includes `scripts/**/*.test.ts`.

**Review findings breakdown**
- 5 patches applied: 3 medium, 2 low.
- 0 deferred.
- 0 rejected.

**Follow-up review recommended:** true. Three medium entries were patched. The named risk is unverified against the live service:
- whether Foundry's `gpt-6-luna` accepts the strict `json_schema` with nullable union types and `reasoning: { effort: "none" }`
- whether its final message carries `phase: null` or `final_answer` as `finalJson` expects

Only the presenter's keyed `npm run search:preflight` proves this.

**Verification**
- Before review: lint and typecheck clean, `npm test` 759 passed in 80 files, `npm run test:e2e` built, with 174 passed and 8 skipped (existing booking skips).
- After the patches: lint and typecheck clean; `npm test` 765 passed in 81 files; `npm run test:e2e` built, with 174 passed and 8 skipped.
- Without a key, the pre-flight prints the four missing names and exits 1. Against a dead local URL it reports `UNAVAILABLE` and never prints the key.

**Residual risks**
- The live behaviour of the Foundry deployment, above.
- The prompt wording is a first version, to be tuned with the eval (2.7, 2.8).
- `max_output_tokens` (600, 1500, 300) are starting values.
- The pre-flight's `reasons` check uses the seed description as its only chunk.
