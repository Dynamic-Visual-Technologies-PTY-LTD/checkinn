---
name: CheckInn
status: final
created: 2026-10-09
updated: 2026-10-09
sources:
  - ../prd-checkinn/prd-checkinn.md
  - DESIGN.md
  - imports/DESIGN-repo-root.md
---

# CheckInn — Experience Spine

## Foundation

CheckInn is responsive web: one Next.js app with no UI component library. Components are built with Tailwind against the tokens in `DESIGN.md`, which owns how everything looks. This spine owns how it works. Icons are a hand-made inline SVG set (`DESIGN.md` Components, Icons).

- **Terms:** product terms (Hotel, Room type, Stay, Party, Booking, Booking total…) follow the PRD Glossary exactly. UI labels may be friendlier than the glossary term: the "Dates" field sets the Stay, and the "Occupancy" field sets the Party.
- **References:** FR and UJ numbers refer to `prd-checkinn.md`.
- **Audiences:** two at the same time (see `DESIGN.md` Overview): a presenter on a projector in front of about 200 people, and expo visitors on their own phones.
- **Reference material:** booking.com is the reference for layout and flow, and CheckInn's own dark theme sets the look. The booking.com reference screenshots are in `imports/`:
  - [hotel header and gallery](imports/ref-booking-hotel-header.png)
  - [facilities](imports/ref-booking-facilities.png)
  - [availability table](imports/ref-booking-availability.png)
  - [search bar](imports/ref-booking-search-bar.png)

## Information Architecture

| Surface | Reached from | Purpose | PRD |
|---|---|---|---|
| Home | Logo, app open | Hero, search bar, 6 city tiles | FR-1, FR-2, FR-27 |
| Search results | Search button, city tile | Result count and listing cards for the criteria | FR-3–FR-8 |
| Hotel page | Listing card | Hotel details, availability table, room selection (step 1 "Your selection") | FR-9–FR-18 |
| Booking details | RESERVE in the booking summary | Summary and guest form (step 2 "Your details") | FR-21 |
| Confirmation | CONFIRM BOOKING | Booking reference and summary (step 3 "Confirmation") | FR-22 |
| Manage booking | Header link, confirmation page | Look up a Booking by reference and email | FR-23 |
| Booking view | Manage booking lookup | Status, details, cancel | FR-23, FR-24 |
| Not found | Unknown Hotel or URL | Plain message and a way back | — |

Overlays never stack, so only one is open at a time: range calendar, occupancy picker, photo viewer, expanded mobile summary, and the price-match, share-fallback and cancel-confirmation dialogs.

**Landmarks:** every page has a "Skip to main content" link first, then `header` (with `nav`), `main` and `footer`. The header has the logo (named "CheckInn home") and "Manage booking". The footer holds the fictional-demo line and "Photo credits" (`DESIGN.md` Footer).

**Search criteria live in the URL** on Search results, the Hotel page and Booking details (FR-4). A reload, Back, or a shared link reproduces the same view. Booking details also carries the room selection in its URL.

**Page titles** name the surface and context, e.g. "Harbourlight Retreat · CheckInn" or "Cape Town hotels · CheckInn", so the route announcer reads something useful.

→ Composition reference: [Home](mockups/key-home.html), [Range calendar](mockups/key-calendar.html), [Search results](mockups/key-search-results.html), [Hotel page](mockups/key-hotel.html), [Booking details](mockups/key-booking-details.html), [Confirmation and Booking view](mockups/key-confirmation.html). The spines win on conflict with any mock or screenshot.

## Voice and Tone

The look is technical and the words are warm: plain South African English that says what happened, then what to do next. Use short sentences, and no exclamation marks except on the confirmation headline. The warmth has to survive with no photos, so it lives in the copy.

