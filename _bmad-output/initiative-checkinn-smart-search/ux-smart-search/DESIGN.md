---
version: alpha
status: draft
updated: 2026-10-15
name: CheckInn Smart Search
description: >-
  Visual delta for Smart search on top of the CheckInn identity in the root
  DESIGN.md. Only new or changed tokens are listed here; every reference such
  as {colors.primary} resolves against the root file.
sources:
  - .memlog.md
  - .working/source-digest.md
  - ../prd-smart-search/prd-smart-search.md
  - ../../../DESIGN.md
  - ../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md
# No new colors, typography, rounded or spacing tokens. Smart search uses the
# root scales unchanged. Only components are added or changed.
components:
  smart-search-box:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs}"
    height: 56px
  smart-search-box-mobile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.input-mobile}"
    rounded: "{rounded.md}"
    padding: "{spacing.xs}"
    height: 56px
  smart-search-box-border-start:
    backgroundColor: "{colors.primary}"
    width: 2px
  smart-search-box-border-end:
    backgroundColor: "{colors.secondary}"
    width: 2px
  smart-search-label:
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  smart-search-placeholder:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-md}"
  smart-search-counter:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  smart-search-status:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  spinner:
    textColor: "{colors.on-surface}"
    size: 20px
  criteria-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: "{spacing.md}"
    height: 44px
  criteria-chip-border:
    backgroundColor: "{colors.primary}"
    width: 1px
  criteria-chip-border-hover:
    backgroundColor: "{colors.tertiary}"
    width: 1px
  match-reason-label:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-sm}"
  match-reason:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-md}"
  match-reason-skeleton:
    backgroundColor: "{colors.primary-subtle}"
    rounded: "{rounded.sm}"
    height: 24px
  best-fit-room:
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
  score-breakdown:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  score-breakdown-border:
    backgroundColor: "{colors.outline}"
    width: 1px
---

# CheckInn Smart Search: Design delta

Workshop defaults accepted by the user on 2026-10-15; tune freely during the build.

## Brand & Style

This file extends the root `DESIGN.md` (`../../../DESIGN.md`). It does not restate it. Every token, rule and component in the root still applies, and **the root wins for anything this file does not state**. References such as `{colors.primary}` and `{typography.label-md}` resolve against the root tokens. Linted on its own, this file reports those references as broken; merged into the root frontmatter, it lints with no errors or warnings.

Smart search should look like CheckInn, not like a bolted-on AI product. It keeps the flat blue-on-dark look, the Poppins type and the bordered surfaces. The one new visual signal is the blue-to-cyan gradient the brand already owns, used on the border of the Smart search box. There is no sparkle, glow, shimmer, robot or "AI" badge anywhere (user decision).

When no Provider is configured, the Smart search box is not rendered and every screen looks exactly as the root `DESIGN.md` describes.

## Colors

No new colors. The changes are in where the existing ones are used.

- **The gradient moves to the Smart search box.** The box has a 2px border in the root gradient `linear-gradient(to right, #007FBA, #00D2D6)`, from `{colors.primary}` (`smart-search-box-border-start`) to `{colors.secondary}` (`smart-search-box-border-end`) (user decision). The linter has no gradient value, so the two stops are tokenised as two border components and the prose is the rule.
- **One gradient per screen still holds.** The shipped Home hero ("Find your stay." in Brand Blue, `src/app/page.tsx`) has no gradient line, even though the root `DESIGN.md` allows one, so the box border is Home's one gradient. If a gradient second line is ever added to the hero, it is set in white `{colors.on-surface}` whenever the Smart search box shows (user decision). Search results has no other gradient, so the box border is its one gradient.
- **Contrast of the border.** Both stops pass the 3:1 non-text rule against Midnight: Brand Blue at 4.43:1, Cyan well above it. The border is legible along its whole length.
- **Forced colours.** Gradients disappear in Windows forced-colours mode, so the box falls back to a solid 2px system border there.
- **Muted text for supporting Smart search copy.** The Match reason, the Best-fit room line, the counter and the status text use `{colors.on-surface-muted}`, so they never compete with the hotel name or price.
- **No Gold at rest.** Gold `{colors.tertiary}` stays hover and focus only, including on Criteria chips.

## Typography

No new type tokens. Smart search uses existing roles:

- The Smart search box text is `{typography.body-md}` on desktop and `{typography.input-mobile}` on phone, so the browser does not zoom on focus.
- The label "Describe your stay" is `{typography.body-sm}` in white, like the Search bar field labels but outside the box.
- Criteria chips use `{typography.label-md}`, uppercase through CSS like every chip. The source string stays sentence case: "Max R 2 000 per night".
- The "Why it matches" label is `{typography.label-sm}`, uppercase through CSS. The Match reason under it is `{typography.body-md}`.
- The Best-fit room line and the score breakdown are `{typography.body-sm}`. The breakdown is not monospace.

## Layout & Spacing

Root scale and breakpoints unchanged. Smart search adds these placements:

- **Home.** Inside the hero: headline, lead, then the label and Smart search box, then the Search bar, both across the full container width. `{spacing.md}` (15px) between the box and the Search bar.
- **Search results, desktop and tablet.** Top to bottom: Smart search box, Search bar, the Criteria chip row, any notices, then the result-count headline and Listing cards. `{spacing.md}` between box, bar and chip row; `{spacing.sm}` (8px) between chips; `{spacing.lg}` (25px) above the headline.
- **Search results, phone.** The Smart search box is always visible, full width, at the top. The collapsed Search bar summary line sits under it, then the chips, which wrap onto more lines rather than scrolling sideways (user decision for the box, summary and chips order).
- **Box height.** A minimum of 56px with one line, growing to two lines of text before it scrolls inside itself. Heights are minimums, as in the root.
- **Listing card additions.** The Match reason block sits directly under the hotel name (user decision). The Best-fit room line sits in the price block, above the stay summary and total. The score breakdown, when on, sits at the bottom of the card across its full width.

## Shapes

- The Smart search box uses `{rounded.md}` (12px), matching the Search bar under it, so the two read as one search area.
- Criteria chips are `{rounded.full}` pills like every chip.
- The Match reason skeleton is a single line at `{rounded.sm}`, because a 12px radius on a 24px line reads as a pill.
- The score breakdown table uses `{rounded.sm}`, which marks it as a small tool rather than guest content.

## Components

Components not listed here are unchanged from the root. Behaviour for each is in `EXPERIENCE.md` under the same name.

- **Smart search box.** A `{colors.surface}` field with the 2px blue-to-cyan gradient border and a 12px radius. Anatomy, left to right:
  - a 20px search (magnifier) icon from the root icon set, decorative
  - the text area, one line growing to two, with the placeholder "Try: quiet hotel with a pool in Cape Town this weekend" in `smart-search-placeholder`
  - a clear (×) `icon-button`, shown only when there is text
  - the submit, an `icon-button` (44px circle, 2px Brand Blue border, white search icon). It is not a second primary button; the Search bar's Search stays the one primary on the screen.

  The visible label "Describe your stay" sits above the box. The gradient is on the border only, never on the label or the text (user decision for the gradient border). Focus: the root Gold `focus-ring` with its 2px offset goes around the whole box while the text area has focus, outside the gradient. Hover: no change; the gradient border does not turn Gold.
- **Character counter.** "250 / 300" in `smart-search-counter`, right-aligned under the box. It appears only from 250 characters.
- **Submitting.** The text turns read-only and keeps its colour. The submit `icon-button` swaps its search icon for a 20px `spinner`, a new icon in the root's line style (1.5px stroke, rounded caps, a three-quarter circle). "Reading your search…" shows under the box in `smart-search-status`. Under reduced motion the spinner does not rotate. The gradient border never animates.
- **Criteria chip.** A new removable chip, distinct from the display-only Facility `chip` (user decision). A button styled as a pill: `{colors.surface}` fill, 1px Brand Blue border (`criteria-chip-border`), uppercase `label-md` text, then a 20px close (×) icon. Minimum height 44px, 15px horizontal padding. On hover the border turns Gold (`criteria-chip-border-hover`), like an icon button. Copy for price is "Max R 2 000 per night" with non-breaking spaces, so the amount never wraps (user decision).
- **Notices.** Smart search uses the root `notice` unchanged: Midnight card, 1px Brand Blue border, info icon, not dismissible. At most two stack, `{spacing.sm}` apart. A weak match is not a notice; the Search results heading itself says it, in the root heading style.
- **Match reason.** Under the hotel name on a Listing card: the label "Why it matches" in `match-reason-label`, then one line in `match-reason`. No icon and no AI label (user decision). While it loads, a single `match-reason-skeleton` line holds its place under the label, using the root skeleton pulse, off under reduced motion (user decision).
- **Best-fit room line.** "Family Room · 1 room · sleeps 4" in `best-fit-room`, at the top of the price block. Under Smart search the price below it is the Best-fit room's price.
- **Best fit chip (Hotel page).** The pre-selected row in the room table shows the root display-only `chip` reading "Best fit for your search" beside the Room type name. It stays on that row if the Guest changes the selection (user decision). No new token.
- **Score breakdown.** Shown only with the server debug flag. A small table at the bottom of each Listing card: `score-breakdown` fill and text, a 1px Outline border (`score-breakdown-border`), `{rounded.sm}` corners, rows divided by the root `divider`. Outline rather than Brand Blue keeps it visually apart from guest content.

## Do's and Don'ts

- Do keep one gradient per screen: on Home with Smart search, the box border carries it and the hero headline goes plain.
- Do keep the Search bar's Search as the only primary button. The Smart search submit is an icon button.
- Do write prices in chips as "Max R 2 000 per night" with non-breaking spaces.
- Do keep Match reasons, the Best-fit room line and Smart search status text muted.
- Don't use sparkles, glows, shimmer, robot icons, "AI" badges or animated gradients anywhere in Smart search.
- Don't put the gradient on the label, the placeholder or the typed text.
- Don't style a Criteria chip like a Facility chip without its × icon; a removable chip must look removable.
- Don't add a sort, ranking or blend control. There is no visual for one (user decision).
- Don't show the score breakdown without the server debug flag.
