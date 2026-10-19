---
type: epic
title: "Guests describe their stay and see the best-fit Hotels first"
parent: initiative-checkinn-smart-search
covers: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20]
after: []
assignee: ""
risk: high
---

# Guests describe their stay and see the best-fit Hotels first

## Description

The whole of Smart search on top of the built MVP: the Smart search box and its off switch, Query interpretation into the Search bar and Criteria chips, the Hard-criteria filter, the Enrichment and Prepared index, hybrid Retrieval, the Ranking blend, the Best-fit room, grounded Match reasons, the fallback, and the evals. It follows the PRD's FR-1 to FR-20, the architecture spine's AD-19 to AD-33 inside the MVP's layered architecture, and the look and behaviour of the Smart search DESIGN.md and EXPERIENCE.md deltas.

## Outcome

A Guest who describes a stay reaches the right Hotel and Room first, sees why each Hotel is there, and still gets results when the Provider fails; the PRD §11 success metrics, measured by `npm run search:eval`, are the signal.

## Requirements

The PRD's FR-1 to FR-20 are the requirement source, with the testable detail under each FR. UJ-1 to UJ-3 are the journeys and SM-1 to SM-6, SM-C1 and SM-C2 the measures.

## Done when

1. UJ-1, UJ-2 and UJ-3 pass end to end on the `smart-desktop` and `smart-mobile` Playwright projects against `npm start` with the fake Provider, and every MVP spec stays green on the no-Provider server.
2. `npm run search:eval` with the chosen Ranking blend meets SM-1, SM-2, SM-3, SM-5 and SM-6, has zero confirmed *not grounded* Match reasons (SM-4), stays within SM-C1 and SM-C2, and exits zero.
3. With no `.env`, a fresh clone shows no Smart search box and behaves as the MVP; `npm test` and `npm run db:reset` make no Provider call, and `db:reset` while the app runs restores the Prepared index.
4. Lint, typecheck, test, build and e2e are green, and `npm run build` succeeds with no database file and no Provider configuration.
5. Workshop dry run on the presenter laptop: `npm run search:preflight` reports OK over the venue network, the UJ-1 Query shows results within 3 s and Match reasons within a further 3 s, and a Provider failure shows the fallback page with Try again.

## Boundaries

The CheckInn Next.js app only, inside the existing search seam (MVP AD-7, extended by AD-20). See PRD §5 Non-goals and §6.2 Out of scope: no chat, no Facility filters, no Smart search in the Hotel page room table, no summary answer, no offline Smart search, no Party split across Room types, no non-English Queries. The seed file stays unchanged. `.github/workflows` and `infra/` are not touched.

Touch points, configured but not built here:
- Azure AI Foundry deployments `gpt-6-luna` and `text-embedding-3-large`, consumed through `provider/azure.ts` (entry 2)
- `playwright.config.ts`, `e2e/support/db.ts` and `vitest.config.mts` (AD-29, AD-30; entry 1, and entry 17 for `e2e/smart-booking/`)
- `package.json`: the `openai` 7.28.0 dependency (entry 2) and the `search:preflight`, `search:index` and `search:eval` scripts (entries 2, 10, 14)
- `.gitignore`: `.eval-results/` (entry 14)
- `.env.example`, names only (entry 2)

Built here: the Prepared index schema and migrations in `src/db` (entry 11, approved 2026-10-19).

Prerequisite: the CheckInn MVP epic (epic-checkinn-mvp), whose 15 entries are built and in review.

## References

- prd — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/prd-smart-search.md, §3 Glossary, §4 Features, §8, §9, §11, §13
- addendum — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/addendum.md, RAG patterns and eval design
- architecture — _bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md, AD-19 to AD-33, Consistency Conventions, Structural Seed
- architecture (parent) — _bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md, AD-1 to AD-18
- design — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/DESIGN.md, Components (on top of the root DESIGN.md)
- experience — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md, plus the mockups in ux-smart-search/mockups/
- seed — data/seed/hotel-booking-demo.json, unchanged

## Notes

