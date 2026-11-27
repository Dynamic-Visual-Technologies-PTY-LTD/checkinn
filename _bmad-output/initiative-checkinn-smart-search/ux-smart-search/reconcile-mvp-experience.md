---
input: ../../initiative-checkinn-mvp/ux-checkinn/EXPERIENCE.md
spines: DESIGN.md, EXPERIENCE.md, .memlog.md
reconciled: 2026-10-15
---

# Reconcile: MVP EXPERIENCE.md vs Smart search EXPERIENCE delta

## Rule check

| MVP rule | MVP location | Delta | Verdict |
|---|---|---|---|
| Price "R 4 900" on cards, "R 4 900,00" for Booking totals, spoken "4 900 rand" | Voice and Tone, Formats | "Max R 2 000 per night", "R 4 000,00" in the mobile bar, "Max 2 000 rand per night" | Holds |
| Dates "Fri 13 Nov 2026"; summary line "Cape Town · 13–15 Nov · 2 adults" (root DESIGN) | Formats | "Fri 23 Oct 2026"; "Stellenbosch · 23–25 Oct · 4 adults" | Holds |
| No exclamation marks | Voice and Tone | None in guest copy | Holds |
| Warm, plain SA English, what happened then what to do | Voice and Tone | Kept, plus "never talk about the machinery" | Holds |
| Overlays never stack; no modal on a modal | IA; Banned | No new overlay added | Holds |
| Breakpoints 768 / 1024 | Responsive & Platform | Same | Holds |
| Notice never takes focus, not dismissible | Component Patterns, Alerts and notice | Same | Holds |
| Focus after navigation to the main headline | Interaction Primitives | Kept for Query submit; changed for chip removal | **Conflict** (G2) |
| Search bar usable while loading | State Patterns, Loading results | Search bar read-only while submitting | **Conflict** (G1) |
| Stale or invalid criteria in the URL | State Patterns | Not addressed for Smart search parameters | **Gap** (G3) |
| Banned patterns (infinite scroll, hover-only, open on focus, fake urgency, modal on modal) | Banned | Not contradicted; delta adds its own list | Holds |
| Demo and Presenter Concerns | Demo and Presenter Concerns | No equivalent section | **Dropped** (G4) |

## Gaps

### G1. Search bar turns read-only while submitting

- **Source:** MVP State Patterns, Loading results ("Three skeleton listing cards. The search bar stays usable.").
- **Spine:** delta Smart search states, Submitting ("The Search bar is read-only for those up to 2.5 s, so it cannot race the Query").
- **Problem:** the delta reverses an MVP state without listing it as a change. A read-only Search bar with no visible cue looks broken on a projector, and a keyboard user who tabs into it gets no explanation.
- **Fix:** either keep the MVP rule and say a Search bar Search during Submitting cancels the Query (the newest action wins, as MVP URL pushes do), or keep read-only and add it to an explicit "Changes to MVP behaviour" list in Foundation, with an accessible description ("Wait for your search to finish") on the fields.

### G2. Chip removal breaks the MVP focus and live-region rules

- **Source:** MVP Interaction Primitives ("Changing the search criteria pushes a new URL"; "Focus after navigation: focus goes to the page's main headline … Nothing else announces the same content; live regions are only for updates in place").
- **Spine:** delta Component Patterns, Criteria chip ("pushes a new URL … Focus moves to the next chip … The new result count is announced politely").
- **Problem:** removing a chip is a criteria change that pushes a URL, so by the MVP rule focus goes to the headline. The delta keeps focus in the chip row and announces the headline text through a live region, which the MVP forbids (the same content announced twice, a live region for a navigation). Two criteria changes now move focus differently: Search bar Search goes to the headline, chip removal stays in the row.
- **Fix:** state the exception in the delta Foundation: "Removing a Criteria chip is treated as an in-place update: focus stays in the chip row and the result count is announced once politely; the headline is not focused." Or follow the MVP and focus the headline after removal. Pick one and say it overrides MVP Interaction Primitives.

### G3. No state for stale or invalid Smart search parameters in the URL

- **Source:** MVP State Patterns, Stale or invalid criteria in the URL ("invalid values are replaced with defaults, Stay is cleared … The search or room table is not run until dates are picked"); MVP IA ("A reload, Back, or a shared link reproduces the same view").
- **Spine:** delta IA ("Smart search state lives in the URL"); Smart search states (no stale-URL row); Invalid Search bar input row.
- **Problem:** a shared Smart search link from last week has past dates, and any link can carry malformed Max price, unknown Policy criteria or oversized Preferences. The delta does not say whether the MVP stale rule clears Stay but keeps the Query, Preferences and chips, whether the box still shows the Query, or what happens to an invalid chip value. PRD §9 treats this input as untrusted, so it needs a defined, guest-visible outcome.
- **Fix:** add a row "Stale or invalid Smart search URL": the MVP rule applies to Stay and Party; invalid Max price or Policy values are dropped silently (no chip); Preferences over 300 characters are dropped; the Query stays in the box; once the Guest picks dates, the search runs with the remaining Preferences and no new Query interpretation.

### G4. The Demo and Presenter Concerns are dropped

- **Source:** MVP Demo and Presenter Concerns (time budget under 3 minutes; reliability over likeness; one-click path "so the presenter never has to type in front of the room"; shared instance on stand Wi-Fi; "No internet at the stand … every flow still completes").
- **Spine:** delta has no equivalent section; Foundation says everything not stated behaves as the MVP; Flow 1 Failure and Fallback state cover a slow Provider.
- **Problem:** Smart search inverts several of these. It needs typing in front of the room, it needs the network (PRD §7), and on a shared instance 200 visitors' phones share one Provider key and its rate limit. "Behaves as the MVP" does not carry these over, because the MVP answers (city tiles, offline placeholders) do not apply to the box. The MVP's qualitative intent, a demo that never breaks and stays fast, is the loss.
- **Fix:** add a short "Demo and Presenter Concerns" section to the delta: the presenter's demo Queries (UJ-1 to UJ-3) are ready to paste or come from a one-click link with the Query in the URL; the pre-flight check (PRD §7) runs before going on stage; rate-limits from visitor phones fall back as in FR-2 and that fallback must look intentional; the 3 s results target keeps the MVP time budget; the debug score breakdown is the presenter's only extra view.