| Do | Don't |
|---|---|
| "Find your stay." (Home headline); lead "Twelve hotels in six South African cities. Pick your dates and book in a few steps."; section "Explore a city" | "Welcome to the future of hotel booking" |
| "Where are you going?" (Destination placeholder) | "Enter destination" |
| "Cape Town: 2 properties found" / "6 properties found" (several Cities) / "1 property found" / "All destinations: 12 properties found" | "Showing 2 results for your query" |
| "Nothing matches that search. Try another city, other dates or fewer rooms." | "No results." |
| "2 nights, 2 adults" | "Duration: 2; guests: 2" |
| "Free cancellation until Wed 11 Nov 2026, 14:00" | "Cancellation policy: free_until_48_hours_before_check_in" |
| "Non-refundable. This booking can't be cancelled." | "Warning: no refunds!!" |
| "Only 2 left" | "Hurry! Selling fast!" |
| "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one." | "Invalid selection" |
| "Sorry, the last Standard Double was just booked. Pick another room." | "Error 409: conflict" |
| "Those dates have passed. Pick new ones." | "Invalid date parameter" |
| "You're booked!" (confirmation headline) | "Booking successfully created." |
| "We couldn't find that booking. Check the reference and email." | "Booking does not exist" |
| "No payment is taken. This hotel is fictional." | Fine print hidden in a tooltip |

Button labels are short verbs, written in sentence case in the source and shown uppercase through CSS (`DESIGN.md` Typography, Labels): Search, See availability, See rooms, Reserve, Confirm booking, Find booking, Cancel booking, Keep booking.

**Formats:**
- **Dates:** "Fri 13 Nov 2026". Deadlines: "Wed 11 Nov 2026, 14:00". Short ranges in summaries: "Fri 13 – Sun 15 Nov 2026".
- **Prices:** "R 4 900" (whole rand) on Listing cards and the room table; "R 4 900,00" anywhere a Booking total is shown (summary, mobile summary bar, confirmation, Booking view) (FR-19).
- **Spoken prices:** each amount has an accessible name such as "4 900 rand", so screen readers don't read the separators.

## Component Patterns

Behavioural. Visual specs live in `DESIGN.md` Components, under the same names.

