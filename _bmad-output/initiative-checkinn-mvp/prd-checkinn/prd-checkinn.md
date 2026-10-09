---
title: CheckInn
status: final
created: 2026-10-09
updated: 2026-10-09
---

# PRD: CheckInn

*Hotel search and booking, modelled on booking.com. Working title — confirm.*

## 0. Document Purpose

This PRD defines the first shippable version of CheckInn for the expo and workshop. It is written for whoever builds it and for the downstream BMAD steps (`bmad-ux`, `bmad-architecture`, tickets). Terms in §3 Glossary are used exactly throughout. Features in §4 hold globally numbered requirements (FR-1 to FR-N) so later documents can cite them. Every inferred decision from the draft has been confirmed, so §10 is empty. Technical choices (SQLite through `better-sqlite3`, how the seed file maps to tables, number formatting) live in `addendum.md`, not here.

Two inputs shape it:

- **Seed data:** `hotel-booking-demo.json` (dataset `checkinn-workshop-starter`, schema 1.0.0), supplied by the PM. It is used as-is. Where this PRD and the file disagree, the file wins, and features the file cannot support are left out (§6).
- **Visual reference:** four booking.com screenshots showing the search bar, the hotel header with gallery and review panel, the facilities list and the availability table. CheckInn follows those patterns with its own brand (`DESIGN.md`), not booking.com's.

## 1. Vision

CheckInn lets a guest go from "I need somewhere to stay in Durban next month" to a confirmed booking in a few minutes. The guest types a destination, picks dates and says who is travelling, sees a list of hotels with the price of the whole stay in rand, opens one, compares its rooms by beds, sleeping capacity and price, and books.

Everything a guest needs to choose is on the page: the area the hotel is in, its star rating and guest score, whether there is a pool, what beds they will sleep in, the cancellation terms and what the stay costs in total. There is no payment and no account. The hotels are fictional, but the flow behaves like the real thing: a booked room is no longer available to the next guest, and a non-refundable booking cannot be cancelled.

"Booking.com clone" means CheckInn copies booking.com's flow (search, results, hotel page, availability table, reserve), not its look or name. CheckInn has its own name and dark theme, and the app never mentions booking.com.

For the expo, CheckInn has to work every time, on a laptop or a phone. It is also the base for the planned intelligent-search enhancement, so search and data should stay simple and well described.

## 2. Target User

### 2.1 Jobs To Be Done

- **Find a place that fits:** see hotels in my destination that can sleep my party on my dates.
- **Know the real cost:** see the total for my stay in rand, not just a nightly rate, before I commit.
- **Choose the right room:** compare beds, capacity and price side by side.
- **Trust the choice:** see stars, guest score, facilities and cancellation terms without leaving the page.
- **Be sure it is booked:** get a booking reference I can use to check or cancel later.
- **Expo context:** as a visitor at the stand, try a real-feeling booking flow on my own phone in a couple of minutes.

### 2.2 Non-Users (v1)

- Hotel owners or staff. There is no property management side.
- Anyone expecting to pay or receive a real reservation.

### 2.3 Key User Journeys

- **UJ-1. Thandi books a weekend in Cape Town.**
  Thandi, planning a weekend away with her partner, opens CheckInn on her phone at the expo stand. The search bar already shows "2 adults · 0 children · 1 room". She types "Cape Town", picks Friday to Sunday and taps Search. Two Cape Town hotels appear. Harbourlight Retreat is first: 5 stars, V&A Waterfront, "4.8 Superb · 248 reviews", pool and spa, "Non-refundable", "2 nights, 2 adults: from R 4 900". She opens it, looks through the photos and the facilities, and reaches the room table. She picks one Standard Double ("1 double bed · Sleeps 2 · Private bathroom", R 2 450 a night) and taps Reserve. She enters her name and email. The summary repeats that the booking is non-refundable. She confirms. **Climax:** the confirmation page shows booking reference `CI-7K3P9Q`, the dates, the room and the total R 4 900,00. **Resolution:** she screenshots the reference. **Edge case:** if another visitor booked the last Standard Double while she was filling in the form, CheckInn tells her the room is no longer available and returns her to the room table with her dates kept.

