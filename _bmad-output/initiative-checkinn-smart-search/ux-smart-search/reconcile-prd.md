---
input: ../prd-smart-search/prd-smart-search.md
spines: DESIGN.md, EXPERIENCE.md, .memlog.md
reconciled: 2026-10-15
---

# Reconcile: Smart search PRD vs UX spines

## Coverage summary

| PRD item | Surface | State | Copy | Verdict |
|---|---|---|---|---|
| FR-1 box placement, label, placeholder, Enter, empty, 300 cap | EXP Component Patterns: Smart search box | Idle, Typing | Label, placeholder, counter | Covered |
| FR-2 hidden without Provider, fallback | EXP Foundation, Smart search states | Provider not configured, Fallback | Fallback notice | Covered, but see G2 |
| FR-3 URL state, Back, reload | EXP IA, Interaction Primitives | Results | n/a | Covered for Search results, not for the Hotel page (G3) or fallback (G2) |
| FR-4 Hard criteria, unknown place, invalid value | EXP Results with notices | Results with notices | Kruger, 'last Tuesday' | Covered; Children/Smoking chip copy missing (G6) |
| FR-5 corrections | EXP Search bar (changed), Criteria chip, Smart search clear | n/a | n/a | Covered, but see G4 |
| FR-6 | Not guest-facing (server check) | n/a | n/a | n/a |
| FR-7 to FR-9 | Not guest-facing | n/a | n/a | n/a |
| FR-10 weak / no matches | EXP Weak match, No Preferences, No results | Yes | Heading, rephrase line, no-results body | Covered (G5 for PRD-internal conflict) |
| FR-11 no ranking control | EXP Foundation, Banned; DESIGN Do's | n/a | n/a | Covered |
| FR-12, FR-13 | Not guest-facing | n/a | n/a | n/a |
| FR-14 Best-fit room, pre-selection | EXP Listing card, Room table, Best fit chip; DESIGN Best-fit room line | Yes | "Family Room · 1 room · sleeps 4", "Best fit for your search" | Covered, but see G3 |
| FR-15 Match reason, streaming, 5 s timeout, polite | EXP Match reason, Reason loading/arrived/failed, A11y | Yes | "Why it matches" | Covered, but see G1 |
| FR-16 grounding | EXP Flow 2, Flow 3 | n/a | n/a | Covered (content rule, not UX) |
| FR-20 score breakdown | EXP Score breakdown; DESIGN Score breakdown | Debug only | Caption, rows | Covered |
| UJ-1 | EXP Flow 1 | Results, Fallback | Yes | Covered |
| UJ-2 | EXP Flow 2 | Results | Yes | Covered |
| UJ-3 | EXP Flow 3 | Weak match, No results | Yes | Covered |

PRD rules checked and **not contradicted**: 300-character cap (FR-1, §9), chip order Max price then Policy criteria (FR-4), Best-fit room pre-selection and "Max price not enforced on the Hotel page" (FR-14), no sort or ranking control (FR-11), no AI labelling, weak-match message in the heading (FR-10), no Match reasons and no weak-match message for a Query with no Preferences (FR-10), 2.5 s interpretation timeout and 5 s reason timeout (§9), score breakdown never via URL (FR-20), no chat, autocomplete or summary answer (§5, §6.2).

## Gaps

### G1. Match reason is "one line", but the PRD allows 120 characters

- **Source:** PRD FR-15 "the Match reason is at most 120 characters. Longer output is rejected, not truncated."
- **Spine:** DESIGN.md Components, Match reason ("then one line in `match-reason`"); DESIGN.md frontmatter `match-reason-skeleton` (one 24px line); EXPERIENCE.md Smart search states, Reason arrived ("No layout shift beyond the line itself, because the skeleton reserved one line").
- **Problem:** a 120-character sentence in `body-md` (15px) does not fit one line in a phone Listing card, nor in the narrower tablet card. It wraps to two or three lines, so the "no layout shift" promise fails exactly where the skeleton is meant to prevent it. The spine never says whether the reason wraps or is clamped, and clamping would contradict "rejected, not truncated".
- **Fix:** state that the Match reason wraps freely (never clamped or truncated). Either reserve two skeleton lines below 768px, or drop the "no layout shift" claim and say only that cards above do not move (reasons fill in place, cards may grow). Update Reason arrived and the Projector check accordingly.

### G2. Fallback: which Hard criteria apply, and what the URL holds, is undefined