| Component | Used on | Behavioural rules |
|---|---|---|
| Search bar | Home, Search results | Three fields plus Search. Defaults: empty Destination, Stay from tomorrow to the day after (1 night), 2 adults · 0 children · 1 room. On phone on Search results it collapses to a summary line, and tapping it expands the full bar. Validation runs on submit (see State Patterns). An empty Destination runs the default search (FR-2). The Destination clear (×) empties the field and keeps focus in it. |
| Range calendar | Dates field (search bar, Stay and Party picker) | Opens on click, Enter, Space or Down arrow, never on focus alone. Desktop: a non-modal popover. Phone: a modal sheet (see Popover and sheet). The first pick sets check-in and the second sets check-out. Picking a date before check-in restarts the selection. Past days are disabled, and once check-in is set, so is every day beyond 30 nights. The footer shows "N nights". Done, Escape, or clicking outside keeps a complete range. If only check-in is set, those actions discard it and restore the previous Stay. |
| Occupancy picker | Occupancy field | Same opening rules as the range calendar. Steppers for Adults (1–10), Children (0–6) and Rooms (1–5, never more than adults). A stepper at its limit is `aria-disabled` and stays focusable, so focus never drops. Each change updates the field text "2 adults · 0 children · 1 room" and is announced ("3 adults"). Reaching a limit is announced ("Maximum 10 adults"). |
| Popover and sheet | Calendar, occupancy, expanded summary | Desktop popover: `role="dialog"`, named by its field, non-modal, closes on Escape or outside click, and returns focus to its field. Opening one closes any other. Phone sheet: `role="dialog"` with `aria-modal`, focus trapped inside, background inert, closed by Done or the close button. |
| Dialog | Price-match, share fallback, cancel confirmation | Modal: focus trapped, background inert, Escape closes. Focus starts on the safest action (Close, Keep booking) and returns to the trigger on close. |
| City tile | Home | A link that runs the search for that City with the current Stay and Party. |
| Listing card | Search results | The hotel name is the only link, stretched over the card, so the whole card is clickable but reads as one link named after the hotel. "See availability" is a visual label hidden from screen readers. Content follows FR-6. |
| Chip | Listing card, Hotel header | Facility chips are display only. The "We Price Match" chip is a button that opens the price-match dialog. |
| Score badge, star rating, cancellation line | Listing card, Hotel page, summary | Display only. Each has a text equivalent: "Rated 4.8 out of 5, Superb, 248 reviews", "5-star hotel", "Free cancellation until…". |
| Photos | Hotel page | Click or Enter on a photo opens the photo viewer at that photo. Each photo uses the seed alt text (FR-10). |
| Photo viewer | Hotel page | A modal dialog. Previous and next work by buttons, arrow keys and swipe, and wrap around. The counter is announced as "Photo 1 of 2". Escape or Close returns focus to the photo that opened it. |
| Image placeholder | Anywhere a photo fails | `role="img"` with the photo's seed alt text. The hotel or city name is visible (FR-11). |
| Save (heart) | Hotel header | Toggles the saved state in this browser only. `aria-pressed` reflects it. Named "Save Harbourlight Retreat". No toast. |
| Share | Hotel header | Copies the page URL with criteria and shows the toast "Link copied". If the clipboard is blocked, opens the share-fallback dialog with the URL selected. |
| See rooms | Hotel header | A secondary button. Scrolls to the availability section and focuses its heading, instantly under reduced motion. |
| Stay and Party picker | Hotel page availability section | The same calendar and occupancy picker, pre-filled. The room table refreshes when a popover or sheet closes with a changed value, with no button. The URL updates and focus stays on the field. If a chosen quantity now exceeds Availability, it is lowered to the new maximum and the change is announced (FR-16). |
| Room table | Hotel page | A real table on desktop with column headers. Below 768px each row becomes a card with its own heading (the Room type name). Each quantity select is named "Rooms of Standard Double". Options run from 0 to Availability. A sold-out row shows the reason instead of the select (FR-17). |
| Booking summary | Hotel page (step 1), Booking details, Confirmation, Booking view | Updates as quantities change (FR-18). Changes to the total are announced through a polite live region. Holds the step's primary button: Reserve, then Confirm booking. A disabled Reserve is `aria-disabled`, stays focusable, and is described by the reason shown above it. |
| Mobile summary bar | Hotel page and Booking details below 768px | Fixed to the bottom. Shows the rooms selected, the Booking total and the step's primary button. Tapping the summary text opens the full booking summary as a sheet. Hidden while no dates are set. |
| Step indicator | Hotel page availability section, Booking details, Confirmation | An ordered list with `aria-current="step"` on the current step. Display only; the way back is the Back link. |
| Guest form | Booking details | Fields per FR-21. Optional fields say "(optional)" in the label. Each field validates on blur, and the whole form on submit. On submit with errors, focus moves to the error summary. Each link in the summary moves focus to its field, and each field's message is tied to it with `aria-describedby`. A "Back to rooms" link returns to the Hotel page with the selection kept. |
| Manage booking form | Manage booking | Reference (case-insensitive, `CI-` prefix optional) and email, then Find booking. Validates like the guest form. |
| Cancel booking | Booking view | A secondary button that opens the cancel-confirmation dialog: "Cancel your booking at Coral Coast Resort for Fri 13 – Wed 18 Nov 2026? This can't be undone." Buttons: Keep booking (focused first) and Cancel booking. |
| Reference block | Confirmation | The reference is selectable text. COPY is named "Copy booking reference CI-7K3P9Q", and pressing it shows the toast "Reference copied". If the clipboard is blocked, the reference text is selected instead. References are `CI-` plus 6 characters from A–Z and 2–9 without O, I and L, so they can be read off a projector and typed on a phone. |
| Toast | Share, COPY | `role="status"`. Visible for 5 seconds, longer while hovered or focused. Never holds the only copy of important information. |
| Alerts and notice | Any | Display only, not dismissible. An alert that appears after an action takes focus once. A notice never takes focus. |
| Link | Any | Navigates; never performs an action. Links smaller than 24px are white and underlined (`DESIGN.md` Link). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Loading results | Search results | Three skeleton listing cards. The search bar stays usable. |
| Loading room table | Hotel page | Skeleton rows inside the room table, while the rest of the page stays. Focus stays on the picker field that triggered the refresh. |
| Default search | Search results | Headline "All destinations: 12 properties found". |
| No results | Search results | Headline "Nothing matches that search." The body suggests another city, other dates or fewer rooms, with the 6 city tiles below as a way out (FR-8). |
| Invalid search input | Search bar | Search does not run. Each problem shows a Coral message under its field, tied to it with `aria-describedby`, and focus moves to the first invalid field. Messages: "Check-out must be after check-in." "Check-in can't be in the past." "Stays can be up to 30 nights." Date errors sit under the Dates field trigger. |
| Stale or invalid criteria in the URL | Search results, Hotel page, Booking details | The cause is usually a shared or reloaded link with a past check-in, more than 30 nights, more than 5 rooms or malformed values. The invalid values are replaced with defaults, Stay is cleared, and a Coral message shows under the Dates field: "Those dates have passed. Pick new ones." The search or room table is not run until dates are picked. |
| Hotel page without dates | Hotel page | A notice above the table: "Select dates to see this property's availability and prices." Rows list Room types without prices or quantities; each row has a secondary "Show prices" button that opens the range calendar. The mobile summary bar is hidden (FR-16). |
| Few left | Room table | "Only N left" with a warning icon when N ≤ 3. |
| Sold out | Room table | "Sold out for your dates" in Coral, with no quantity select. Table View City Lodge's Family Room always shows this. |
| All rooms sold out | Hotel page | A notice above the table: "No rooms left for these dates. Try other dates." The Stay and Party picker gets focus when the guest selects the notice's "Change dates" link. No Reserve. |
| Nothing selected | Booking summary | "Select at least one room." above Reserve, which is `aria-disabled`. |
| Party doesn't fit | Booking summary | A warning icon and "These rooms sleep N. Your party is M. Add a room or pick a bigger one." Reserve is `aria-disabled` (FR-18). |
| No valid selection | Booking details | Reached by a link without a valid room selection. Redirects to the Hotel page room table with criteria kept. |
| Confirming | Booking details | Confirm booking shows "Confirming…" and is disabled. The form is read-only until the result arrives (FR-22). |
| Already booked | Booking details | Reached by refresh or Back after confirming. Shows the existing confirmation; no second Booking is made (FR-22). |
| Room ran out at confirm | Booking details → Hotel page | Returns to the Hotel page room table with Stay and Party kept and an `alert-error` at the top of the availability section naming the Room type. Focus moves to the alert. The row reflects the new Availability. |
| Booked | Confirmation | Mint tick, "You're booked!", the reference block, the summary with dates and Booking lines, and a "Manage this booking" link. |
| Looking up | Manage booking | Find booking shows "Finding…" and is disabled. |
| Booking not found | Manage booking | `alert-error`: "We couldn't find that booking. Check the reference and email." The message is the same for a wrong reference or a wrong email (FR-23). |
| Free cancellation open | Booking view | Mint "Free cancellation" badge with the deadline. Cancel booking is visible. |
| Deadline passed | Booking view | "Free cancellation ended on Wed 11 Nov 2026, 14:00." No cancel button (FR-24). If the deadline passes while the dialog is open, confirming shows this message instead of cancelling. |
| Non-refundable | Booking view | "Non-refundable. This booking can't be cancelled." No cancel button. |
| Cancelling | Booking view | The dialog's Cancel booking shows "Cancelling…" and is disabled. |
| Cancelled | Booking view | `alert-success` after the action: "Your booking is cancelled." The page then shows status Cancelled with the date it was cancelled. No cancel button. |
| Photo won't load | Everywhere photos appear | Image placeholder at the same size; never a broken-image icon (FR-11). |
| Unknown Hotel or URL | Not found | "We can't find that page." with links to Home and back to search. |
| Server error | Any | `alert-error`: "Something went wrong on our side. Try again." with a Try again button that repeats the last action. Any entered form data is kept. |

