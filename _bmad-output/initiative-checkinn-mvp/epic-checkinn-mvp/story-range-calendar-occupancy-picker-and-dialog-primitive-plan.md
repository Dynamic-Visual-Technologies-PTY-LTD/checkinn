---
title: 'Range calendar, occupancy picker and dialog primitive'
type: 'feature'
ticket: '4'
created: '2026-10-13'
status: done
baseline_revision: 'c4d2c8a82810b5657d7fc3210fa9c37a18a3d399'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/mockups/key-calendar.html'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Guests can't pick dates or a party yet. The search bar (story 5) and the Hotel page (stories 8–10, 13) need a range calendar, an occupancy picker, and one accessible overlay primitive to build on.

**Approach:** Client components in `src/components/`: a date-range field and an occupancy field. Each is a trigger that opens a non-modal popover from 768px and a modal sheet below it, and each emits a `Stay` and a `Party` (`src/domain/types.ts`). Plus a modal `Dialog` primitive (focus trap, inert background, Escape, focus restore) that later stories reuse. Pure date arithmetic lives in `src/domain/dates.ts`. The behaviour follows EXPERIENCE.md L85–88 and L147–151, L175–182; the look follows DESIGN.md L697–726 and its tokens.

## Boundaries & Constraints

**Always:** `today: IsoDate` is a prop; nothing reads the clock (story 5 owns `clock.ts`). Dates are ISO `YYYY-MM-DD` strings, and date math on them is UTC-safe and pure. Weeks start Monday. Past days are disabled, and once check-in is set, so is every day beyond check-in + 30 nights; both are `aria-disabled`, stay focusable, and say ", unavailable". The first pick sets check-in, the second sets check-out, and a pick on or before check-in restarts the selection. Done, Escape or an outside click keeps a complete range, and discards a check-in-only range back to the previous `Stay`. A field emits only on close with a changed value. Limits: Adults 1–10, Children 0–6, Rooms 1–5 and ≤ adults (lowering adults below rooms lowers rooms too). A stepper at its limit is `aria-disabled` and keeps focus. A polite live region announces "3 adults" and "Maximum 10 adults". Day names are like "Friday 13 November 2026, check-in". Day labels are built from fixed English names, never `Intl`, so server and client match. Targets are ≥ 44px, with the 2px Gold focus ring; under reduced motion nothing animates. Tokens only. Tests use jsdom and query by role and name.

**Never:** No new dependencies (no date or headless-UI library). No criteria codec, clock, search bar, validation messages or `/search` (story 5+). No page wiring; nothing renders these yet. Overlays never stack. No `"use client"` in `src/domain`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Click range | today 2026-11-10; click 13, then 15 | Footer "2 nights · Fri 13 Nov – Sun 15 Nov"; Done emits `{checkIn:"2026-11-13",checkOut:"2026-11-15"}` | — |
| Keyboard range | Arrow/PageDown/Home/End, then Enter twice | Same as the click range; focus follows the roving tabindex across the month boundary | — |
| Restart | check-in 15; pick 12 | Check-in becomes 12; no check-out | — |
| Past / 30-night limit | today 10; check-in 13 | 9 and Dec 14 are unavailable; activating them does nothing; focus stays | — |
| Partial close | check-in only; Escape | Popover closes; previous Stay kept; no emit | — |
| Stepper limits | adults 10 / rooms = adults / children 0 | The plus or minus is `aria-disabled`, focused, announced "Maximum 10 adults" | — |
| Dialog | Open from a button; Tab past the last; Escape | Focus cycles inside; background inert; focus returns to the button | — |
| Phone | Viewport < 768px | The field opens a `role="dialog"` `aria-modal` sheet with title, Close and Done | — |

## Decisions (user, 2026-10-13)

- **Phone months:** the phone sheet shows 12 stacked months, starting at today's month, all rendered at once.

</frozen-after-approval>

## Code Map