- **UJ-2. Sipho brings the family to Durban.**
  Sipho needs 2 rooms for 2 adults and 3 children for 5 nights next month. He sets the party in the occupancy picker and searches "Durban". Both Durban hotels have rooms free on those dates and appear. He opens Coral Coast Resort for its pool, picks one Family Room (sleeps 4) and one Standard Double (sleeps 2), and watches the total under the room table update to R 24 750. The hotel offers free cancellation until 48 hours before check-in, which the summary states with the exact deadline. He confirms and gets one booking reference covering both rooms.

- **UJ-3. Sipho cancels.**
  Two weeks before the trip, plans change. Sipho opens "Manage booking", enters his reference and email, sees his booking and its cancellation deadline, and cancels. The status changes to Cancelled and the rooms are available again for those dates. **Edge case:** had Thandi tried the same with her non-refundable booking, she would see the booking with "Non-refundable — this booking can't be cancelled" and no cancel button.

## 3. Glossary

- **Guest** — the person searching and booking. Not signed in.
- **Destination** — the text a Guest types to say where they want to stay. Matched against a City's name, aliases and province, and a Hotel's area and name.
- **City** — one of the 6 destinations in the seed data (Cape Town, Johannesburg, Durban, Pretoria, Stellenbosch, Gqeberha). Has a province. A City has many Hotels.
- **Stay** — a check-in date and a check-out date. **Nights** = check-out minus check-in.
- **Party** — the number of adults, children and Rooms the Guest asks for. Default: 2 adults, 0 children, 1 Room. **Guests** = adults + children.
- **Hotel** — a fictional property in one City, with a name, area, category, description, Star rating, Review score, Facilities, photos, check-in and check-out times, house rules, a Cancellation policy and one or more Room types.
- **Category** — a Hotel's type: luxury, business, family, boutique or budget.
- **Room type** — a kind of room within a Hotel (e.g. "Family Room"). Has a Bed configuration, a maximum number of Guests it sleeps, Room amenities, a Nightly price and an inventory count. A Hotel has 1-to-many Room types.
- **Room** — one unit of a Room type. Inventory is counted in Rooms.
- **Bed configuration** — the beds in a Room type, each Single or Double, with a count (e.g. "1 double bed, 2 single beds").
- **Facility** — a Hotel-level feature from the seed data: Free Wi-Fi, Swimming pool, Spa, Restaurant, Free parking, Gym, Air conditioning, Meeting rooms, Kitchenette, Children's play area.
- **Room amenity** — a Room type-level feature from the seed data: Free Wi-Fi, Private bathroom.
- **Star rating** — the Hotel's 1-to-5 classification. Shown as stars. Separate from Review score.
- **Review score** — the guests' average rating out of 5, with a label and a review count. Fictional.
- **Cancellation policy** — per Hotel, one of: **Free cancellation** (until 48 hours before check-in) or **Non-refundable**.
- **Availability** — the number of Rooms of a Room type still free for every Night of a Stay: inventory minus Confirmed Bookings that overlap those Nights.
- **Nightly price** — the price of one Room for one night, in ZAR, taxes included.
- **Stay total** — Nightly price × Nights × number of Rooms, for one Room type.
- **Booking total** — the sum of Stay totals across a Booking.
- **Search results** — the list of Hotels matching a search.
- **Listing card** — one Hotel's entry in Search results.
- **Hotel page** — the detail page for one Hotel.
- **Booking** — a confirmed reservation of one or more Rooms at one Hotel for one Stay. Has a Booking reference, Guest details, Booking lines, a Booking total, the Hotel's Cancellation policy at the time of booking, and a status (Confirmed or Cancelled).
- **Booking line** — one Room type and the number of Rooms booked of it.
- **Booking reference** — a short unique code identifying a Booking, e.g. `CI-7K3P9Q`.

## 4. Features

### 4.1 Search

**Description:** The search bar sits at the top of the home page and the Search results page, matching booking.com's layout: Destination, Stay dates, Party, Search button. Search is deliberately basic: a text match on Destination plus Availability for the Stay and Party. No filters, no sorting controls, no natural-language search. Realizes UJ-1, UJ-2.

#### FR-1: Search bar
A Guest can enter a Destination, choose a Stay with a date picker, and set the Party (adults, children, Rooms) with an occupancy picker, then submit.

