---
type: epic
title: "Guests describe their stay and get filtered, best-fit results"
parent: initiative-checkinn-smart-search
covers: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-10, FR-11, FR-12, FR-13, FR-14, FR-20]
after: []
assignee: ""
risk: high
---

# Guests describe their stay and get filtered, best-fit results

## Description

The guest-facing half of Smart search on top of the finished MVP, demonstrable on the fake Provider: the Smart search box and its off switch, Query interpretation into the Search bar and Criteria chips, the Hard-criteria filter, the Best-fit room with Hotel page pre-selection, the Ranking blend mechanism and Score breakdown, and the fallback with Try again. It also delivers the Azure Provider adapter and pre-flight, which epic-smart-search-quality uses for embeddings, Match reasons and the judge. It follows the PRD's FR ids in `covers`, the spine's AD-19 to AD-23, AD-26 (Ranking and Best-fit), AD-28 to AD-31 and AD-33 inside the MVP's layered architecture, and the Smart search DESIGN.md and EXPERIENCE.md deltas.

## Outcome

A Guest who types UJ-1's Query sees the Search bar and chips they meant, only the Hotels that fit, the Best-fit room on the card and pre-selected on the Hotel page, and still gets results when the Provider fails; UJ-1 end to end is the signal.

## Requirements

The PRD's FR ids in `covers` are the requirement source, with the testable detail under each FR. Shared with epic-smart-search-quality, this epic delivers: FR-10, the no-results state only (the weak-match heading is epic 2's); FR-11 and FR-12, the blend mechanism at the spine's starting value (the choice is epic 2's entry 8); FR-13, the tie-breaks (the cached Relevance is epic 2's; the interpretation cache in entry 7 is AD-28); FR-14, `bestFit()` with empty meanings, the card line and the Hotel page (the Room-type meanings are epic 2's); FR-20, the Score breakdown table (its Relevance rows are filled in epic 2).

## Done when

1. UJ-1 passes end to end on the `smart-desktop` and `smart-mobile` Playwright projects against `npm start` with the fake Provider, from the Example query to Reserve enabled with the Family Room pre-selected, and every MVP spec stays green on the no-Provider server.
2. A Query the fake does not know, and a Provider timeout, show the fallback page in MVP order with the Query in the box and a working Try again.
3. With no `.env`, a fresh clone shows no Smart search box and behaves as the MVP, and `npm test` makes no outbound request.
4. Lint, typecheck, test, build and e2e are green.
5. `npm run search:preflight` with the presenter's key reports both deployments OK, with interpretation p95 under 5 s.

## Boundaries

The CheckInn Next.js app only, inside the existing search seam (MVP AD-7, extended by AD-20). See PRD §5 Non-goals and §6.2 Out of scope. Not here: the Enrichment, the Prepared index, Relevance, Match reasons and the evals (epic-smart-search-quality). The seed file stays unchanged. `.github/workflows` and `infra/` are not touched.

Touch points, configured but not built here:
- Azure AI Foundry deployments `gpt-6-luna` and `text-embedding-3-large`, consumed through `provider/azure.ts` (entry 2)
- `playwright.config.ts`, `e2e/support/db.ts` and `vitest.config.mts` (AD-29, AD-30; entry 1)
- `package.json`: the `openai` 7.28.0 dependency (entry 2)
- `.github/workflows/ci.yml`: consumed, no change (AD-30)
- `.env.example`, names only (entry 2)

Built here: the `search:preflight` script (entry 2).

Prerequisite: the CheckInn MVP epic (epic-checkinn-mvp), done.

## References

- prd — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/prd-smart-search.md, §3 Glossary, §4 Features, §8, §9, §13
- addendum — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/addendum.md, Provider decision
- architecture — _bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md, AD-19 to AD-33, Consistency Conventions, Structural Seed
- architecture (parent) — _bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md, AD-1 to AD-18
- design — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/DESIGN.md, Components (on top of the root DESIGN.md)
- experience — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md, plus the mockups in ux-smart-search/mockups/
- seed — data/seed/hotel-booking-demo.json, unchanged

## Notes

