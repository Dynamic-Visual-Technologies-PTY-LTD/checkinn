---
type: initiative
title: "CheckInn Smart Search: guests describe their stay and see the best-fit Hotels first"
parent: none
covers: [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20]
after: []
assignee: ""
risk: high
---

# CheckInn Smart Search: guests describe their stay and see the best-fit Hotels first

## Description

A Guest types the stay they want in plain language into one Smart search box above the Search bar. CheckInn fills the Search bar and Criteria chips with the Hard criteria it understood, ranks the Hotels that fit by one Ranking blend, shows each card's Best-fit room and a grounded Match reason, and falls back to the MVP search when the Provider fails. The Smart search PRD owns the requirements (FR-1 to FR-20), journeys (UJ-1 to UJ-3) and success metrics (SM-1 to SM-6); this initiative delivers them as workshop material, built live in the workshop on top of the finished MVP.

## Outcome

A workshop audience watches a RAG pipeline answer UJ-1 to UJ-3 end to end, and the eval report over the Golden queries meets the PRD §11 targets under the Ranking blend the workshop chooses.

## Done when

1. UJ-1, UJ-2 and UJ-3 pass end to end in a production build with the fake Provider, on desktop and mobile viewports.
2. `npm run search:eval` with the chosen Ranking blend meets every PRD §11 target and exits zero.
3. A fresh clone with no `.env` runs `npm install && npm run dev` as the MVP: no Smart search box, and `npm test` and `npm run db:reset` make no outbound request.
4. Lint, typecheck, test, build and e2e are green in CI.
5. Workshop dry run: `npm run search:preflight` reports OK on the venue network, and a Query shows results within 3 s and Match reasons within a further 3 s.

## Boundaries

One Next.js app, owned by the presenter with agent lanes, extending the MVP through the existing search seam (MVP AD-7). See the PRD §5 Non-goals and §6.2 Out of scope. Tracer path: the Smart search box on Home submits a Query, the fake Provider interprets it, and `/search` shows the interpreted Search bar and Hotels.

- Touch point: Azure AI Foundry (`gpt-6-luna`, `text-embedding-3-large`) — consumed over HTTPS with a key in `.env.local`; owner: epic-smart-search
- Touch point: `playwright.config.ts`, `e2e/support/db.ts` and `vitest.config.mts` — a second e2e server on port 3101 and `CHECKINN_PROVIDER=off` for unit tests (AD-29, AD-30); owner: epic-smart-search
- Touch point: `package.json` — the `openai` 7.28.0 dependency (approved 2026-10-19); owner: epic-smart-search
- Touch point: `.gitignore` (`.eval-results/`) and `.env.example` (names only); owner: epic-smart-search
- Touch point: `.github/workflows/ci.yml` — consumed, no change needed (AD-30); owner: epic-smart-search

Built here, not touch points: the Prepared index schema and migrations in `src/db` (approved 2026-10-19, AD-24) and the `search:preflight`, `search:index` and `search:eval` scripts, all in epic-smart-search.

Prerequisite: the finished CheckInn MVP (initiative-checkinn-mvp). Its 15 entries are built and in review; Smart search extends its search seam, Hotel page and booking flow.

## References

- prd — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/prd-smart-search.md, §4 Features, §8, §9, §10, §11
- addendum — _bmad-output/initiative-checkinn-smart-search/prd-smart-search/addendum.md
- architecture — _bmad-output/initiative-checkinn-smart-search/architecture-smart-search/architecture-smart-search.md, AD-19 to AD-33 (extends the MVP AD-1 to AD-18)
- design — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/DESIGN.md
- experience — _bmad-output/initiative-checkinn-smart-search/ux-smart-search/EXPERIENCE.md, with mockups/
- constraint — AGENTS.md, Boundaries (ask-first items and the fresh-clone rule)

## Notes

- Decision: all Smart search work stays on the branch `docs/rag-search-planning` and is never merged into `main` without the user's explicit permission. (User, PRD §0, 2026-10-15)
- Decision: workshop material. Planning answers are settled before the workshop so the live build moves fast; stories are sized for one workshop sitting each, with guest-visible slices first where the architecture allows. (User, 2026-10-19)
- Assumption: one epic, not a separate platform-baseline epic. It is one app with one owner, the MVP baseline (scaffold, CI, environments) already exists, and the new environments (port 3101 server, Provider config) are stories of epic-smart-search. Mirrors the MVP initiative's decision; user to confirm, then this becomes a Decision line. (Headless run, 2026-10-19)
- Open question: the MVP entries are built and in review, not marked done; the user confirms the MVP is done before Smart search entry 1 starts.
- Decision: the database schema change for the Prepared index tables (chunks, embeddings, FTS5) is approved; the database copy in AD-24 is built and the in-memory alternative is not. (User, 2026-10-19)
- Decision: the `openai` npm SDK 7.28.0 is approved; the `fetch` alternative in AD-25 is not built. (User, 2026-10-19)
- Decision: Azure is confirmed: deployment `gpt-6-luna` and `text-embedding-3-large` in the same Foundry resource and region, with GPT-6 quota available. (User, 2026-10-19)
- Decision: the presenter's key only. Attendees see the MVP on a fresh clone. The deployment's tokens-per-minute quota is the spend cap, and the key is rotated after the event. (User, 2026-10-19)