**Consequences (testable):**
- The Party defaults to 2 adults, 0 children, 1 Room.
- The Stay defaults to tomorrow until the day after (1 Night), so a search always returns prices.
- The occupancy picker enforces at least 1 adult and at least 1 Room, and no more Rooms than adults. Maximums: 10 adults, 6 children, 5 Rooms.
- Check-out must be after check-in, and check-in cannot be in the past. A Stay is at most 30 Nights. Invalid input shows a message next to the field and does not submit.

#### FR-2: Default search
A Guest who submits with an empty Destination sees every Hotel with Availability for the Stay (FR-5). Home also offers one-click City searches (FR-27).

**Consequences (testable):**
- With the default Party and Stay and no Bookings, an empty Destination returns all 12 Hotels.

#### FR-3: Destination matching
The system matches the Destination case-insensitively as a partial match against City name, City aliases, province, Hotel area and Hotel name.

**Consequences (testable):**
- "Cape Town" and "CAPE TOWN" return the 2 Cape Town Hotels.
- "cape" returns 6 Hotels, because it also matches the provinces Western Cape and Eastern Cape: the Cape Town, Stellenbosch and Gqeberha Hotels.
- "Waterfront" returns Harbourlight Retreat.
- "Western Cape" returns the Cape Town and Stellenbosch Hotels.
- Leading and trailing spaces are ignored.

#### FR-4: Search criteria are kept
The Destination, Stay and Party carry from the search bar to the Search results, to the Hotel page and into the booking flow, and are visible on each.

**Consequences (testable):**
- Reloading or sharing a Search results or Hotel page URL shows the same criteria and results.
- Changing the criteria on any page re-runs the search with the new values.

### 4.2 Search Results

**Description:** A list of Listing cards, one per matching Hotel, in the style of booking.com's results. Realizes UJ-1, UJ-2.

#### FR-5: Which Hotels appear
A Hotel appears in Search results only if it matches the Destination and has at least one Room type with Availability for every Night of the Stay. Search stays basic: whether the chosen Rooms can sleep the whole Party is checked on the Hotel page (FR-18), not in Search results.