- Decision: workshop material. Each story is sized for one workshop sitting and reviewed in it, with the guest-visible slices first where the architecture allows. (User, 2026-10-19)
- Decision: the Ranking blend (Best match, Best value or Top rated) is chosen in the workshop from the eval report. Entry 15 is that decision point; only the chosen blend is built into `RANKING_BLEND`. Until then entry 5 builds the blend mechanism with the spine's starting value, and the other two candidates live only in the eval runner (FR-12). (User, 2026-10-19)
- Decision: the schema change for the Prepared index tables is approved; entry 11 builds the database copy in AD-24, not the in-memory alternative. (User, 2026-10-19)
- Decision: the `openai` SDK 7.28.0 is approved; entry 2 uses it, not the `fetch` alternative. (User, 2026-10-19)
- Decision: interpretation starts at reasoning effort `none` with a 2.5 s timeout. If the evals show misreads, it moves to effort `low` with a 4 s timeout (results target about 4.5 s). This is a tuning step on the interpretation story (entry 3), applied after the eval in entry 14, not a blocker. (User, 2026-10-19)
- Decision: "this weekend" typed on a Sunday means tonight: Sunday to Monday, 1 night (entry 3). (User, 2026-10-19)
- Decision: Azure is confirmed: deployment `gpt-6-luna` and `text-embedding-3-large` in the same Foundry resource and region, with GPT-6 quota available (entry 2). (User, 2026-10-19)
- Decision: keys. The presenter's key only; attendees see the MVP on a fresh clone; the deployment's tokens-per-minute quota is the spend cap; the key is rotated after the event (entries 2 and 17). (User, 2026-10-19)
- Decision: the tracer bullet is entry 1. The Smart search box on Home submits a Query, `submitQuery` runs `interpretQuery` against the fake Provider, and `/search` opens with `sq` and `smart=1` and the interpreted Search bar, proving the UI, action, application, domain, Provider port and URL layers connect. (Headless run, 2026-10-19)
- Decision: the least certain work is entry 2 (the real `gpt-6-luna` interpretation within 2.5 s with strict `json_schema` output), so it comes straight after the tracer. Entry 12 (hybrid Relevance and the Strong-match threshold) is next least certain and comes as early as the Prepared index allows. (Headless run, 2026-10-19)
- Decision: lanes. After entry 1, three lanes run in parallel: {2} the Azure adapter; {3 → 4 → 5 → 7} the app pipeline, with {6} the Hotel page branching after 5; {8 → 9} the Golden queries (after the tracer) then the Enrichment. Entry 7 also waits on 6 because both touch the codec and the UJ-1 spec. They join at 10 (needs 2 and 9), then 11 → 12 → 13 → 14 → 15 run serially. (Headless run, 2026-10-19)
- Decision: each flow's e2e spec ships with its story (AGENTS.md); entry 17 is the cross-cutting suite, the Smart booking spec and the workshop dry run. Read-only Smart specs live in `e2e/smart/`, the booking spec in `e2e/smart-booking/` (AD-30). (Headless run, 2026-10-19)
- Assumption: one epic of 17 entries, past the typical 8 to 12, because it is one app, one owner (the presenter) and mostly one lane, as the MVP's 15-entry epic was. A split into "Understand the Query" (entries 1 to 7) and "Rank and explain" (entries 8 to 15) was considered; user to confirm. (Headless run, 2026-10-19)
- Assumption: AD-24 Bootstrap says the loader story also commits the Enrichment and both index files. The breakdown splits this across entries 9 (Enrichment), 10 (index files) and 11 (loader), in that order, so the loader never lands without real committed data; user to confirm. (Headless run, 2026-10-19)
- Assumption: built with `bmad-build` with the presenter present in the workshop, so there are no plan or done checkpoints. (Headless run, 2026-10-19)
- Risk checks outside each high-risk entry's own criteria: entry 2 — the presenter runs `npm run search:preflight` on the venue network; entry 4 — SM-3 (zero Hard-criteria breaches) in the eval report of entry 14; entry 11 — the existing reset e2e spec and `reset.test.ts` pass unchanged; entry 13 — the calibrated judge and the human check of every *not grounded* verdict in entry 14.
- Handoff: entry 1 defines the Provider port with all four methods (`interpret`, `embed`, `reasons`, `judge`) and the full AD-22 interpretation output schema; entry 2 implements all four in `azure.ts`, and entries 3, 10, 12, 13 and 14 consume them without changing the port. Entry 3 only fills the context's nickname-map field.
- Handoff: entry 5 owns `bestFit()` taking a per-Room-type meaning input (empty until entry 12 supplies it) and writes `bestFit` into the card's `hotelHref`; entry 6 reads it on the Hotel page and entry 12 feeds the meanings.
- Handoff: entry 8's Golden queries include the e2e Queries; the fake's fixture Preferences (entries 1, 3, 7) reuse their expected Preferences strings, and entry 12 owns the test that each has a golden embedding.
- Handoff: smart mode has no embed stage in entries 4 to 7, so Relevance is 0 there; entry 12 adds it, fills the Score breakdown's meaning and exact rows, and re-baselines the order-asserting specs.
- Handoff: entry 2 adds `toUnitVector` in `src/domain/relevance.ts` and the script `.env` loading; entries 10, 12 and 14 reuse both.
