---
type: initiative
title: "CheckInn MVP: book a fictional hotel stay at the expo"
parent: none
covers: [CAP-1, CAP-2, CAP-3, CAP-4, CAP-5, CAP-6, CAP-7, CAP-8]
after: []
assignee: ""
risk: high
---

# CheckInn MVP: book a fictional hotel stay at the expo

## Description

Expo visitors search for one of 12 fictional South African hotels, choose rooms and book a stay without payment, on the projector or their own phones. The spec owns the capabilities, constraints and non-goals; this initiative delivers them for AI Expo Africa 2026.

## Outcome

Expo visitors reach a Booking reference unaided in under 3 minutes, and the shared instance survives a full day: the spec's Success signal.

## Done when

1. Every CAP-1 to CAP-8 success check in the spec passes against a production build (`npm run build && npm start`).
2. The expo dry-run on the presenter laptop serves the projector and two phones over the stand Wi-Fi with no visible error.
3. After `npm install`, `npm run dev` works on a fresh clone with the network blocked.
4. CI lint, typecheck, test, build and e2e are green.

## Boundaries

One Next.js app owned by one developer with agent lanes; see the spec's Non-goals. No other service.

- Touch point: remote photo hosts (images.unsplash.com, Wikimedia) — consumed only, with an offline fallback; owner: epic-checkinn-mvp
- Touch point: `.github/workflows/ci.yml` — consumed, no change expected (architecture, Deferred); owner: epic-checkinn-mvp

## References

- spec — _bmad-output/initiative-checkinn-mvp/spec-checkinn/spec-checkinn.md
- architecture — _bmad-output/initiative-checkinn-mvp/architecture-checkinn/architecture-checkinn.md
- prd — _bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md, FR detail

## Notes

- Decision: one epic, not a separate platform-baseline epic. It is one app with one owner, so the baseline is entries 1–3 of epic-checkinn-mvp. CI needs no change (architecture, Deferred). Hosting is the presenter laptop; Azure is out (PRD §7.2). (User, 2026-10-09)
- Decision: keep one epic of 15 stories rather than splitting it into Browse and Book. (User, 2026-10-09)
