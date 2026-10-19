---
status: final
updated: 2026-10-19
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

Workshop defaults accepted by the user on 2026-10-15, review fixes and user decisions applied on 2026-10-19; tune freely during the build.

## Foundation

This spine extends the MVP `EXPERIENCE.md` (`../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md`). It specifies only the behaviour Smart search adds or changes. **Everything not stated here behaves as the MVP spine says**: voice, formats, states, focus rules, live-region rules, breakpoints, banned patterns and the Accessibility Floor.

- **Visual reference.** `DESIGN.md` in this folder is the visual delta on top of the root `DESIGN.md`. Tokens are cross-referenced as `{components.smart-search-box}` and so on.
- **Terms.** Product terms follow the Smart search PRD Glossary exactly: Smart search, Smart search box, Query, Query interpretation, Hard criteria, Max price, Policy criteria, Criteria chip, Preferences, Relevance, Strong match, Ranking blend, Best-fit room, Match reason, Provider. MVP terms keep their MVP meaning. "Your filters" and "filter" are the guest-facing words for Criteria chips.
- **References.** FR and UJ numbers refer to `prd-smart-search.md`. "MVP FR-n" refers to the MVP PRD.
- **Off switch.** With no Provider configured, the Smart search box and the Example queries are not rendered and nothing in this spine applies (FR-2). Smart search parameters in a URL are then ignored, and the page is the MVP page.
- **One order.** Guests never choose the Ranking blend. There is no sort, ranking or blend control in the UI (user decision, FR-11).
- **Surfaces not mocked here** look as in `../../initiative-checkinn-mvp/ux-checkinn/mockups/`, for example the no-results state with city tiles and the three skeleton cards.

### Changes to MVP behaviour

This table lists the MVP UX rules this delta changes on purpose; PRD §8 lists the product-rule changes. Each change applies only while a Query is present.

| MVP rule (MVP `EXPERIENCE.md`) | Change under Smart search | Why |
|---|---|---|
| State Patterns, Loading results: "The search bar stays usable." | The Search bar is read-only while Query interpretation runs, for up to 2.5 s (see Submitting). | The Search bar cannot race the Query (user decision, FR-1). |
| Interaction Primitives: focus goes to the main headline after every URL change; live regions are only for updates in place. | After a Criteria chip is removed, focus stays in the chip row and the new result count is announced once through a polite live region. The headline is not focused. | The Guest is likely to remove another chip (user decision). |

## Information Architecture

No new surfaces. Smart search changes three existing ones.

| Surface | Change | PRD |
|---|---|---|
| Home | The Smart search box sits in the hero above the Search bar, with the Example queries under it. The hero stays as shipped: "Find your stay." in Brand Blue with no gradient, so the box border is Home's only gradient. | FR-1 |
| Search results | Top to bottom: the Smart search box, the Search bar, the Criteria chip row, the result heading (the result-count headline or the Weak-match heading), then any Notices, then the Listing cards. Notices come after the heading in both the DOM and the visual order. Listing cards gain the Match reason and the Best-fit room line. | FR-1, FR-4, FR-10, FR-14, FR-15 |
| Hotel page | Opened from a Smart search card, the room table starts with the Best-fit room pre-selected and marked by the Best-fit chip, "Best fit for your search". | FR-14 |

→ Composition reference: [Home with Smart search](mockups/key-home-smart.html) (box, Example queries, Submitting), [Smart search results](mockups/key-results-thandi.html) (UJ-1 results, Reason loading, Fallback with Try again), [Weak match and unknown place](mockups/key-results-weak.html) (Weak-match heading, Results with notices), [Hotel page with Best-fit room](mockups/key-hotel-bestfit.html) (pre-selection and Best-fit chip). **The spines win on conflict with any mock.**

