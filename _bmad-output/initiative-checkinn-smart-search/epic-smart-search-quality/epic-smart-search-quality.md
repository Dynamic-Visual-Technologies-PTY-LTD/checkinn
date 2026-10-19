---
type: epic
title: "Results rank by meaning, with grounded Match reasons, measured by evals"
parent: initiative-checkinn-smart-search
covers: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20]
after: []
assignee: ""
risk: high
---

# Results rank by meaning, with grounded Match reasons, measured by evals

## Description

The retrieval-quality half of Smart search, built on epic-smart-search: the Golden queries, the Enrichment, chunking and the committed Prepared index, its database tables and reset, hybrid Relevance in the ranking with the weak-match heading, grounded Match reasons streamed into the cards, the eval runner with its calibrated judge, the workshop's choice of Ranking blend, the refactor sweep across both epics, and the closing e2e suite and workshop dry run. It follows the PRD's FR ids in `covers` and the spine's AD-24 to AD-28, AD-30 and AD-32.

## Outcome

A Guest's Preferences put the right Hotel and Room first and each card says truthfully why; the PRD §11 success metrics, measured by `npm run search:eval` under the Ranking blend the workshop chooses, are the signal.

## Requirements

The PRD's FR ids in `covers` are the requirement source, with the testable detail under each FR. Shared with epic-smart-search, this epic delivers: FR-1, FR-2, FR-3, FR-5 and FR-6, the cross-cutting e2e and dry run only (entry 10), which also adds e2e coverage only for FR-10, FR-14 and FR-15; FR-4, the interpretation tuning step only (entry 8); FR-10, the weak-match heading and the No-Preferences state; FR-11 and FR-12, the eval comparison and the workshop's choice; FR-13, the embedding cache and stable order under Relevance; FR-14, the Room-type meanings fed into `bestFit()`; FR-20, the Relevance rows (meaning and exact words) of the Score breakdown.

## Done when

1. UJ-2 and UJ-3 pass end to end on the `smart-desktop` and `smart-mobile` Playwright projects against `npm start` with the fake Provider, and the UJ-1 booking reaches a reference in `e2e/smart-booking/`.
2. `npm run search:eval` with the chosen Ranking blend meets SM-1, SM-2, SM-3, SM-5 and SM-6, has zero confirmed *not grounded* Match reasons (SM-4), stays within SM-C1 and SM-C2, and exits zero.
3. `npm run db:reset` while the app runs restores the Prepared index, never calls the Provider, and the Golden-query Retrieval tests pass in `npm test` with no key.
4. Lint, typecheck, test, build and e2e are green, and `npm run build` succeeds with no database file and no Provider configuration.
5. Workshop dry run on the presenter laptop: `npm run search:preflight` reports OK over the venue network, the UJ-1 Query shows results within 3 s and Match reasons within a further 3 s, and a Provider failure shows the fallback page with Try again.

## Boundaries

The CheckInn Next.js app only. See PRD §5 Non-goals and §6.2 Out of scope. Not here: the Smart search box, interpretation, the Hard-criteria filter, the Best-fit room UI and the fallback (epic-smart-search). The seed file stays unchanged; `.github/workflows` and `infra/` are not touched.

Touch points, configured but not built here:
- `.gitignore`: `.eval-results/` (entry 7)
- `playwright.config.ts`: the serial `e2e/smart-booking/` project (entry 10)

Built here: the Prepared index schema and migrations in `src/db` (entry 4, approved 2026-10-19), and the `search:index` and `search:eval` scripts in `package.json` (entries 3, 7).

## References

- prd — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/prd-smart-search.md, §4.3 to §4.6, §9, §11, §13
- addendum — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/addendum.md, RAG patterns and eval design
- architecture — _bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md, AD-24 to AD-28, AD-30, AD-32, Consistency Conventions, Structural Seed
- design — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/DESIGN.md, Components (match-reason, score-breakdown)
- experience — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md, plus mockups/key-results-weak.html and mockups/key-results-thandi.html
- seed — data/seed/hotel-booking-demo.json, unchanged