- **Source:** PRD FR-2 "The results still apply every Hard criterion that was already known, in the MVP order"; FR-4 "Destination, Max price and Policy criteria start empty for every new Query"; FR-3 "The URL is the only source of truth".
- **Spine:** EXPERIENCE.md Smart search states, Fallback ("Results apply the Hard criteria already in the Search bar and chips… Reloading a fallback URL does not retry the Provider"); Flow 1 Failure.
- **Problem:** on a second Query from Search results, the previous Destination and chips belong to the old Query. The spine keeps them ("already in the Search bar and chips"), while FR-4 says a new Query starts with them empty, so it is unclear whether the Guest sees the old Stellenbosch pet-friendly results under a new Query. On a first Query from Home there are no chips and possibly no Destination, so the fallback is the default search ("All destinations: 12 properties found"); the spine does not say so. It also says a fallback URL is reloadable without retrying, which implies a fallback marker and a URL shape (Query kept, no Preferences) that neither FR-3 nor the spine lists.
- **Fix:** add one rule: on fallback, the URL holds the Search bar values from before the submit (Stay, Party, and Destination as it was), drops Max price and Policy criteria from the previous Query, keeps the Query text for the box, and carries a fallback marker so a reload does not retry. Name the Home-first-Query case and its heading. Add the fallback parameters to the URL list in IA.

### G3. Hotel page pre-selection has no URL state

- **Source:** PRD FR-14 "Opening the Hotel page from the card keeps the search criteria and pre-selects the Best-fit room and its number of Rooms"; FR-3 (state in the URL); §9 "Guest flows (… Best-fit room pre-selection …) are tested offline".
- **Spine:** EXPERIENCE.md IA table, Hotel page row ("Opened from a Smart search card…"); Component Patterns, Room table (changed) and Best fit chip.
- **Problem:** "opened from a Smart search card" is not something a reload, Back or shared link can know unless the Hotel page URL carries the Best-fit room and Rooms. The spine lists Smart search URL state only for Search results. It does not say what a reload or a shared Hotel page link does, nor whether the Best fit chip survives a reload, nor how this interacts with the MVP rule that room quantities replace URL state.
- **Fix:** state that the card link adds the Best-fit Room type and its number of Rooms to the Hotel page URL; that reload and a shared link reproduce the pre-selection and the chip; that a later quantity change replaces URL state as in the MVP while the chip stays on its row; and that Max price, Policy criteria and Preferences are not carried onto the Hotel page.

### G4. "Cleared" box vs "typed but not submitted" text

- **Source:** PRD FR-5 "Clearing the Smart search box and searching again removes Preferences, Max price and Policy criteria".
- **Spine:** EXPERIENCE.md Component Patterns, Search bar (changed) ("Text typed in the Smart search box but not submitted is not used by the Search bar. If the box has been cleared, Search runs the MVP search…") and Smart search clear.
- **Problem:** emptying the box with Backspace is also "text not submitted". One sentence says unsubmitted edits are ignored, the next says an emptied box changes what Search does. A Guest who edits the Query (not empties it) and presses the Search bar's Search gets the old Query's Preferences while the box shows different words, which breaks "the Search bar is the visible record of what was understood".
- **Fix:** define "cleared" as "the box is empty when Search is pressed, by × or by deleting the text". For edited but unsubmitted text, either restore the submitted Query in the box when Search runs, or show it as unchanged; say which.

### G5. Weak match: PRD SM-6 still says "notice"

- **Source:** PRD §11 SM-6 "The weak-match notice appears for every 'nothing fits' Golden query"; FR-10 "shows no weak-match notice".
- **Spine:** EXPERIENCE.md Smart search states, Weak match ("There is no weak-match notice"); DESIGN.md Notices; .memlog.md weak-match decision.
- **Problem:** the spine follows FR-10 (heading, user decision), but SM-6 and FR-10's "no weak-match notice" wording still describe a notice. An eval or e2e author reading SM-6 would look for a notice that does not exist.
- **Fix (PRD, not spine):** reword SM-6 and FR-10 to "the weak-match heading". Note it in the spine's Weak match row as the PRD term to align.

### G6. Copy and Glossary wording

- **Source:** PRD Glossary, Policy criteria (*Pets allowed*, *Children allowed*, *Smoking allowed*), Criteria chip; FR-2 notice ("Smart ranking is unavailable right now").
- **Spine:** EXPERIENCE.md Voice and Tone; Accessibility Floor, Criteria chips ("labelled 'Your filters'"); No results ("Remove a filter").
- **Problem:** only "Pets allowed" chip copy is given; "Children allowed" and "Smoking allowed" and their accessible names are not. Guest copy uses "filters" for Criteria chips; that is acceptable as friendlier UI text (MVP Foundation allows it) but is not stated as such. The fallback notice says "Smart search" where FR-2 says "Smart ranking"; the spine's wording is better but differs. "Best fit chip" (component name) drops the hyphen of the Glossary's "Best-fit room".
- **Fix:** list all three Policy chip strings and names. Add a line to Foundation, Terms: "'Your filters' and 'filter' are the guest-facing words for Criteria chips." Mark the fallback copy as replacing the FR-2 wording. Rename the component "Best-fit chip".