- `src/domain/types.ts` -- has `IsoDate`, `Stay {checkIn, checkOut}`, `Party {adults, children, rooms}`; reuse, don't redefine.
- `src/components/icons/icons.tsx` -- `Icon({name,title?,className})`; names `calendar`, `person`, `close`, `chevron-left`, `chevron-right`, `plus`, `minus`.
- `src/app/globals.css` -- tokens: colours `primary`, `primary-strong`, `primary-subtle`, `secondary` (cyan), `tertiary` (gold), `neutral`, `surface`, `on-surface(-muted/-disabled)`, `on-primary`; text `headline-sm`, `label-sm`, `label-md`, `body-sm`; `radius-md/full`; `spacing-space-*`.
- DESIGN.md front-matter tokens `popover`, `sheet`, `dialog` (480px), `calendar-day*`, `stepper-button` (L254–301); prose L627–630 (scrim Midnight 70% behind the dialog; sheets solid), L697–726.
- `mockups/key-calendar.html:127-165` -- trigger `aria-haspopup="dialog" aria-expanded aria-controls`; the popover is `role="dialog" aria-label="Dates"`; each month is a `table role="grid"` labelled by its heading, with `th abbr="Monday"` "Mo"; day `button` with roving tabindex; Prev "Previous month" and Next "Next month" icon buttons; the phone title is "Select dates".
- Tests live beside the code (`*.test.tsx`); see `src/components/city-tiles.test.tsx` for style.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/dates.ts` + test -- `addDays`, `nightsBetween`, `isBefore`, month grid (Monday-first weeks), day and range labels -- pure, UTC-safe.
- [x] `src/components/dialog.tsx` + test -- modal `Dialog`: title, `aria-modal`, focus trap, inert background, Escape, initial focus on a chosen element, restore focus to the trigger, scrim. The same mechanics serve the phone sheet variant.
- [x] `src/components/popover.tsx` + test -- non-modal `role="dialog"` named by its field; Escape or an outside click closes and returns focus to the trigger.
- [x] `src/components/range-calendar.tsx` + test -- the grid: two months with Prev/Next on desktop (Prev disabled on the current month), 12 stacked months on phone (from today's month), roving focus, keys per EXPERIENCE.md L147–151, `aria-selected`, today's Cyan underline, the "N nights · …" footer.
- [x] `src/components/date-range-field.tsx` + test -- trigger + popover/sheet + calendar; Done; emits a `Stay`.
- [x] `src/components/occupancy-field.tsx` + test -- trigger "2 adults · 0 children · 1 room", the three steppers, the live region; emits a `Party`.
- [x] `src/components/use-media-query.ts` -- `(min-width: 768px)` switch for popover vs sheet.

**Acceptance Criteria:**
- Given the component tests, when `npm test` runs, then every matrix row passes by keyboard and by click.
- Given any of these components, when lint and typecheck run, then there are no `any` types and no imports from `src/db`, `src/features` or `next/*` server modules.

## Implementation Notes

- Pick rule: a pick after a complete range starts a new selection (the "first pick, second pick" pairing). The 30-night limit applies while only check-in is set, i.e. while the guest is choosing check-out; a pre-filled complete range doesn't block later check-ins. `pickDate` and `isUnavailable` in `src/domain/dates.ts` hold the rule.
- Day names add ", today" (as in the mockup) before the role suffix, e.g. "Tuesday 10 November 2026, today".
- Dates field value text uses the EXPERIENCE.md short-range format ("Fri 13 – Sun 15 Nov 2026"); "Add dates" when `value` is `null`. The footer uses "2 nights · Fri 13 Nov – Sun 15 Nov"; a check-in-only footer reads "Fri 13 Nov · Select check-out".
- Occupancy announcements: "3 adults", "Maximum 10 adults" on reaching or pressing a max, "Minimum 0 children" on a min, "2 adults, 2 rooms" when rooms are lowered with adults. Stepper names: "Increase adults", "Decrease children". Sheet title "Select occupancy". `PARTY_LIMITS`, `partyLabel` and `countLabel` are exported from `occupancy-field.tsx`.
- The sheet's Close button behaves like Done/Escape (keeps a complete range, discards check-in only). Dialog does not close on a scrim click.
- Focus trap is hand-rolled (Tab/Shift+Tab wrap plus a `focusin` guard); `inert` is set on the other `document.body` children while a Dialog is open. Popovers render inline under a `relative` anchor; Dialogs portal to `document.body`.
- Desktop month blocks are keyed by position so Previous/Next keep focus when the months change. Keyboard focus is clamped to today's month at the start, and to the 12th month on phone.
- A controlled parent that closes a field by setting `open={false}` does not trigger a commit; closing through the field (Done, Escape, outside press, Close) does. Story 5's "one overlay open" works because opening the other field starts with an outside press on this one.
- Fade-in uses `motion-safe:` + `starting:` utilities (no globals.css change). Test helper `src/test/viewport.ts` stubs `matchMedia`; `src/test/setup.ts` now also calls `vi.unstubAllGlobals()`.
- Shared helpers added beyond the Code Map: `src/components/focus.ts` (tabbables, initial focus target) and `src/components/button-styles.ts` (secondary and icon button classes, overlay fade).

## Plan Change Log

## Review Triage Log

Verdicts: 3 medium, 4 low, 0 false, 1 maybe-false.

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | Keyboard Tab out leaves the popover open, so overlays can stack | medium | `popover.tsx:58` listens only for `pointerdown`; no `focusout`. | patch: close on focus leaving |
| 2 | The occupancy trigger text shows the committed Party, not the draft | medium | `occupancy-field.tsx:205` `partyLabel(value)`; EXPERIENCE.md L86 "Each change updates the field text". | patch |
| 3 | Matrix rows lack keyboard-path tests | medium | No keyboard test for restart, past day by Enter, outside-press discard, or focus at the rooms limit. | patch: add tests |
| 4 | Repeated limit presses are not re-announced | low | Same string is set again in the live region; direct fix. | patch |
| 5 | `step` uses `===` while `atMin`/`atMax` use `<=`/`>=` | low | `occupancy-field.tsx:112` vs `:138-139`; one-token fix. | patch |
| 6 | Dates popover may overflow at tablet widths | maybe-false (medium if true) | Nothing renders the field yet; depends on story 5's bar layout. | defer; noted in the story 5 plan |
| 7 | Stepper buttons lack the `surface` background | low | DESIGN.md `stepper-button` bg surface; `iconButton` has none. | patch |
| 8 | Desktop calendar has no 12-month cap | low | Rarely met; the cap adds new limits (not a direct correction), and the 12-month decision covers the phone only. | reject |

## Design Notes

- Fields accept optional controlled `open`/`onOpenChange` so story 5 can keep one overlay open at a time.
- Inert background: render overlays through a portal on `document.body` and set `inert` on the other body children while modal. Native `<dialog>.showModal()` is fine if jsdom supports it in tests; otherwise hand-roll the focus trap.


## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