- Decision: workshop material. Each story is sized for one workshop sitting and reviewed in it, with the guest-visible slices first where the architecture allows. (User, 2026-10-19)
- Decision: the epic is split at entries 7/8. This epic keeps entries 1 to 7, the guest-facing Smart search on the fake Provider plus the Azure adapter; entries 8 to 17 moved to epic-smart-search-quality as its entries 1 to 10, and ids 8 to 17 are not reused here. (User, 2026-10-19)
- Decision: no Refactor sweep in this epic. Under the user's split it holds entries 1 to 7 only, and the sweep in epic-smart-search-quality (2.9) waits on 1.1 to 1.7 and takes this epic's deferred findings. (User's split, 2026-10-19)
- Decision: the Ranking blend is chosen in the workshop from the eval report (2.8); entry 5 builds the mechanism with the spine's starting value, provisional until then, and the other two candidates live only in the eval runner (FR-12). (User, 2026-10-19)
- Decision: the `openai` SDK 7.28.0 is approved; entry 2 uses it, not the `fetch` alternative. (User, 2026-10-19)
- Decision: interpretation starts at reasoning effort `none` with a 2.5 s timeout. If the evals show misreads, it moves to effort `low` with a 4 s timeout (results target about 4.5 s). This is a tuning step on entry 3, applied in 2.8 from 2.7's eval report, not a blocker. (User, 2026-10-19) Superseded on 2026-10-21: see the next decision.
- Decision: the interpretation timeout is 5 s, not 2.5 s, which puts the results target at about 5.5 s. `gpt-6-luna` measured about 2.3 s at p95 warm and more on a cold connection, so most Queries hit 2.5 s and fell back. `actions.ts`, the pre-flight, the PRD and the architecture ("Resolved with the user", item 4) use 5 s. (User, 2026-10-21, commit 953c576)
- Decision: "this weekend" typed on a Sunday means tonight: Sunday to Monday, 1 night (entry 3). (User, 2026-10-19)
- Decision: Azure is confirmed: deployment `gpt-6-luna` and `text-embedding-3-large` in the same Foundry resource and region, with GPT-6 quota available (entry 2). (User, 2026-10-19)
- Decision: keys. The presenter's key only; attendees see the MVP on a fresh clone; the deployment's tokens-per-minute quota is the spend cap; the key is rotated after the event (entry 2). (User, 2026-10-19)
- Decision: no plan or done checkpoints. Each story is built live with `bmad-build` in one sitting. (User, 2026-10-19)
- Decision: the tracer bullet is entry 1. The Smart search box on Home submits a Query, `submitQuery` runs `interpretQuery` against the fake Provider, and `/search` opens with `sq` and `smart=1` and the interpreted Search bar, proving the UI, action, application, domain, Provider port and URL layers connect. (Headless run, 2026-10-19)
- Decision: the least certain work is entry 2 (the real `gpt-6-luna` interpretation within 2.5 s with strict `json_schema` output), so it comes straight after the tracer. (Headless run, 2026-10-19)
- Decision: lanes. After entry 1, {2} the Azure adapter runs beside {3 → 4 → 5 → 6 → 7} the app pipeline; entry 7 waits on 6 because both touch the codec and the UJ-1 spec. (Headless run, 2026-10-19)
- Decision: each flow's e2e spec ships with its story (AGENTS.md); read-only Smart specs live in `e2e/smart/`. The cross-cutting suite and the Smart booking spec are 2.10. (Headless run, 2026-10-19)
- Risk checks outside each high-risk entry's own criteria: entry 2 — the presenter runs `npm run search:preflight` on the venue network; entry 4 — SM-3 (zero Hard-criteria breaches) in the eval report of 2.7.
- Handoff: entry 1 defines the Provider port with all four methods (`interpret`, `embed`, `reasons`, `judge`) and the full AD-22 interpretation output schema; entry 2 implements all four in `azure.ts`; entry 3 and 2.3, 2.5, 2.6 and 2.7 consume them without changing the port. Entry 3 only fills the context's nickname-map field.
- Handoff: entry 5 owns `bestFit()` taking a per-Room-type meaning input (empty until 2.5 supplies it) and writes `bestFit` into the card's `hotelHref`; entry 6 reads it on the Hotel page.
- Handoff: smart mode has no embed stage in entries 4 to 7, so Relevance is 0 there; 2.5 adds it, fills the Score breakdown's meaning and exact rows, and re-baselines the order-asserting specs.
- Handoff: entries 1, 3 and 7 write the fake's fixture Preferences first; 2.1 uses those same strings as the expected Preferences of its e2e Golden queries (AD-30 requires the two to match), and 2.5 owns the test that each has a golden embedding.
- Handoff: entry 2 adds `toUnitVector` in `src/domain/relevance.ts` and the script `.env` loading; 2.3, 2.5 and 2.7 reuse both.