- **The box is not on the Hotel page or booking steps** (PRD §6.2: Smart search inside the room table is deferred).
- **Smart search state lives in the URL** (FR-3), alongside the MVP criteria: Rooms, Max price, Policy criteria, Preferences, and the Query text, which is used only to refill the box. A fallback URL also carries a fallback marker (see Fallback). Reload, Back and a shared link reproduce the view without re-running Query interpretation.
- **Hotel page URL.** The Smart search card link adds the Best-fit Room type (`bestFit`) to the Hotel page URL; its number of Rooms is the Rooms already in the URL. Reload, Back and a shared link reproduce the pre-selection and the Best-fit chip. Max price, Policy criteria and Preferences are not carried onto the Hotel page.
- **Page titles** are unchanged from the MVP. The Query is never put in the page title.

## Voice and Tone

The MVP voice applies: warm, plain South African English, what happened and then what to do, no exclamation marks. Smart search adds one rule: **never talk about the machinery**. No "AI", "magic", "model" or "thinking" in guest copy. The only place the feature names itself is the fallback notice.

| Do | Don't |
|---|---|
| "Describe your stay" (box label) | "Ask AI anything" |
| "Try: quiet hotel with a pool in Cape Town this weekend" (placeholder) | "Type your prompt here…" |
| "Try an example" (Example queries lead-in) | "Suggested prompts" |
| "Reading your search…" (submitting) | "AI is thinking…" |
| "Why it matches" (Match reason label) | "AI summary", "Generated for you" |
| "Max R 2 000 per night" (Criteria chip) | "Max R2,000 / night" |
| "Pets allowed", "Children allowed", "Smoking allowed" (Criteria chips) | "pets: true", "Kids OK" |
| "We don't have hotels in Kruger, so we're showing all cities." | "Unknown location." |
| "We couldn't use 'last Tuesday', so check your dates." | "Invalid date ignored." |
| "No strong matches for ‘ski chalet with a fireplace’" (heading), then "Try describing it another way." | "0 results above threshold." |
| "Smart search isn't available right now, so these results are in the usual order." then the button "Try again" | "Error: Provider timeout." |
| "Family Room · 1 room · sleeps 4" | "Recommended room for you!" |
| "Family Room picked for your search. Change it in the table." (booking summary) | "We chose this for you!" |

The copy above for the unknown-place, ignored-value and fallback notices and for the weak-match heading is decided. The unknown-place and ignored-value lines follow the PRD examples (FR-4).

