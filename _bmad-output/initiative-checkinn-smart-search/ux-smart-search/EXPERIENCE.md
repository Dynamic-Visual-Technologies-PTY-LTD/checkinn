---
status: draft
updated: 2026-10-15
name: CheckInn Smart Search
sources:
  - .memlog.md
  - .working/source-digest.md
  - ../prd-smart-search/prd-smart-search.md
  - DESIGN.md
  - ../../../DESIGN.md
  - ../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md
---

# CheckInn Smart Search: Experience delta

Workshop defaults accepted by the user on 2026-10-15; tune freely during the build.

## Foundation

This spine extends the MVP `EXPERIENCE.md` (`../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md`). It specifies only the behaviour Smart search adds or changes. **Everything not stated here behaves as the MVP spine says**: voice, formats, states, focus rules, live-region rules, breakpoints, banned patterns and the Accessibility Floor.

- **Visual reference.** `DESIGN.md` in this folder is the visual delta on top of the root `DESIGN.md`. Tokens are cross-referenced as `{components.smart-search-box}` and so on.
- **Terms.** Product terms follow the Smart search PRD Glossary exactly: Smart search, Smart search box, Query, Query interpretation, Hard criteria, Max price, Policy criteria, Criteria chip, Preferences, Relevance, Strong match, Ranking blend, Best-fit room, Match reason, Provider. MVP terms keep their MVP meaning.
- **References.** FR and UJ numbers refer to `prd-smart-search.md`. "MVP FR-n" refers to the MVP PRD.
- **Off switch.** With no Provider configured, the Smart search box is not rendered and nothing in this spine applies (FR-2). Smart search parameters in a URL are then ignored, and the page is the MVP page.
- **One order.** Guests never choose the Ranking blend. There is no sort, ranking or blend control in the UI (user decision, FR-11).

## Information Architecture

No new surfaces. Smart search changes three existing ones.

| Surface | Change | PRD |
|---|---|---|
| Home | The Smart search box sits in the hero above the Search bar. The hero headline loses its gradient while the box is shown. | FR-1 |
| Search results | The Smart search box sits above the Search bar. The Criteria chip row sits under the Search bar, then any notices, then the result-count headline. Listing cards gain the Match reason and the Best-fit room line. | FR-1, FR-4, FR-14, FR-15 |
| Hotel page | Opened from a Smart search card, the room table starts with the Best-fit room pre-selected and marked "Best fit for your search". | FR-14 |

- **The box is not on the Hotel page or booking steps** (PRD §6.2: Smart search inside the room table is deferred).
- **Smart search state lives in the URL** (FR-3), alongside the MVP criteria: Rooms, Max price, Policy criteria, Preferences, and the Query text, which is used only to refill the box. Reload, Back and a shared link reproduce the view without re-running Query interpretation.
- **Page titles** are unchanged from the MVP. The Query is never put in the page title.

## Voice and Tone

The MVP voice applies: warm, plain South African English, what happened and then what to do, no exclamation marks. Smart search adds one rule: **never talk about the machinery**. No "AI", "magic", "model" or "thinking" in guest copy. The only place the feature names itself is the fallback notice.

| Do | Don't |
|---|---|
| "Describe your stay" (box label) | "Ask AI anything" |
| "Try: quiet hotel with a pool in Cape Town this weekend" (placeholder) | "Type your prompt here…" |
| "Reading your search…" (submitting) | "AI is thinking…" |
| "Why it matches" (Match reason label) | "AI summary", "Generated for you" |
| "Max R 2 000 per night" (Criteria chip) | "Max R2,000 / night" |
| "Pets allowed" (Criteria chip) | "pets: true" |
| "We don't have hotels in Kruger, so we're showing all cities." | "Unknown location." |
| "We couldn't use 'last Tuesday', so check your dates." | "Invalid date ignored." |
| "No strong matches for ‘ski chalet with a fireplace’" (heading), then "Try describing it another way." | "0 results above threshold." |
| "Smart search isn't available right now, so these results are in the usual order." | "Error: Provider timeout." |
| "Family Room · 1 room · sleeps 4" | "Recommended room for you!" |

The notice copy above for unknown place, ignored value and fallback, and the weak-match heading copy, are decided. The unknown-place and ignored-value lines follow the PRD examples (FR-4).

