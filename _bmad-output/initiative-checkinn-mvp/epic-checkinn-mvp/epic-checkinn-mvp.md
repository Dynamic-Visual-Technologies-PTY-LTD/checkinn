---
type: epic
title: "Guests search, choose and book a fictional hotel"
parent: initiative-checkinn-mvp
covers: [CAP-1, CAP-2, CAP-3, CAP-4, CAP-5, CAP-6, CAP-7, CAP-8]
after: []
assignee: ""
risk: high
---

# Guests search, choose and book a fictional hotel

## Description

The whole CheckInn MVP, from the app shell to a cancelled Booking: the 8 capabilities in `spec-checkinn.md`, built in the layered architecture of the spine and the look and behaviour of DESIGN.md and EXPERIENCE.md.

## Outcome

A first-time visitor books on their own phone in under 3 minutes and the shared instance runs a full expo day without a visible error: the spec's Success signal.

## Requirements

The spec's capabilities CAP-1 to CAP-8 are the requirement source. PRD FR-1 to FR-27 carry each one's testable detail.

## Done when

1. PRD UJ-1, UJ-2 and UJ-3 pass end to end on the desktop and mobile Playwright projects against `npm start`.
2. Two concurrent confirms for the last Room produce exactly one Booking and one room-unavailable outcome.
3. With the network blocked, every flow completes, with photo placeholders.
4. `npm run db:reset` while the app runs restores fresh-clone results with no Bookings.
5. Lint, typecheck, test, build and e2e are green, and `npm run build` succeeds with no database file present.
6. Expo dry-run: `npm run build && npm start -- -H 0.0.0.0` on the presenter laptop serves the projector and two phones over plain HTTP. Share falls back to the dialog, booking access works through the cookie, and `db:reset` runs between sessions.

## Boundaries

The CheckInn Next.js app only; see the spec's Non-goals. Out of scope: `infra/`, Azure, and intelligent search.

Touch points, configured but not built:
- `playwright.config.ts` and `vitest.config.mts` (AD-18)
- `package.json` scripts and dependencies (ask first)
- the AGENTS.md Commands text for e2e
- the README's seed-mapping section
- `.github/workflows`: consumed, with no change

## References

- spec — _bmad-output/initiative-checkinn-mvp/spec-checkinn/spec-checkinn.md, Capabilities and Constraints
- prd — _bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md, §3 Glossary, §4 Features, §5
- architecture — _bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md, AD-1 to AD-18, Structural Seed
- design — DESIGN.md (repo root)
- experience — _bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md, plus the mockups in ux-checkinn/mockups/
- seed — C:\Users\lntsinde\Downloads\hotel-booking-demo.json, copied to data/seed/ by entry 2

## Notes

- Decision: the tracer bullet is entry 2. It runs from the database through the seed and a query to the Home City tiles in the browser. (2026-10-09)
- Decision: the least certain work is entry 6 (availability core and search rules), then entry 11 (the booking transaction). Both come as early as their prerequisites allow. (2026-10-09)
- Decision: lanes. After entry 1, the lanes {2 → 3} and {4} run in parallel and join at 5. Entries 7 and 8 run in parallel after 6. From 9 on, the work is one serial lane, because it shares the Hotel page and booking files. (2026-10-09)
- Decision: the City tile count is all Hotels in the City (a catalog read). Clicking a tile runs `searchHotels` with the current criteria. (User, 2026-10-09)
- Decision: the footer "Photo credits" link goes to a new `/credits` page listing every city and hotel photo credit from the seed. It is added to the spine's route list and built in entry 7. (User, 2026-10-09)
- Decision: each flow's e2e spec ships with its story (AGENTS.md). Entry 15 is the cross-cutting suite and the expo dry-run. (2026-10-09)
- Decision: built with `bmad-build` with the user present, so there are no plan or done checkpoints. (User, 2026-10-09)
- Decision: the AD-1 layering rule is checked in review in entry 14, because an ESLint import rule would be an ask-first config change. (2026-10-09)