**Formats.** As the MVP: "R 2 000" with non-breaking spaces, "Fri 23 Oct 2026" dates. The MVP spoken-price rule does not apply to control names: a Criteria chip's name keeps its visible text, so it reads "Remove Max R 2 000 per night" (see Criteria chip).

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md` Components under the same names.

| Component | Used on | Behavioural rules |
|---|---|---|
| Smart search box | Home, Search results | A native `<textarea rows="1" maxlength="300" enterkeyhint="search">` with a `<label for>` reading "Describe your stay". It grows from one line to two, then scrolls inside itself. Enter on `keydown` submits and calls `preventDefault`, so it never adds a new line; Enter during IME composition (`event.isComposing`) is left alone. The field is described by `aria-describedby="ss-hint ss-counter ss-status"`: a visually hidden "Press Enter to search", the Character counter and the Submitting status, all present in the DOM from page load. Input stops at 300 characters (FR-1); a longer paste is cut at 300. An empty or whitespace-only Query cannot be submitted: Enter does nothing, focus stays in the field. While submitting, the field has the `readonly` attribute (not `aria-readonly`). On Search results the box shows the submitted Query from the URL. [Mock](mockups/key-home-smart.html) |
| Smart search submit | Smart search box | An `icon-button` named "Search by description", so it is not confused with the Search bar's Search. Pressing it is the same as Enter. `aria-disabled="true"` while the box is empty and while submitting; it keeps its name and stays focusable, and a second Enter or press while submitting is ignored. The spinner inside it is `aria-hidden`. |
| Smart search clear | Smart search box | The × appears only when there is text. Named "Clear description". It empties the box and keeps focus in it. It does not re-run the search. `aria-disabled` while submitting. |
| Character counter | Smart search box | Always in the DOM with a stable `id`, empty below 250 characters. From 250 it shows "250 / 300" with a visually hidden reading, "250 of 300 characters used". On reaching 300, by typing or by a cut paste, a polite announcement says "300 of 300 characters, the limit", once. |
| Submitting status | Smart search box | "Reading your search…" in a `role="status"` region that is empty at page load. The text is set on submit and cleared on navigation. |
| Example queries | Home, under the Smart search box | Three `button`s, each showing one exact PRD Query: "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night" (UJ-1), "quiet business hotel in Gauteng with a gym and meeting rooms" (UJ-2) and "ski chalet with a fireplace" (UJ-3). Each button's name is its visible text. They sit in a list labelled by the visible lead-in "Try an example" (`aria-labelledby`). One click fills the box and submits, exactly as Enter would (FR-1): focus stays on the clicked button, the Submitting state runs, and after navigation focus goes to the result heading. All three are `aria-disabled` while submitting. Not shown on Search results, where the box holds the Guest's own Query. [Mock](mockups/key-home-smart.html) |
| Search bar (changed) | Home, Search results | Behaves as the MVP. While a Query is in the URL, its Search re-runs the search in Ranking blend order with that Query's Preferences, without a new Query interpretation (FR-5); see Re-running. The box counts as **cleared** when it is empty at the moment Search is pressed, whether by × or by deleting the text; Search then runs the MVP search and drops Preferences, Max price and Policy criteria. Text edited in the box but not submitted is not used: Search uses the Query in the URL, and the box shows that submitted Query again when the results update. While submitting, its field triggers and Search are `aria-disabled` (not `disabled`, so focus is never dropped) and described by the Submitting status. |
| Criteria chip | Search results, under the Search bar | One chip per Max price or Policy criterion, in the order Max price, then Policy criteria. Each is a `button` whose visible text is the chip copy, preceded by a visually hidden "Remove ", then a decorative ×: `<button><span class="visually-hidden">Remove </span>Max R 2 000 per night<svg aria-hidden="true"></button>`. No `aria-label`, so the name ("Remove Max R 2 000 per night", "Remove Pets allowed", "Remove Children allowed", "Remove Smoking allowed") contains the visible text (PRD §9, WCAG 2.5.3). Each chip is keyed by its criterion (`maxPrice`, `pets`, `children`, `smoking`), so surviving chips keep their DOM nodes. Activating it pushes a new URL without that criterion and re-runs the search with the same Preferences (FR-5); see Re-running. **Focus** (user decision, an exception to the MVP focus rule): at click time focus moves to the next chip, to the previous one if the removed chip was last, or to the Smart search box if none are left. When the results update, if focus has fallen to the page body, it is restored to the chip with the stored key, or to the box. The new result count is announced once through a polite results status region that is empty at page load ("Stellenbosch: 3 properties found"). The headline is not focused. |
| Notices | Search results, after the result heading | The MVP `notice`: display only, not dismissible, never takes focus on its own. At most two show, in this priority: fallback, unknown place, ignored value. They come after the result heading in both DOM and visual order, each with a stable `id` (`notice-fallback`, `notice-place`, `notice-value`). The heading lists the ids of every shown notice in its `aria-describedby`, in priority order, so they are read when focus lands on it, and they are also next in reading order. A weak match is never a notice (see Weak-match heading). |
| Fallback notice | Notices | The fallback notice holds a **Try again** button (`button-secondary`) after its text. Try again resubmits the Query in the URL as if the Guest had submitted it: the box is reset to that Query, the Submitting state runs, and Try again is `aria-disabled` meanwhile. Success pushes the new Smart search URL and focus goes to the result heading. Another failure shows the same fallback page again with focus on the heading. Try again is in the tab order after the heading and before the Listing cards. [Mock](mockups/key-results-thandi.html) |
| Weak-match heading | Search results | Replaces the result-count headline when no Hotel is a Strong match (see Weak match). It is the page's `h1` with `tabindex="-1"` and takes focus after navigation, as in the MVP. Its text is "No strong matches for ‘…’" with the Query in curly quotes, cut at 60 characters with an ellipsis (…); its accessible name is that same visible text. Directly under it, the rephrase line "Try describing it another way." has `id="results-hint"`. The heading's `aria-describedby` lists `results-hint` first, then any notice ids. [Mock](mockups/key-results-weak.html) |
| Listing card (changed) | Search results | The hotel name stays the card's only link, stretched over the card (the MVP stretched link). The Match reason, the Best-fit room line and the Score breakdown are plain text inside the card but outside that link, so they are never part of its name. "See availability" stays hidden from assistive tech as in the MVP. |
| Best-fit room line | Listing card, top of the price block | Under Smart search the price block starts with "Family Room · 1 room · sleeps 4", and the price is that room's price for the Rooms shown, with no "from" (FR-14). "sleeps N" is the total across the Rooms shown. Not shown under fallback, where the card is the MVP card. |
| Match reason | Listing card, under the hotel name | Appears only when the Query has Preferences and the fallback is not in force (FR-10, FR-2). The label and sentence are one block, so the label is read with its sentence. It wraps freely and is never clamped or truncated (FR-15 rejects reasons over 120 characters). While loading, the "Why it matches" label sits over a two-line skeleton and the whole block is `aria-hidden="true"`, so the card reads as if no reason were there; `aria-hidden` is removed when the sentence arrives. If the reason fails, is rejected or times out at 5 s, the block is removed and the card shows no reason and no message (FR-15). |
| Best-fit chip | Hotel page room table | Display only, reading "Best fit for your search", with a stable `id`. Shown on the pre-selected row when the Hotel page URL carries `bestFit`. It stays on that row if the Guest changes the selection (user decision). [Mock](mockups/key-hotel-bestfit.html) |
| Room table (changed) | Hotel page | Opens with the Best-fit room and its number of Rooms selected, the booking summary already showing them, and Reserve enabled if the Party fits (FR-14). Focus still goes to the hotel name. The room-name cell is a row header (`<th scope="row">`) holding the Room type name and the Best-fit chip, and that row's Rooms select has `aria-describedby` pointing at the chip, so it reads "Family Room rooms, 1, Best fit for your search". Max price is not enforced here. Once the Guest changes a quantity, the MVP selection rule applies and wins over `bestFit` on reload; `bestFit` then only places the chip. If the Best-fit room is no longer available, nothing is pre-selected, no chip shows and the MVP room table applies. |
| Booking summary (changed) | Hotel page | While the pre-selection is untouched, the summary carries one line, "Family Room picked for your search. Change it in the table.", in reading order before the total. It also shows in the phone bottom bar's full summary. It is removed once the Guest changes the selection. |
| Score breakdown | Listing card, debug flag only | A real table, captioned "Score breakdown, " plus the hotel name. One row per value, each with a row header: "Relevance, meaning", "Relevance, exact words", "Review score signal", "Price signal", "Ranking blend score", and one "Score" column, each to two decimals (FR-20). Display only, outside the card link and the tab order, and it fits 320px without scrolling sideways. Never turned on by a URL. |

## State Patterns

MVP states apply unchanged. Smart search adds these.

| State | Surface | Treatment |
|---|---|---|
| Provider not configured | Home, Search results | The box and the Example queries are absent. No message. The Home hero is as shipped. Every page is the MVP page (FR-2). |
| Idle | Home, Search results | The label, the placeholder (Home) or the submitted Query (Search results), and the search icon. The submit is `aria-disabled` while the box is empty. The live regions exist and are empty. [Mock](mockups/key-home-smart.html) |
| Typing | Smart search box | The × appears. The submit becomes enabled once there is non-space text. The counter shows from 250 characters. Nothing runs until submit. |
| Submitting | Smart search box, Search results | Triggered by Enter, the submit, an Example query or Try again. The field is `readonly`, the submit shows the spinner, and "Reading your search…" is set in the Submitting status and announced once. The clear, the Example queries, Try again and the Search bar are `aria-disabled` for up to 2.5 s, so nothing can race the Query (a declared change to the MVP, see Foundation). On Search results the listing is replaced by the MVP's three skeleton cards with `aria-busy="true"` on the list. On Home the page stays as it is until navigation. [Mock](mockups/key-home-smart.html) |
| Results | Search results | CheckInn navigates to the Search results URL (FR-3). The Search bar shows the interpreted Destination, Stay and Party, the chips show Max price and Policy criteria, and the box shows the Query. Stay and Party keep their Search bar values unless the Query states them; Destination, Max price and Policy criteria start empty for each new Query (FR-4). Focus goes to the result-count headline, as in the MVP. Cards are in Ranking blend order (FR-11). [Mock](mockups/key-results-thandi.html) |
| Results with notices | Search results | As Results, with up to two notices after the heading. Unknown place: Destination stays empty, the headline is "All destinations: N properties found", and the notice names the place (FR-4). Ignored value: the value is not applied and the notice names it (FR-4). [Mock](mockups/key-results-weak.html) |
| Weak match | Search results | No Hotel is a Strong match. The Weak-match heading says so: "No strong matches for ‘ski chalet with a fireplace’", with "Try describing it another way." under it. The closest Hotels are listed below in Ranking blend order, each with an honest Match reason (FR-10). There is no weak-match notice; PRD SM-6's "weak-match notice" means this heading. Focus goes to the heading after navigation, as in the MVP (user decision). [Mock](mockups/key-results-weak.html) |
| No Preferences | Search results | A Query with only Hard criteria. No Weak-match heading, no Match reason label or skeleton. The Best-fit room line still shows (FR-10). |
| No results | Search results | No Hotel meets the Hard criteria. The MVP no-results state, with the Hard criteria named in the body: "Nothing matches that search." then "We looked for Pets allowed and Max R 2 000 per night in Stellenbosch. Remove a filter, or try other dates or another city." The chips stay so they can be removed; the city tiles show below (FR-10, MVP FR-8). |
| Re-running | Search results | A new search under an existing Query, with no new Query interpretation: removing a chip, a Search bar Search while a Query is in the URL, or Back or Forward to another Smart search URL. No "Reading your search…". The listing becomes the MVP's three skeleton cards with `aria-busy="true"` on the list; the box, the Search bar and the chips stay usable, and the newest action wins, as MVP URL pushes do. When the Preferences are unchanged, Match reasons are served from the cache with the cards: no skeleton, no streaming and no "Match reasons added". A card whose reason is not cached (a Hotel that only now qualifies, or an expired entry) goes through Reason loading on its own. Focus follows the triggering control: chip row for a chip, the heading for Search and Back. |
| Fallback | Search results | Query interpretation timed out at 2.5 s, or the Provider failed or rate-limited. The page is the MVP search for the Search bar values from before the submit, in MVP order, with MVP cards: no chips, no Best-fit room line, no Match reasons and no skeletons. A first Query from Home with no Destination gives "All destinations: 12 properties found". The fallback notice reads "Smart search isn't available right now, so these results are in the usual order." and holds the **Try again** button, which resubmits the Query (user decision, FR-2). The Query stays in the box, so the Guest can also edit and submit it. Focus goes to the heading, whose description includes the notice. [Mock](mockups/key-results-thandi.html) |
| Fallback URL | Search results | The fallback URL holds the Query text (for the box), the Search bar's Destination, Stay, Party and Rooms as they were before the submit, a fallback marker, and no Max price, Policy criteria or Preferences: those of a previous Query are dropped. Reload, Back and a shared link show the same fallback page without calling the Provider. A Search bar Search on it runs the MVP search, drops the marker and the notice, and keeps the Query in the box. If a reload or Back of a normal Smart search URL hits a Provider failure, the same notice and Try again show, with the Hard criteria from that URL still applied and its chips kept. |
| Stale or invalid Smart search URL | Search results, Hotel page | The MVP rule applies to Stay and Party: invalid values are replaced with defaults, a past Stay is cleared, and the search is not run until dates are picked. Invalid Max price or unknown Policy values are dropped silently, with no chip and no notice. Preferences or a Query over 300 characters are dropped; a dropped Query leaves the box empty. Otherwise the Query stays in the box, and once the Guest picks dates the search runs with the remaining Preferences and no new Query interpretation. A fallback marker without a Query is ignored. An unknown or unavailable `bestFit` on the Hotel page pre-selects nothing and shows no chip. |
| Reason loading | Listing card | "Why it matches" over the two-line skeleton, the block hidden from assistive tech (see Match reason). Pulse off under reduced motion. [Mock](mockups/key-results-thandi.html) |
| Reason arrived | Listing card | The sentence replaces the skeleton. Nothing above the card moves and nothing reorders. A one-line reason makes that card one line shorter; a reason longer than two lines, possible on a narrow phone, makes it taller. |
| Reason failed | Listing card | The block is removed. No error text. Other cards are unaffected (FR-15). |
| Invalid Search bar input | Search bar | The MVP rule: Search does not run, a Coral message shows under the field, focus moves to it. Interpretation never produces this state, because invalid values are dropped with a notice instead (FR-4). |

## Interaction Primitives

- **Submit.** Enter in the box, the submit button, an Example query, or Try again. Enter never inserts a line break and is ignored during IME composition. On phone the keyboard's action key reads "Search" (`enterkeyhint`).
- **Navigation.** Submitting a Query pushes a new Search results URL. Back returns to the previous Search results state, with its Query in the box (FR-3). Removing a chip and changing a Search bar field each push a new URL, as MVP criteria changes do.
- **Focus.**
  - After a Query is submitted: the result heading (the result count, or the Weak-match heading), as in the MVP.
  - After a chip is removed: stays in the chip row, on the next chip, or the previous one if the removed chip was last, otherwise on the Smart search box; restored by chip key if the update drops it. **Exception to the MVP focus-after-navigation rule** (user decision, see Foundation).
  - After the × clear: stays in the box.
  - After an Example query is clicked: stays on it until navigation, then the result heading.
- **Tab order** on Search results: Smart search box, its clear and submit, the Search bar, the Criteria chips, Try again in the fallback notice, then the Listing cards. The result heading takes programmatic focus (`tabindex="-1"`) after navigation but is not a Tab stop.
- **Streaming.** Match reasons fill in place after the results. Nothing reorders or moves above a card when they arrive.
- **Motion.** The spinner rotates; the skeleton pulses; both stop under reduced motion. The gradient border never animates.
- **Banned (adds to the MVP list):**
  - a sort, ranking or blend control of any kind (user decision)
  - sparkles, glows, typing effects or animated gradients (user decision)
  - a chat, follow-up questions or a summary answer above the results (PRD §5, §6.2)
  - autocomplete or suggestion lists under the box (PRD §5); the three fixed Example queries are not suggestions
  - horizontally scrolling chip rows

## Accessibility Floor

The MVP floor applies in full: WCAG 2.1 AA, visible labels, 44px targets, the Gold focus ring, reflow at 320px, no meaning by colour alone. Smart search adds:

- **Label.** "Describe your stay" is a real `<label for>` on the textarea. The placeholder is an example, never the label (FR-1).
- **Live regions start empty.** The Submitting status, the results status (chip removal count) and the "Match reasons added" region all exist, empty, at page load; each gets its text when its event happens. "Match reasons added" is not fired if the Guest has left the page.
- **Status while submitting.** "Reading your search…" is announced once. Focus does not move until navigation.
- **Heading after navigation.** Focus goes to the result heading. Notices and the rephrase line follow it in the DOM and are its accessible description, so a screen reader reads "Stellenbosch: 1 property found" followed by any notice, and reading on reaches them too.
- **Criteria chips.** Real buttons, named by a visually hidden "Remove " plus the visible text, never by `aria-label` (2.5.3). At least 44 × 44px including the ×. The × icon is decorative. The row is a list with the visually hidden label "Your filters".
- **Chip wrapping.** Chip labels wrap inside the chip; the non-breaking spaces stay only inside "R 2 000". At 200% text on a 320px viewport no chip is clipped and the row never scrolls sideways. The same applies to the Best-fit chip.
- **Match reasons.** Arriving reasons are not announced one by one. A single polite live region says "Match reasons added" once, after every card's reason has arrived, failed or timed out, and only if at least one streamed in (FR-15). While a reason loads, its block, label included, is hidden from assistive tech.
- **Best-fit pre-selection.** Conveyed at the Rooms select through its description and in the booking summary line (see Room table (changed), Booking summary (changed)).
- **Gradient.** The gradient border is the field's boundary and passes 3:1 along its whole length; the box is named by its label. In forced-colours mode it falls back to a solid `CanvasText` border (`DESIGN.md` Colors).
- **Counter.** Always present, tied to the field with `aria-describedby`; the limit is announced once.
- **Busy controls.** Controls unavailable while submitting are `aria-disabled`, never `disabled`, so focus is never lost.
- **Score breakdown.** A real table with a caption naming the hotel and row headers.

## Responsive & Platform

Breakpoints are the MVP's. Visual layout is in `DESIGN.md` Layout & Spacing.

| Width | Behaviour |
|---|---|
| ≥ 1024px (desktop, projector) | Box and Search bar full container width, stacked. Chips in one row, wrapping if needed. |
| 768–1023px (tablet) | As desktop. |
| < 768px (phone) | The box is always visible, full width, at the top of Search results. The collapsed Search bar summary sits under it and expands on tap as in the MVP; the chips sit under the summary and wrap (user decision). On Home the box and the Example queries sit above the stacked Search bar fields. |
| < 360px, or enlarged text | When the text area would be narrower than about 15 characters, the decorative magnifier is dropped, the clear and submit move to a row under the text area, and the text area grows to four lines before it scrolls inside itself. |

**Projector check.** At 1280 × 720 and 125% zoom, the box, the Search bar, one row of chips and the first Listing card's name and Match reason fit above the fold. On the UJ-3 weak-match screen the heading may wrap to two lines; the rephrase line and the first card's name must still show above the fold, or the 60-character cut-off is shortened.

## Demo and Presenter Concerns

The MVP section still applies (time budget, reliability over likeness, reset, fictional notice). Smart search adds:

- **No typing on stage.** The three Example queries on Home run UJ-1 to UJ-3 in one click each, so the presenter never types in front of the room.
- **Pre-flight check.** The presenter runs the PRD §7 pre-flight command before going on stage. It calls each Provider deployment once and reports OK or the failure.
- **Shared Provider key and rate limit.** On the shared instance, visitors' phones use the presenter's one Provider key and its rate limit. A rate-limited Query falls back as in FR-2, so the fallback notice and Try again must look intentional, not broken.
- **Network dependency.** Smart search needs network access at the venue (PRD §7). Without it every Query falls back; the rest of CheckInn still works offline.
- **Presenter view.** The debug Score breakdown is the presenter's only extra view.

## Inspiration & Anti-patterns

- **Kept from the MVP:** the Search bar as the visible, editable record of what was understood. Smart search writes into it rather than hiding its reading of the Query.
- **Rejected: AI sparkle and "AI" labels.** The feature should feel like CheckInn search, not a bolted-on assistant (user decision).
- **Rejected: a sort or ranking toggle.** One Ranking blend is chosen in the workshop; guests never choose (user decision).
- **Rejected: a chat or answer box.** One Query, one ranked list (PRD §2.2, §5).

## Key Flows

Flows 1–3 mirror PRD UJ-1 to UJ-3. Dates assume today is Thu 15 Oct 2026.

### Flow 1: Thandi finds a home for the family and the dog (UJ-1)

Steps 1–3: [Home mock](mockups/key-home-smart.html). Steps 4–5: [results mock](mockups/key-results-thandi.html). Step 6: [Hotel page mock](mockups/key-hotel-bestfit.html).

1. Thandi opens CheckInn on her phone. Home shows "Describe your stay" and three Example queries above the Search bar.
2. She types "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night" and taps the keyboard's Search.
3. The box turns read-only and "Reading your search…" appears under it.
4. Search results load. The box still shows her words. The collapsed summary reads "Stellenbosch · 23–25 Oct · 4 adults", and two chips sit under it: "Max R 2 000 per night" and "Pets allowed".
5. Focus is on "Stellenbosch: 1 property found". Winelands Family Lodge is the only card. "Why it matches" holds a skeleton for a moment, then reads "Pets allowed, a children's play area and family rooms that sleep 4." The price block starts "Family Room · 1 room · sleeps 4".
6. She taps the card. The Hotel page room table opens with Family Room set to 1 and marked "Best fit for your search". The summary says "Family Room picked for your search. Change it in the table." and the bottom bar already reads "1 room · R 4 000,00 · Reserve".
7. **Climax:** she taps Reserve without having picked a room herself. CheckInn understood the dog, the kids and the budget from one sentence.

**Edge case: editing the Party.** "For 4" was read as 4 adults. Thandi taps the summary, opens Occupancy, sets 2 adults and 2 children, and taps Search. Skeleton cards show briefly, then the results re-run with the same Preferences and chips, and no new interpretation (FR-5). Winelands Family Lodge stays, its Family Room still fits, its Match reason comes back at once from the cache, and her Query is still in the box.

**Failure: fallback.** The Provider is slow. After 2.5 s the results show the Search bar values from before her Query, in the usual order. Under the heading the notice reads "Smart search isn't available right now, so these results are in the usual order." with a Try again button. Her Query is still in the box. She taps Try again, the box turns read-only with "Reading your search…", and this time her Stellenbosch results load.

### Flow 2: Sipho finds a quiet place to work (UJ-2)

1. On his laptop, Sipho's Search bar already has his dates. He types "quiet business hotel in Gauteng with a gym and meeting rooms" and presses Enter.
2. Results: "Gauteng: 4 properties found". No chips, because the Query has no Max price or Policy criteria.
3. Jacaranda Garden Hotel is first: "Why it matches: Quiet workspaces, a gym and meeting rooms." Goldleaf Business Hotel is second. Its reason mentions the gym and meeting rooms and does not claim "quiet" (FR-16).
4. A screen-reader user would hear "Match reasons added" once, when the last reason settles.
5. **Climax:** he can see the reasons for the order without a sort control. The reasons tell him Jacaranda is the quiet one, and he opens it and books.

**Edge case: presenter view.** With the debug flag on, each card ends with the Score breakdown, so the presenter can show that Relevance put Jacaranda first despite Goldleaf's higher Review score.

**Failure: a reason times out.** Goldleaf's reason does not arrive within 5 s. Its label and skeleton disappear, the other cards are unaffected, and "Match reasons added" still fires once.

### Flow 3: Lerato asks for something CheckInn doesn't have (UJ-3)

Step 2: [weak-match mock](mockups/key-results-weak.html).

1. Lerato types "ski chalet with a fireplace" and submits.
2. Results: the heading reads "No strong matches for ‘ski chalet with a fireplace’", with "Try describing it another way." under it and the closest Hotels listed below. Focus lands on the heading, and a screen reader reads the rephrase line with it.
3. Each card has an honest Match reason that says what does fit and does not stretch to "ski" (FR-16).
4. She selects the box, which still holds her Query, clears it with ×, and types "cosy weekend retreat in the winelands".
5. **Climax:** the new results come back under a normal result-count heading, and the Winelands Hotels show reasons about relaxed stays. The first results said plainly that nothing matched well, and the rephrase line helped her word the second Query.

**Failure: no results.** Had she added "under R500 a night", no Hotel would meet the Hard criteria. She would see "Nothing matches that search." naming the Max price, with the "Max R 500 per night" chip ready to remove.