## Interaction Primitives

- **Input:** pointer and touch first, keyboard complete. Every action works by mouse, touch and keyboard.
- **Range calendar keys:**
  - Arrow keys move one day or one week.
  - Page Up and Page Down move one month.
  - Home and End go to the start and end of the week.
  - Enter or Space picks a day; Escape closes.
- **Photo viewer:** arrow keys, swipe and Escape.
- **Navigation:**
  - Changing the search criteria pushes a new URL, so the browser Back button returns to the previous search.
  - Room quantities replace the URL state rather than pushing a new one, so Back leaves the Hotel page in one step.
  - Back to Search results restores the scroll position and focuses the card the guest came from.
- **Focus after navigation:** focus goes to the page's main headline. On Search results that is the result count headline, on the Hotel page the hotel name, and on each booking step the step's headline. Nothing else announces the same content; live regions are only for updates in place.
- **Motion:** minimal. Popovers and sheets fade or slide in under 200ms. With reduced motion set, nothing animates and every programmatic scroll is instant.
- **Banned:**
  - infinite scroll and autoplaying carousels
  - hover-only controls
  - opening anything on focus alone
  - countdown timers or fake urgency
  - a modal on top of a modal

## Accessibility Floor

Behavioural. Visual contrast lives in `DESIGN.md`. All text token pairs pass `npm run design:lint`. Non-text contrast for borders, rings and state outlines is stated in `DESIGN.md` Colors.