## Notes

- Decision: split from epic-smart-search at its entries 7/8. Its entries 8 to 17 are this epic's entries 1 to 10, in the same order. (User, 2026-10-19)
- Decision: workshop material. Each story is sized for one workshop sitting and reviewed in it. (User, 2026-10-19)
- Decision: the Ranking blend (Best match, Best value or Top rated) is chosen in the workshop from the eval report. Entry 8 is that decision point; only the chosen blend is built into `RANKING_BLEND`, and the other two candidates live only in the eval runner (FR-12). (User, 2026-10-19)
- Decision: the schema change for the Prepared index tables is approved; entry 4 builds the database copy in AD-24, not the in-memory alternative. (User, 2026-10-19)
- Decision: the interpretation tuning step (effort `low` with a 4 s timeout if the evals show misreads) is applied in entry 8 from entry 7's report. (User, 2026-10-19)
- Decision: keys. The presenter's key only; attendees see the MVP on a fresh clone; the tokens-per-minute quota is the spend cap; the key is rotated after the event (entry 10's dry run). (User, 2026-10-19)
- Decision: no plan or done checkpoints. Each story is built live with `bmad-build` in one sitting. (User, 2026-10-19)
- Decision: the first entry that touches every layer this epic adds is entry 5, which runs the committed index through Relevance into the `/search` order and the weak-match heading; entries 1 to 4 are the data it needs. Entry 5 is also the least certain (the Strong-match threshold), and comes as early as the index allows. (Headless run, 2026-10-19)
- Decision: lanes. {1 → 2} the Golden queries then the Enrichment run beside epic-smart-search after its tracer; 3 needs 1.2 and 2; 4 → 5 → 6 → 7 → 8 → 9 → 10 then run serially. Entry 1 comes before entry 2 because FR-17 requires the expected answers to be written before the Enrichment. (Headless run, 2026-10-19)
- Decision: entry 9 is the Refactor sweep for both epics; it waits on 1.1 to 1.7 and entries 1 to 8. Entry 10 is the closing e2e suite and dry run. (User's split, 2026-10-19)
- Open question: if the workshop picks Top rated, Goldleaf ranks first for UJ-2 (PRD FR-11), against the PRD's UJ-2 journey (Jacaranda first) and Done when 1. Answering it is part of entry 8: either UJ-2's expected order is re-baselined with the choice, or Top rated is ruled out.
- Assumption: AD-24 Bootstrap says the loader story also commits the Enrichment and both index files. The breakdown spreads this across entries 2 (Enrichment), 3 (index files) and 4 (loader), in that order, so the loader never lands without real committed data; user to confirm. (Headless run, 2026-10-19)
- Waits on epic-smart-search because: entry 1 needs the tracer's `normaliseText` and types (1.1), entry 3 needs the Azure adapter's embed (1.2), and entry 5 needs the smart pipeline with fallback, Ranking blend and Best-fit (1.7).
- Risk checks outside each high-risk entry's own criteria: entry 4 — the existing reset e2e spec and `reset.test.ts` pass unchanged; entry 6 — the calibrated judge and the human check of every *not grounded* verdict in entry 7.
- Handoff: 1.1, 1.3 and 1.7 write the fake's fixture Preferences first; entry 1 uses those same strings as the expected Preferences of its e2e Golden queries (AD-30 requires the two to match), and entry 5 owns the test that each has a golden embedding.
- Handoff: entry 5 feeds Relevance into 1.5's `RANKING_BLEND` and Room-type meanings into `bestFit()`, fills the Score breakdown's meaning and exact rows, and re-baselines the order-asserting specs from 1.4 and 1.5.
- Handoff: entries 3, 5, 6 and 7 use 1.2's `embed`, `reasons` and `judge`, `toUnitVector` and script `.env` loading without changing the port.