**Formats.** As the MVP: "R 2 000" with non-breaking spaces, "Fri 23 Oct 2026" dates. Accessible names of prices follow the MVP spoken form, so "Remove Max R 2 000 per night" is read as "Remove Max 2 000 rand per night".

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md` Components under the same names.

| Component | Used on | Behavioural rules |
|---|---|---|
| Smart search box | Home, Search results | A visible label "Describe your stay" tied to the field. One line that grows to two, then scrolls inside itself; Enter submits and never adds a new line. Input stops at 300 characters (FR-1). An empty or whitespace-only Query cannot be submitted: Enter does nothing and the submit is `aria-disabled`, still focusable. On Search results the box shows the submitted Query from the URL. Stay and Party keep their Search bar values unless the Query states them; Destination, Max price and Policy criteria start empty for each new Query (FR-4). |
| Smart search submit | Smart search box | An `icon-button` named "Search by description", so it is not confused with the Search bar's Search. Pressing it is the same as Enter. |
| Smart search clear | Smart search box | The × appears only when there is text. Named "Clear description". It empties the box and keeps focus in it. It does not re-run the search; the next Search bar Search then runs the MVP search without Preferences, Max price or Policy criteria (FR-5). |
| Character counter | Smart search box | Appears from 250 characters, reads "250 / 300", and is tied to the field with `aria-describedby`. On reaching 300, a polite announcement says "300 of 300 characters, the limit". |
| Search bar (changed) | Home, Search results | Behaves as the MVP. While a Query is in the URL, its Search re-runs Smart ranking with that Query's Preferences, without a new Query interpretation (FR-5). Text typed in the Smart search box but not submitted is not used by the Search bar. If the box has been cleared, Search runs the MVP search and drops Preferences, Max price and Policy criteria. |
| Criteria chip | Search results, under the Search bar | One chip per Max price or Policy criterion, in the order Max price, then Policy criteria. Each is a `button` with visible text and a ×, named "Remove Max R 2 000 per night" or "Remove Pets allowed" (PRD §9). Activating it pushes a new URL without that criterion and re-runs the search with the same Preferences (FR-5). Focus moves to the next chip, to the previous one if it was the last, or to the Smart search box if none are left. The new result count is announced politely ("Stellenbosch: 3 properties found"). |
| Notice (Smart search) | Search results, between the chips and the headline | The MVP `notice`: display only, not dismissible, never takes focus. At most two show, in this priority: fallback, unknown place, ignored value. A weak match is never a notice; the Search results heading says it (see Weak match). The headline references the notices with `aria-describedby`, so they are read when focus lands on it. |
| Listing card (changed) | Search results | Under Smart search the price block starts with the Best-fit room line, and the price is that room's price for the Rooms shown, with no "from" (FR-14). "sleeps N" is the total across the Rooms shown. The card stays one link named after the hotel; the Match reason and Best-fit room line are plain text inside it. |
| Match reason | Listing card, under the hotel name | Appears only when the Query has Preferences and the fallback is not in force (FR-10, FR-2). Starts as the "Why it matches" label over a one-line skeleton (user decision). The reason replaces the skeleton when it arrives. If it fails, is rejected or times out at 5 s, the label and skeleton are removed and the card shows no reason and no message (FR-15). |
| Best fit chip | Hotel page room table | Display only. Shown on the pre-selected row when the Hotel page is opened from a Smart search card. It stays on that row if the Guest changes the selection (user decision). |
| Room table (changed) | Hotel page | Opens with the Best-fit room and its number of Rooms selected, the booking summary already showing them, and Reserve enabled if the Party fits (FR-14). Focus still goes to the hotel name. Max price is not enforced here. If the Best-fit room is no longer available, nothing is pre-selected, no chip shows and the MVP room table applies. |
| Score breakdown | Listing card, debug flag only | A table with caption "Score breakdown" and rows: Relevance (meaning, exact words), Review score signal, Price signal, Ranking blend score, each to two decimals (FR-20). Display only, outside the tab order. Never turned on by a URL. |

## State Patterns

MVP states apply unchanged. Smart search adds the states in **Smart search states** below.

## Smart search states

Every state the Smart search box and its results can be in.

| State | Surface | Treatment |
|---|---|---|
| Provider not configured | Home, Search results | The box is absent. No message. Home keeps its gradient headline. Every page is the MVP page (FR-2). |
| Idle | Home, Search results | The label, the placeholder (Home) or the submitted Query (Search results), and the search icon. The submit is `aria-disabled` while the box is empty. |
| Typing | Smart search box | The × appears. The submit becomes enabled once there is non-space text. The counter appears from 250 characters. Nothing runs until submit. |
| Submitting | Smart search box, Search results | The text is read-only, the submit shows the spinner, and "Reading your search…" shows under the box and is announced through a polite live region. On Search results the listing is replaced by the MVP's three skeleton cards. On Home the page stays as it is until navigation. The Search bar is read-only for those up to 2.5 s, so it cannot race the Query. |
| Results | Search results | CheckInn navigates to the Search results URL (FR-3). The Search bar shows the interpreted Destination, Stay and Party, the chips show Max price and Policy criteria, and the box shows the Query. Focus goes to the result-count headline, as in the MVP. Cards are in Ranking blend order (FR-11). |
| Results with notices | Search results | As Results, with up to two notices between the chips and the headline. Unknown place: Destination stays empty, the headline is "All destinations: N properties found", and the notice names the place (FR-4). Ignored value: the value is not applied and the notice names it (FR-4). |
| Weak match | Search results | No Hotel is a Strong match. The Search results heading itself says so: "No strong matches for ‘ski chalet with a fireplace’". The Query sits in curly quotes and is truncated to 60 characters with an ellipsis (…). One short line under the heading reads "Try describing it another way." The closest Hotels are listed under it in Ranking blend order, each with an honest Match reason (FR-10). There is no weak-match notice. Focus goes to the heading after navigation, as in the MVP (user decision). |
| No Preferences | Search results | A Query with only Hard criteria. No weak-match heading, no Match reason label or skeleton. The Best-fit room line still shows (FR-10). |
| No results | Search results | No Hotel meets the Hard criteria. The MVP no-results state, with the Hard criteria named in the body: "Nothing matches that search." then "We looked for Pets allowed and Max R 2 000 per night in Stellenbosch. Remove a filter, or try other dates or another city." The chips stay so they can be removed; the city tiles show below (FR-10, MVP FR-8). |
| Fallback | Search results | Query interpretation timed out at 2.5 s, or the Provider failed or rate-limited. Results apply the Hard criteria already in the Search bar and chips, in MVP order. The notice reads "Smart search isn't available right now, so these results are in the usual order." No Match reasons and no skeletons. The box keeps the Query so the Guest can submit it again (FR-2). Reloading a fallback URL does not retry the Provider. |
| Reason loading | Listing card | "Why it matches" over the one-line skeleton (user decision). Pulse off under reduced motion. |
| Reason arrived | Listing card | The sentence replaces the skeleton. No layout shift beyond the line itself, because the skeleton reserved one line. |
| Reason failed | Listing card | Label and skeleton removed. No error text. Other cards are unaffected (FR-15). |
| Invalid Search bar input | Search bar | The MVP rule: Search does not run, a Coral message shows under the field, focus moves to it. Interpretation never produces this state, because invalid values are dropped with a notice instead (FR-4). |

## Interaction Primitives

- **Submit.** Enter in the box or the submit button. Enter never inserts a line break. On phone the keyboard's action key reads "Search" (`enterkeyhint`).
- **Navigation.** Submitting a Query pushes a new Search results URL. Back returns to the previous Search results state, with its Query in the box (FR-3). Removing a chip and changing a Search bar field each push a new URL, as MVP criteria changes do.
- **Focus.**
  - After a Query is submitted: the Search results heading (the result count, or the weak-match heading), as in the MVP.
  - After a chip is removed: the next chip, the previous chip, or the box (see Component Patterns).
  - After the × clear: stays in the box.
- **Tab order** on Search results: Smart search box, its clear and submit, the Search bar, the Criteria chips, then the results.
- **Streaming.** Match reasons fill in place after the results. Nothing reorders or moves when they arrive.
- **Motion.** The spinner rotates; the skeleton pulses; both stop under reduced motion. The gradient border never animates.
- **Banned (adds to the MVP list):**
  - a sort, ranking or blend control of any kind (user decision)
  - sparkles, glows, typing effects or animated gradients (user decision)
  - a chat, follow-up questions or a summary answer above the results (PRD §5, §6.2)
  - autocomplete or suggestion lists under the box (PRD §5)
  - horizontally scrolling chip rows

## Accessibility Floor

The MVP floor applies in full: WCAG 2.1 AA, visible labels, 44px targets, the Gold focus ring, reflow at 320px, no meaning by colour alone. Smart search adds:

- **Label.** "Describe your stay" is a real `label`. The placeholder is an example, never the label (FR-1).
- **Status while submitting.** "Reading your search…" is announced once through a polite live region. Focus does not move until navigation.
- **Headline after navigation.** Focus goes to the result-count headline. Notices above it are its accessible description, so a screen reader reads "Stellenbosch: 1 property found" followed by any notice. Under a weak match the heading itself carries the message: "No strong matches for ‘ski chalet with a fireplace’".
- **Criteria chips.** Real buttons, each named "Remove" plus its text, at least 44 × 44px including the ×. The × icon is decorative. The row is a list labelled "Your filters".
- **Match reasons.** Arriving reasons are not announced one by one. A single polite live region says "Match reasons added" once, after every card's reason has arrived, failed or timed out, and only if at least one arrived (FR-15).
- **Skeleton.** The one-line skeleton is hidden from assistive tech; the card reads as if the reason were absent until it arrives.
- **Gradient.** The gradient border is decorative; the box is identified by its label. In forced-colours mode it falls back to a solid border (`DESIGN.md` Colors).
- **Counter.** Tied to the field with `aria-describedby`; the limit is announced once.
- **Score breakdown.** A real table with a caption and header cells.

## Responsive & Platform

Breakpoints are the MVP's. Visual layout is in `DESIGN.md` Layout & Spacing.

| Width | Behaviour |
|---|---|
| ≥ 1024px (desktop, projector) | Box and Search bar full container width, stacked. Chips in one row, wrapping if needed. |
| 768–1023px (tablet) | As desktop. |
| < 768px (phone) | The box is always visible, full width, at the top of Search results. The collapsed Search bar summary sits under it and expands on tap as in the MVP; the chips sit under the summary and wrap (user decision). On Home the box sits above the stacked Search bar fields. |

**Projector check.** At 1280 × 720 and 125% zoom, the box, the Search bar, one row of chips and the first Listing card's name and Match reason fit above the fold.

## Inspiration & Anti-patterns

- **Kept from the MVP:** the Search bar as the visible, editable record of what was understood. Smart search writes into it rather than hiding its reading of the Query.
- **Rejected: AI sparkle and "AI" labels.** The feature should feel like CheckInn search, not a bolted-on assistant (user decision).
- **Rejected: a sort or ranking toggle.** One Ranking blend is chosen in the workshop; guests never choose (user decision).
- **Rejected: a chat or answer box.** One Query, one ranked list (PRD §2.2, §5).

## Key Flows

Flows 1–3 mirror PRD UJ-1 to UJ-3. Dates assume today is Thu 15 Oct 2026.

### Flow 1: Thandi finds a home for the family and the dog (UJ-1)

1. Thandi opens CheckInn on her phone. Home shows "Describe your stay" above the Search bar.
2. She types "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night" and taps the keyboard's Search.
3. The box turns read-only and "Reading your search…" appears under it.
4. Search results load. The box still shows her words. The collapsed summary reads "Stellenbosch · 23–25 Oct · 4 adults", and two chips sit under it: "Max R 2 000 per night" and "Pets allowed".
5. Focus is on "Stellenbosch: 1 property found". Winelands Family Lodge is the only card. "Why it matches" holds a skeleton line for a moment, then reads "Pets allowed, a children's play area and family rooms that sleep 4." The price block starts "Family Room · 1 room · sleeps 4".
6. She taps the card. The Hotel page room table opens with Family Room set to 1 and marked "Best fit for your search". The bottom bar already reads "1 room · R 4 000,00 · Reserve".
7. **Climax:** she taps Reserve without having picked a room herself. CheckInn understood the dog, the kids and the budget from one sentence.

**Edge case: editing the Party.** "For 4" was read as 4 adults. Thandi taps the summary, opens Occupancy, sets 2 adults and 2 children, and taps Search. The results re-run with the same Preferences and chips, and no new interpretation (FR-5). Winelands Family Lodge stays, its Family Room still fits, and her Query is still in the box.

**Failure: fallback.** The Provider is slow. After 2.5 s the results show the Hard criteria already in the Search bar, in the usual order, with "Smart search isn't available right now, so these results are in the usual order." She can submit the same Query again from the box.

### Flow 2: Sipho finds a quiet place to work (UJ-2)

1. On his laptop, Sipho's Search bar already has his dates. He types "quiet business hotel in Gauteng with a gym and meeting rooms" and presses Enter.
2. Results: "Gauteng: 4 properties found". No chips, because the Query has no Max price or Policy criteria.
3. Jacaranda Garden Hotel is first: "Why it matches: Quiet workspaces, a gym and meeting rooms." Goldleaf Business Hotel is second. Its reason mentions the gym and meeting rooms and does not claim "quiet" (FR-16).
4. A screen-reader user would hear "Match reasons added" once, when the last reason settles.
5. **Climax:** he can see why the order is right without a sort control. The reasons tell him Jacaranda is the quiet one, and he opens it and books.

**Edge case: presenter view.** With the debug flag on, each card ends with the score breakdown, so the presenter can show that Relevance put Jacaranda first despite Goldleaf's higher Review score.

### Flow 3: Lerato asks for something CheckInn doesn't have (UJ-3)

1. Lerato types "ski chalet with a fireplace" and submits.
2. Results: the heading reads "No strong matches for ‘ski chalet with a fireplace’", with "Try describing it another way." under it and the closest Hotels listed below. Focus lands on the heading.
3. Each card has an honest Match reason that says what does fit and does not stretch to "ski" (FR-16).
4. She selects the box, which still holds her Query, clears it with ×, and types "cosy weekend retreat in the winelands".
5. **Climax:** the new results come back under a normal result-count heading, and the Winelands Hotels show reasons about relaxed stays. CheckInn told her the truth the first time and helped her find the right words the second.

**Failure: no results.** Had she added "under R500 a night", no Hotel would meet the Hard criteria. She would see "Nothing matches that search." naming the Max price, with the "Max R 500 per night" chip ready to remove.