- **Standard:** WCAG 2.1 AA across every surface (PRD §5).
- **Structure:**
  - A skip link and landmarks on every page.
  - Headings in order.
  - Every field has a visible label: "Destination", "Dates" and "Occupancy" are real labels, not placeholders.
- **Calendar:**
  - Built as a grid.
  - Each day's accessible name is its full date plus its role, e.g. "Friday 13 November 2026, check-in", "Saturday 14 November 2026, in your stay", "Thursday 12 November 2026, unavailable".
  - Selected days carry `aria-selected`.
- **No meaning by colour alone:** stars, score, availability, cancellation, calendar states and the current step all carry text or shape as well.
- **Live regions:** a polite live region announces in-place updates (Booking total, stepper values, quantity clamps, the party-doesn't-fit warning). Errors that move focus are not also announced through a live region.
- **Touch targets:** at least 44 × 44px on phone, including inputs, chips that act as buttons, the COPY button and close buttons.
- **Focus ring:** a 2px Gold outline with a 2px offset on every focusable element, Deep Blue on white surfaces. Never removed.
- **Reflow and resize:**
  - Reflow works at 320 CSS px wide (1280px at 400% zoom) with no horizontal scrolling.
  - The header stops being fixed below 500px of viewport height, so content stays visible.
  - Text resizes to 200% without loss.
  - Text spacing overrides don't clip, because every height is a minimum.

## Responsive & Platform

Breakpoint values and visual layout per breakpoint live in `DESIGN.md` Layout. This section covers only behaviour.

| Width | Behaviour |
|---|---|
| ≥ 1024px (desktop, projector) | Pickers are non-modal popovers. The booking summary stays in view while the room table scrolls. |
| 768–1023px (tablet) | Pickers are popovers. The booking summary sits under the room table and does not stick. |
| < 768px (phone) | Pickers, the expanded summary and the photo viewer are full-screen modal sheets with Done or Close. On Search results the search bar starts collapsed. The mobile summary bar holds the primary action. The toast sits above the bar. |

**Projector check:** check every key screen at 1280 × 720 and at 125% and 150% browser zoom, the likely presenter setup. On the Hotel page, only the room table may fall below the fold, and See rooms reaches it in one click.

## Demo and Presenter Concerns

- **Time budget:** a first-time visitor reaches a Booking reference in under 3 minutes without help (PRD SM-1). Every flow below is designed to fit inside that.
- **Reliability over likeness:** following the PRD counter-metrics SM-C1 and SM-C2, a smaller flow that never breaks beats a closer copy of booking.com.
- **One-click path:** a city tile on Home goes straight to results, so the presenter never has to type in front of the room.
- **Reset:** the PRD reset command (FR-26) is the presenter's tool between sessions. Nothing in the UI exposes it.
- **Shared instance:** the presenter's laptop serves one running app over the stand Wi-Fi, and visitors' phones use the same one. A visitor's Booking reduces what the presenter sees, so the "Only N left" and "Sold out" states must look intentional, not broken.
- **No internet at the stand:** photos fall back to placeholders (FR-11), Poppins is self-hosted, and every flow still completes.
- **Fictional notice:** always shown in the footer and on Booking details, so nobody mistakes the demo for a real booking.

## Inspiration & Anti-patterns

- **Lifted from booking.com:**
  - the search bar (destination, dates, occupancy, search)
  - the listing card anatomy and the score badge
  - the "Most popular facilities" list
  - the availability table with quantities and one Reserve
  - the three-step reserve flow
- **Lifted from GOV.UK form practice:** an error summary at the top of the guest form that links to each field.
- **Rejected — booking.com's urgency tactics:** "In high demand!", "5 people are looking", countdown timers. CheckInn shows "Only N left" only when it's true and never adds pressure.
- **Rejected — booking.com's light, dense look:** CheckInn keeps the dark theme and generous spacing for the projector.
- **Rejected — booking.com's hotel-page tab bar (Overview, Info & prices, Facilities…):** the CheckInn page is short enough to scroll, and See rooms covers the one jump that matters.
- **Rejected — sign-in walls:** nothing asks for an account.
- **Dropped for lack of data (PRD §6):** map, review quotes, location score, property-highlight details, the "+N photos" tile.

## Key Flows

Flows 1–3 mirror PRD UJ-1 to UJ-3. Flow 4 belongs to the presenter.

### Flow 1 — Thandi books a weekend in Cape Town (UJ-1)

1. Thandi opens CheckInn on her phone. Home shows the search bar with "2 adults · 0 children · 1 room".
2. She types "Cape Town", taps Dates, picks Fri 13 then Sun 15 Nov in the calendar sheet ("2 nights"), taps Done, then Search.
3. Search results: "Cape Town: 2 properties found". Harbourlight Retreat is first:
   - 5 white stars and "4.8 Superb · 248 reviews"
   - Swimming pool and Spa chips
   - "Non-refundable"
   - "2 nights, 2 adults: from R 4 900"
4. She taps the card, swipes through the two photos, then scrolls past the facilities to the room table.
5. She sets Standard Double to 1. The bottom bar reads "1 room · R 4 900,00 · Reserve".
6. She taps Reserve. Booking details shows step 2 and the summary, which says "Non-refundable. This booking can't be cancelled." She enters her name and email.
7. She taps Confirm booking. The button reads "Confirming…".
8. **Climax:** the confirmation page shows a Mint tick, "You're booked!" and `CI-7K3P9Q` in large type with Copy. Below it: "Fri 13 – Sun 15 Nov 2026 · 1 × Standard Double" and the total R 4 900,00.

**Failure:** another visitor booked the last Standard Double during step 6. Thandi lands back on the room table with the same dates and an `alert-error` naming the room. The Standard Double row now reads "Sold out for your dates", so she picks the Family Room.

### Flow 2 — Sipho brings the family to Durban (UJ-2)

1. Sipho opens Occupancy and sets 2 adults, 3 children, 2 rooms. He types "Durban", picks Fri 13 to Wed 18 Nov (5 nights), then Search.
2. "Durban: 2 properties found." He opens Coral Coast Resort.
3. He sets Family Room to 1. The summary warns: "These rooms sleep 4. Your party is 5. Add a room or pick a bigger one." Reserve stays disabled, with the reason announced.
4. He sets Standard Double to 1. The warning clears, and the total updates to R 24 750,00 and is announced.
5. He sees both rooms, the total, and a Mint "Free cancellation" badge with "until Wed 11 Nov 2026, 14:00".
6. He taps Reserve, fills in his details and taps Confirm booking.
7. **Climax:** one confirmation with reference `CI-4M8D2X` covering both rooms and the total R 24 750,00.

**Failure:** as in Flow 1. If either Room type runs out at confirm, he returns to the room table with the alert, and his other selection is kept.

### Flow 3 — Sipho cancels (UJ-3)

1. Two weeks later, Sipho taps "Manage booking" in the header, enters his reference and email, and taps Find booking.
2. The Booking view shows status Confirmed, both rooms, and the free cancellation deadline.
3. He taps Cancel booking. The dialog asks him to confirm, with Keep booking focused.
4. **Climax:** he confirms. "Your booking is cancelled." The status reads Cancelled, and the cancel button is gone.

**Failure:** Thandi looks up her non-refundable booking. She sees "Non-refundable. This booking can't be cancelled." and no cancel button.

### Flow 4 — The presenter runs the demo

1. The presenter runs the reset and opens CheckInn on the projector at 125% zoom.
2. They click the Stellenbosch city tile. Results appear with no typing.
3. They open Oak & Vine Manor, open the photo viewer to show the room, close it, and click See rooms. The page scrolls to the room table.
4. They pick a Family Room, tap Reserve, fill in a demo name and confirm.
5. **Climax:** the booking reference appears in large type on the big screen, and the whole flow has taken under a minute.
6. They read the reference and demo email aloud. A visitor enters them in Manage booking on their phone and sees the same booking.
