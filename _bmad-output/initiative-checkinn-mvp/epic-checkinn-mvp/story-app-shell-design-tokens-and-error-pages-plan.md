---
title: 'App shell, design tokens and error pages'
type: 'feature'
ticket: '1'
created: '2026-10-12'
status: done
baseline_revision: 'f58cebc9e7dc7e2b93ea21a767641c1e8db13a49'
route: 'full'
route_source: 'pinned'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context:
  - '{project-root}/DESIGN.md'
  - '{project-root}/_bmad-output/initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app is a placeholder page with no header, footer, landmarks or error pages. It also loads Poppins from Google at build time, so a fresh clone without internet breaks (AD-17). Every later story needs the shell, the full DESIGN.md token theme, the icon set and the `Stay`/`Party` types.

**Approach:** Put the header (logo, Manage booking), footer (fictional notice, Photo credits), skip link and landmarks into the root layout. Self-host Poppins through `next/font/local`, and sync every DESIGN.md token into the Tailwind theme. Add the inline SVG icon set, the base domain types, `error.tsx`, `not-found.tsx` and the `'%s · CheckInn'` title template.

## Boundaries & Constraints

**Always:** server components except `error.tsx`. Tailwind utilities only, using DESIGN.md tokens, no hex literals in markup. The logo link is named "CheckInn home", and the logo images have empty alt. Gold 2px focus ring with a 2px offset on every focusable element. The page reflows at 320px with no horizontal scroll. Copy comes verbatim from DESIGN.md and EXPERIENCE.md. The only runtime requests are same-origin.

**Never:** add dependencies or change `next.config.ts`, `tsconfig.json`, ESLint or CI config. No icon library and no remote fonts. Do not build `/manage` or `/credits` (entries 13 and 7); the links may 404 until then. Do not hand-edit `next-env.d.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Home | GET `/` | Skip link first, then `banner` with `navigation`, `main#main`, `contentinfo`; title "CheckInn" | No error expected |
| Offline | Network blocked except localhost | Page renders in Poppins; no failed requests | No error expected |
| Unknown URL | GET `/nope` | 404 status, h1 "We can't find that page.", links to Home and search; title "Page not found · CheckInn" | Shell still shown |
| Render error | A page throws | `error.tsx`: "Something went wrong on our side. Try again." plus a Try again button calling `retry()` | Logs with `console.error` |
| Narrow phone | Width < 480px | Header 64px shows the icon instead of the wordmark | — |
| Short viewport | Height < 500px | Header is not sticky | — |

</frozen-after-approval>

## Code Map

- `src/app/layout.tsx` -- replace `next/font/google` with `next/font/local`; metadata title becomes `{ default: "CheckInn", template: "%s · CheckInn" }`; renders SkipLink, SiteHeader, children, SiteFooter.
- `src/app/layout.test.tsx` -- mocks `next/font/google`; switch the mock to `next/font/local` and assert the template.
- `src/app/page.tsx` -- currently renders its own `<main>`. The layout will own `<main id="main">`, so the page returns a fragment or section and keeps its h1 and copy.
- `src/app/globals.css` -- has a partial `@theme`. Missing: `primary-subtle`, `on-surface-disabled`, `error`, `success`, `on-success`, `headline-display-mobile`, `headline-lg-mobile`, `input-mobile`, `price-lg`, `reference-code`. Mobile body is wrongly 13px; DESIGN.md says 15px at every width. Keep the `--spacing-space-*` prefix comment. Add a base `:focus-visible` rule (outline 2px tertiary, offset 2px).
- `.next/dev/static/media/` -- cached Google Poppins latin woff2 files (OFL): 300 `c875c6f5d3e977ac-s.p.*.woff2`, 400 `a218039a3287bcfd-s.p.*`, 500 `8e6fa89aa22d24ec-s.p.*`, 600 `e2334d715941921e-s.p.*`. Copy them to `src/app/fonts/poppins-{300,400,500,600}.woff2` with `src/app/fonts/OFL.txt` (Copyright 2020 The Poppins Project Authors, SIL OFL 1.1).
- `public/logo/checkinn-logo-on-dark.webp` (1336×247, so about 216×40) and `public/logo/checkinn-icon.png` (786×786) -- render through `next/image` at 40px high.
- `e2e/home.spec.ts`, `e2e/not-found.spec.ts` -- existing; not-found expects heading "404" and must change.
- Next 16: `error.tsx` props are `{ error, retry }` (not `reset`). `title.template` does not apply to pages in the root segment, so `not-found.tsx` uses `title: { absolute: "Page not found · CheckInn" }`.

## Tasks & Acceptance

