---
input: ../../../DESIGN.md
spines: DESIGN.md, EXPERIENCE.md, .memlog.md
reconciled: 2026-10-15
---

# Reconcile: root DESIGN.md vs Smart search DESIGN delta

## Rule check

| Root rule | Root location | Delta | Verdict |
|---|---|---|---|
| One primary button per screen | Components, Primary button; Do's | Submit is an `icon-button`; Search stays primary | Holds |
| Gradient on at most one phrase per screen, clipped to text | Colors, Secondary; Typography, Display; Do's | Gradient moved to a 2px box border | **Changes a root rule** (G1) |
| No shadows | Elevation & Depth; Don'ts | No shadows, glows or shimmer | Holds |
| Gold only for hover and focus | Colors, Tertiary; Don'ts | Chip hover border, focus ring; box hover unchanged | Holds |
| Brand Blue text only at 24px+ (19px bold) | Colors, Primary; Don'ts | No Brand Blue text added | Holds (weak-match heading style unnamed, G4) |
| Every separate surface has a border | Overview; Elevation; Do's | Box, chips, notices, breakdown all bordered | Holds, but breakdown uses Outline (G3) |
| Do not mix pill and 4px buttons in one view | Shapes | Chips and submit are `full`; no 4px buttons | Holds |
| Uppercase labels via CSS, sentence-case source | Typography, Labels | Chips `label-md`, "Why it matches" `label-sm`, both CSS uppercase | Holds |
| Night Blue never the only cue | Colors, Primary subtle | Skeleton line is Night Blue, as the root skeleton | Holds |
| Skeleton 12px radius, shape of content | Components, Skeleton | `match-reason-skeleton` at `{rounded.sm}` | Deliberate, stated deviation |
| Prices "R 4 900" with non-breaking spaces | Typography | "Max R 2 000 per night" with NBSPs | Holds |

**Token references.** Every `{token}` in the delta frontmatter and prose resolves in the root: `colors.surface`, `on-surface`, `on-surface-muted`, `primary`, `primary-subtle`, `secondary`, `tertiary`, `outline`; `typography.body-md`, `body-sm`, `input-mobile`, `label-md`, `label-sm`; `rounded.sm`, `md`, `full`; `spacing.xs`, `sm`, `md`, `lg`. Root components named in prose (`icon-button`, `focus-ring`, `chip`, `notice`, `divider`, `skeleton`) exist. `spinner` is new and defined in the delta. No broken references.

## Gaps

### G1. The gradient border changes a root rule but is not declared as a change

- **Source:** root Colors, Secondary ("the end stop of the headline gradient … clipped to text. Use it for one emphasised phrase per screen and for thin accent rules"); Do's ("Do use the gradient on at most one phrase per screen"); Overview ("The only change to a root rule is that mobile body text stays at 15px"); Don'ts ("Don't use Gold or Cyan as a fill for large areas").
- **Spine:** delta Colors ("The gradient moves to the Smart search box"; "One gradient per screen still holds").
- **Problem:** the root only permits the gradient clipped to text (one phrase) or as a thin Cyan accent rule. A 2px gradient border around a full-width 56px field is a third, new use. The delta frames it as "one gradient per screen still holds", which re-reads "phrase" as "gradient", rather than saying it amends the root rule. It also ignores the logo, whose "nn" carries the same gradient in the header on every screen, so "Search results has no other gradient" is only true if the logo is exempt, which the root never states.
- **Fix:** add an explicit line to the delta Brand & Style: "This delta amends one root rule: the blue-to-cyan gradient may be a 2px border on the Smart search box instead of a text phrase; the one-per-screen limit counts this border, and the logo is exempt." Propose the same wording for the root Colors, Secondary bullet when the delta merges.

### G2. Label colour claim contradicts the root Search bar

- **Source:** root Components, Search bar ("Each field has a small muted `body-sm` label above its value"); Input ("a visible `body-sm` label above it").
- **Spine:** delta Typography ("The label 'Describe your stay' is `{typography.body-sm}` in white, like the Search bar field labels"); frontmatter `smart-search-label.textColor: {colors.on-surface}`.
- **Problem:** the root Search bar labels are muted, not white, so "white, like the Search bar field labels" is wrong in one half. Either the label is meant to stand out (white, then drop "like the Search bar") or match (muted).
- **Fix:** choose one. If white is intended (the box label sits outside a container and introduces the feature), reword to "in white, unlike the muted Search bar field labels, because it labels the whole box". Otherwise set `smart-search-label.textColor` to `{colors.on-surface-muted}`.

### G3. Outline used as a surface border, and the submit's disabled look is unspecified

- **Source:** root Colors, Outline ("hairline dividers between list rows"); Elevation ("A 1px Brand Blue border marks a card…"); Components, Range calendar and Occupancy picker (disabled icon buttons show "the disabled-grey border and icon").
- **Spine:** delta frontmatter `score-breakdown-border` (`{colors.outline}`); Components, Score breakdown; Components, Smart search box (submit); EXPERIENCE Idle state ("The submit is `aria-disabled` while the box is empty").
- **Problem:** the root never uses Outline as a surface border; the delta adds that use without saying it extends the root. At #CED4DA on Midnight it is the brightest border on the card, so it draws more attention than guest content, the opposite of the stated intent. Separately, the submit is `aria-disabled` while the box is empty, but no visual disabled state is given; the root's precedent for a disabled icon button is the disabled-grey border and icon.
- **Fix:** either use `{colors.on-surface-disabled}` for the breakdown border (quieter, still separate from Brand Blue guest content) or state that Outline is extended to debug surfaces. Add `smart-search-submit-disabled` (border and icon `{colors.on-surface-disabled}`, no Gold hover), matching the root disabled icon button.

### G4. Weak-match heading has no named style

- **Source:** root Typography, Headlines; Colors, Primary (Brand Blue text only at 24px+); Layout, Search results ("a result count headline").
- **Spine:** delta Components, Notices ("the Search results heading itself says it, in the root heading style"); EXPERIENCE Weak match (Query truncated to 60 characters).
- **Problem:** "the root heading style" names no token. The heading can reach about 85 characters ("No strong matches for ‘…60 chars…’"), so at `headline-lg` it wraps to two or three lines on the projector and pushes the first card down, against the Projector check. If anyone styles it like the Home accent headline, Brand Blue at `headline-lg-mobile` (22px) breaks the 24px rule.
- **Fix:** name it: "`headline-lg` (`headline-lg-mobile` on phone) in white `{colors.on-surface}`, as the result-count headline". Add the weak-match screen to the Projector check, or shorten the Query cut-off to keep the heading to two lines at 1280 × 720.