**Consequences (testable):**
- A Hotel whose Room types are all fully booked for any Night of the Stay does not appear.
- A Room type with 0 inventory (Table View City Lodge's Family Room in the seed) never counts as available.
- The Party's size does not hide a Hotel from Search results.

#### FR-6: Listing card
Each Listing card shows: first photo, name, Star rating, area and City, Category, Review score (e.g. "4.8 Superb · 248 reviews"), up to 3 Facilities, the Cancellation policy, and the lowest price for the Stay.

**Consequences (testable):**
- The price line reads like "2 nights, 2 adults: from R 4 900". It is the lowest Nightly price among available Room types × Nights × the Party's Rooms.
- The cheapest Nightly price is shown underneath in smaller text.
- Free cancellation shows as "Free cancellation"; Non-refundable as "Non-refundable".
- Selecting the card opens the Hotel page with the search criteria kept.

#### FR-7: Result count and order
The page states how many Hotels were found.

**Consequences (testable):**
- When every result is in one City, the heading names it: "Cape Town: 2 properties found".
- When results span several Cities, it gives the count only: "6 properties found". An empty Destination gives "All destinations: 12 properties found".
- One result reads "1 property found".
- Results are ordered by Review score, highest first, then by lowest Nightly price. There is no sort control.

#### FR-8: No results
When nothing matches, the page says so and suggests changing the Destination, dates or Party. It does not show an empty list without explanation.

### 4.3 Hotel Page

**Description:** One page per Hotel, following the booking.com structure in the reference screenshots, limited to what the seed data supports: header, photos, review panel, facilities, description, house rules, then the availability table (§4.4). Realizes UJ-1, UJ-2.

#### FR-9: Hotel header
The Hotel page shows name, Star rating, Category, area, City and province, a "See rooms" button that scrolls to the availability table, a save (heart) button and a share button.

**Consequences (testable):**
- "See rooms" is a secondary action. The only Reserve on the Hotel page is the one that starts the booking (FR-18).
- Save toggles a saved state stored in the Guest's browser only. There is no saved-Hotels list.
- Share copies the Hotel page URL, with the search criteria, to the clipboard and confirms with a short message.

#### FR-10: Photos
The Hotel page shows the Hotel's photos (2 per Hotel in the seed): one large, one smaller. Selecting a photo opens a full-screen viewer the Guest can step through and close.

**Consequences (testable):**
- Every photo uses the alt text from the seed data.
- The viewer works by keyboard (arrow keys, Escape) and by swipe on mobile.

#### FR-11: Image fallback
Photos load from remote URLs in the seed data. When a photo cannot load (no internet, URL gone), a neutral placeholder showing the Hotel name takes its place.

**Consequences (testable):**
- With the network blocked, Search results, the Hotel page and the booking flow still work and the layout does not break.

#### FR-12: Review panel
The Hotel page shows the Review score out of 5 with its label and review count.

**Consequences (testable):**
- Labels: 4.5 and above "Superb", 4.0–4.4 "Very good", 3.5–3.9 "Good", 3.0–3.4 "Pleasant". Below 3.0 shows the number without a label.
- The score shows with one decimal and "/ 5", e.g. "4.0 / 5".

#### FR-13: Facilities
The Hotel page shows a "Most popular facilities" list, with an icon and the seed label for each of the Hotel's Facilities.

**Consequences (testable):**
- A Hotel without a pool in the seed does not show "Swimming pool".

#### FR-14: Description and house rules
The Hotel page shows the description and house rules: check-in time, check-out time, children allowed, pets allowed, smoking allowed, and the Cancellation policy in plain words.

#### FR-15: Price match badge
The Hotel page shows a "We Price Match" badge, matching the reference screenshot.

**Consequences (testable):**
- The badge opens a short explanation that this is a demo and no price matching happens. No form, no claim process.

### 4.4 Availability and Rooms

**Description:** The room table is the heart of the Hotel page, modelled on booking.com's availability table. Each Room type is a row showing what the Guest gets and what it costs. The Guest picks how many of each Room type they want and reserves them together. Realizes UJ-1, UJ-2.

#### FR-16: Availability search on the Hotel page
The Hotel page has its own Stay and Party picker above the room table, pre-filled from the search.

**Consequences (testable):**
- Reached without dates (e.g. from a shared link without criteria), the table shows "Select dates to see this property's availability and prices" and lists Room types without prices or quantity selectors. Each row offers "Show prices", which opens the date picker.
- Changing dates or Party here refreshes the table without leaving the page.

#### FR-17: Room table rows
For each Room type the table shows: name, Bed configuration, "Sleeps N" with person icons, Room amenities (e.g. "Private bathroom", "Free Wi-Fi"), Nightly price, Stay total, and "Only N left" when 3 or fewer Rooms are available.

**Consequences (testable):**
- A Room type with no Availability for the Stay shows "Sold out for your dates" and no quantity selector.
- The Hotel's Cancellation policy shows once, above or beside the table.

#### FR-18: Choose rooms
A Guest can set a quantity from 0 up to the Room type's Availability on each row. A summary next to the table shows Rooms selected, Nights, and the Booking total, updating as quantities change.

**Consequences (testable):**
- The Reserve button is disabled while no Rooms are selected.
- If the selected Rooms cannot sleep the Party's Guests, a warning says so and Reserve stays disabled.
- A Booking is for one Hotel only.

### 4.5 Pricing

**Description:** All money is South African rand. The seed prices include taxes with no extra fees, and the Guest always sees the whole Stay, not just a nightly rate. Realizes UJ-1, UJ-2.

#### FR-19: ZAR display
All prices show in rand in South African format: "R 4 900", whole rand on Listing cards and the room table, "R 4 900,00" in the booking summary and confirmation.

#### FR-20: Price calculation
Stay total = Nightly price × Nights × Rooms. Booking total = sum of Stay totals. The booking summary states "Includes taxes. No extra fees."

**Consequences (testable):**
- One Coral Coast Resort Family Room (R 2 750) and one Standard Double (R 2 200) for 5 Nights gives a Booking total of R 24 750.
- The same Stay and Party always produce the same total on the Listing card, the room table, the summary and the confirmation.
- Nightly prices are fixed per Room type, as in the seed: no weekend or seasonal variation and no tourism levy.

### 4.6 Booking

**Description:** A mock version of booking.com's reserve flow: details, confirmation, and later lookup and cancellation. No payment step. Realizes UJ-1, UJ-2, UJ-3.

#### FR-21: Booking details
After Reserve, the Guest sees a summary (Hotel, Stay, Nights, Party, Booking lines, Booking total, Cancellation policy) and a form for first name, last name, email, mobile number (optional), estimated arrival time (optional) and special requests (optional).

**Consequences (testable):**
- Required fields and email format are validated with a message on the field.
- "Back" returns to the Hotel page with the selection kept.
- The page states that no payment is taken and the Hotel is fictional.
- For Free cancellation, the summary shows the exact deadline, e.g. "Free cancellation until 12 Nov 2026, 14:00". For Non-refundable, it says the booking can't be cancelled.

#### FR-22: Confirm booking
A Guest can confirm. The system re-checks Availability, saves the Booking with status Confirmed, and shows a confirmation page.

**Consequences (testable):**
- The confirmation page shows the Booking reference, Hotel, Stay, Booking lines, Guest name, Booking total and Cancellation policy.
- A Booking reference is `CI-` followed by 6 characters from A–Z and 2–9, excluding O, I and L, so it can be read off a projector and typed on a phone.
- After confirmation, Availability for each booked Room type is reduced by the number booked for every Night of the Stay.
- If any Room type no longer has enough Availability, nothing is saved, the Guest is told which Room type ran out, and is returned to the room table with Stay and Party kept (UJ-1 edge case).
- Submitting twice (double-click, refresh) creates only one Booking.

#### FR-23: Manage booking
A Guest can open "Manage booking", enter a Booking reference and email, and see that Booking with its status and Cancellation policy.

**Consequences (testable):**
- A wrong reference, or a right reference with a different email, shows the same "Booking not found" message.

#### FR-24: Cancel booking
From Manage booking, a Guest can cancel a Confirmed Booking when its Cancellation policy allows it, after confirming the action.

**Consequences (testable):**
- Free cancellation: cancel is offered until 48 hours before check-in (the Hotel's check-in time on the check-in date, South African time). After that, the page explains the deadline has passed and offers no cancel button.
- Non-refundable: no cancel button; the page says the booking can't be cancelled.
- On cancel, status becomes Cancelled and the Rooms become available again for those Nights.
- A Cancelled Booking stays viewable and cannot be cancelled again.

### 4.7 Demo Data

**Description:** CheckInn ships with the PM's seed file and can be reset to it between expo sessions.

#### FR-25: Seed data
The app loads `hotel-booking-demo.json` unchanged: 6 Cities, 12 fictional Hotels, 2 Room types each (Standard Double and Family Room).

**Consequences (testable):**
- Every Hotel, Room type, price, score, Facility and policy shown in the app matches the seed file.
- The seed's `isDemo` and fictional notes are respected: the app states in its footer that Hotels, prices and reviews are fictional.
- The seed's image note is respected: the footer also says photos are illustrative and may not show the Hotel.

#### FR-26: Reset demo data
A single command restores the seed data and removes all Bookings.

**Consequences (testable):**
- After reset, a search returns the same results as a fresh clone.

### 4.8 Home

**Description:** The landing page: a short headline, the search bar, and one-click searches by City. Together with FR-2 it is the "default search" from the brief. Realizes UJ-1 and the presenter's demo path.

#### FR-27: City tiles
Home shows the search bar (FR-1) and a tile for each of the 6 Cities with its photo, name and number of Hotels. Selecting a tile runs the search for that City with the current Stay and Party.

**Consequences (testable):**
- Each City photo shows the photographer credit and licence from the seed's source page, as the seed's credit instructions require.
- With the network blocked, the tiles still show the City name and Hotel count (FR-11).

## 5. Cross-Cutting Requirements

- **Runs from a fresh clone:** `npm install && npm run dev` gives a working app with seeded data. No API key or external service. The only network use is loading photos, and the app works without it (FR-11).
- **Mobile and desktop:** every page works on a phone-width screen and a desktop screen. The search bar, photo viewer, room table and booking form are usable by touch.
- **Accessibility:** aim for WCAG 2.1 AA. Every control has an accessible name, pickers work by keyboard, images have alt text, and states are not shown by colour alone.
- **Responsiveness:** on a typical laptop, Search results and the Hotel page render within 1 second, not counting remote photos.
- **Reliability under demo load:** several expo visitors booking at once never oversell a Room (FR-22).
- **Workshop-ready:** the search logic (FR-3, FR-5, FR-7) lives in one module with a documented input and output, so the later intelligent-search work can replace it. The seed's structure and how it maps to the database are documented in the repo.
- **Public repo hygiene:** no real personal data. Bookings made during the demo are stored locally and are not committed.
- **Look and feel:** follows `DESIGN.md`. Booking.com is the reference for layout and flow, but its logo, name and brand colours are not copied.

## 6. Non-Goals (Explicit)

**Not built in v1:**
- No payment, deposit or card capture.
- No Guest accounts, sign-in or saved-Hotels list.
- No filters, sort controls, autocomplete, map search or natural-language search. Intelligent search is a later initiative.
- No Hotel owner or admin interface. Data changes go through the seed file.
- No emails or SMS. The confirmation page is the confirmation.
- No currencies other than ZAR. No multiple rates per Room type.
- No writing reviews.

**Left out because the seed data does not support them:**
- Breakfast included or not. It was in the original brief; the PM chose to leave it out of v1 rather than change the seed (2026-10-09).
- Map and full street address. The seed has area and City only.
- Guest review quotes and a separate location score.
- Property highlights with detail text ("Rooftop, pool bar"). Facilities show as a list instead.
- Queen and King beds. The seed has Single and Double only.
- Separate adult and child limits per Room type. Capacity is total Guests.
- A "+N photos" gallery. The seed has 2 photos per Hotel.

## 7. MVP Scope

### 7.1 In Scope

- Home with the search bar and City tiles (§4.8).
- Search bar with defaults and basic Destination matching (§4.1).
- Search results with Listing cards (§4.2).
- Hotel page: header, photos with fallback, review panel, facilities, description, house rules, price-match badge (§4.3).
- Availability and room table with quantities and running total (§4.4).
- ZAR, tax-inclusive pricing (§4.5).
- Mock booking flow: details, confirmation, manage and cancel, honouring the Cancellation policy (§4.6).
- The 12-Hotel seed file with a reset command (§4.7).

### 7.2 Out of Scope for MVP

- Everything in §6.
- Hosting on Azure. At the expo, the presenter's laptop serves one shared instance over the stand Wi-Fi; visitors' phones use the same instance.

## 8. Success Metrics

**Primary**
- **SM-1:** A first-time expo visitor goes from the home page to a Booking reference without help in under 3 minutes. Validates FR-1 to FR-22 and FR-27.
- **SM-2:** A full expo day runs with no errors shown to visitors and no restart needed. Validates FR-11, FR-22, FR-26, §5.

**Secondary**
- **SM-3:** A workshop participant gets the app running from a fresh clone with one command and no extra setup. Validates §5.
- **SM-4:** Totals agree everywhere they appear for the same Stay and Party (card, table, summary, confirmation). Validates FR-20.

**Counter-metrics (do not optimise)**
- **SM-C1:** Pixel-level likeness to booking.com. Chasing it costs reliability and invites brand problems. Counterbalances SM-1.
- **SM-C2:** Number of features shown. A smaller flow that never breaks beats a bigger one that does. Counterbalances SM-2.

## 9. Open Questions

1. ~~Expo setup~~ — resolved 2026-10-09: one shared instance served from the presenter's laptop over the stand Wi-Fi (§7.2).
2. ~~Default Stay~~ — resolved 2026-10-09: tomorrow for 1 Night (FR-1).
3. ~~Breakfast~~ — resolved 2026-10-09: left out of v1 (§6).
4. **Photo URLs:** the seed's remote photo URLs were not checked for availability. Owner: the PM, at the expo dry-run. FR-11 placeholders cover any that fail.
5. ~~Branding~~ — resolved 2026-10-09: the app never mentions booking.com; the README may say the flow is inspired by it (§1).

## 10. Assumptions Index

None open. All assumptions from the draft were confirmed by the PM on 2026-10-09 and are now requirements.