**Execution:**
- [ ] `src/app/fonts/` -- add the 4 woff2 files and OFL.txt -- AD-17 offline fonts.
- [ ] `src/app/globals.css` -- full DESIGN.md token theme, mobile/desktop headline swap via utilities, 15px body, focus ring, `scroll-padding-top` for the sticky header -- single source of tokens.
- [ ] `src/domain/types.ts` -- `IsoDate`, `Stay { checkIn; checkOut }`, `Party { adults; children; rooms }` per the PRD Glossary -- base types for later stories.
- [ ] `src/components/icons/icons.tsx` -- `Icon` component (`name`, optional `title`; decorative `aria-hidden` when there is no title; otherwise `role="img"` with `aria-label`), 20px, 24-unit viewBox, `stroke="currentColor"`, 1.5 stroke, round caps, covering all 28 DESIGN.md icons -- AD-17.
- [ ] `src/components/site-header.tsx`, `site-footer.tsx`, `skip-link.tsx` -- shell per DESIGN.md Header/Footer/Link and EXPERIENCE.md Landmarks.
- [ ] `src/app/layout.tsx`, `src/app/page.tsx` -- wire the shell; the layout owns `<main id="main" tabIndex={-1}>`.
- [ ] `src/app/not-found.tsx`, `src/app/error.tsx` -- copy per the matrix.
- [ ] Unit tests: `layout.test.tsx`, `page.test.tsx`, plus `site-header.test.tsx`, `site-footer.test.tsx`, `icons.test.tsx`, `not-found.test.tsx`, `error.test.tsx` beside their files -- roles and names.
- [ ] `e2e/home.spec.ts`, `e2e/not-found.spec.ts` -- landmarks, skip link moves focus to main, offline font check (route-abort every non-localhost request; `document.fonts.check('16px Poppins')` is true), icon-below-480px, the not-found copy and 404 status.

**Acceptance Criteria:**
- Given a fresh build with the network blocked, when Home loads, then header, footer and Poppins render and no request fails.
- Given keyboard focus at page start, when Tab then Enter on the skip link, then focus is on `main`.
- Given any focusable shell element, when focused by keyboard, then a 2px Gold ring with offset is visible.
- Given `npm run design:lint`, then it still passes (DESIGN.md is unchanged).

## Implementation Notes

## Plan Change Log

## Review Triage Log

| # | Location | Finding | Verdict | Route | Evidence |
|---|---|---|---|---|---|
| 1 | `src/components/site-header.tsx` | Both toggled logo images use `preload`, so both download | medium | patch | Next 16 `image.md` line 1322: toggled pairs must not use `preload`/`eager` or both load. |
| 2 | `src/components/site-header.tsx` | Header height fixed (`h-16 md:h-[100px]`), not a minimum | medium | patch | DESIGN.md line 564 and EXPERIENCE.md line 187: every height is a minimum. Fix is a class swap; DESIGN.md is in the plan's context. |
| 3 | `src/app/page.tsx` | Home keeps default Tailwind sizes, not DESIGN.md tokens | low | defer | Classes predate this change (only the tag changed); story 2 rebuilds Home. |
| 4 | `src/components/site-header.tsx` | Comment says "Fixed" but header is sticky | low | patch | Class list uses `sticky`. Direct correction. |
| 5 | `e2e/home.spec.ts` | 480px breakpoint not tested at its edge | low | patch | Tests run at 400px and 1280px only; `min-[480px]` switch unpinned. |
| 6 | `e2e/home.spec.ts` | Offline test does not build offline | false | reject | Matrix row is runtime "Network blocked except localhost", which the test covers; no `next/font/google` or Google Fonts reference remains in `src` or `next.config.ts`. |
| 7 | `src/components/icons/icons.test.tsx` | Title says DESIGN.md lists 28 icons; it lists 27 | low | patch | DESIGN.md Icons lists 27; `info` comes from Notice. Rename only. |

## Design Notes

Header: `sticky top-0 z-40 h-16 md:h-[100px] bg-neutral/80 shadow-[0_0_4px_rgba(0,0,0,0.1)] [@media(max-height:499px)]:static`. Sticky rather than fixed keeps the content in normal flow, so no padding offset is needed, and it reads the same as DESIGN.md's "fixed over the page". Two logo images are toggled with `hidden min-[480px]:block` and `min-[480px]:hidden`, both `alt=""`, inside one `<Link href="/" aria-label="CheckInn home">`. Small links are white and underlined, Gold on hover (DESIGN.md Link).

## Verification

**Commands:**
- `npm run lint && npm run typecheck && npm test && npm run build` -- expected: all green.
- `npm run test:e2e` -- expected: all specs pass on both chromium and mobile.
- `npm run design:lint` -- expected: passes.
