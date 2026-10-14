# Expo dry-run checklist

> **Status: not yet performed.** This checklist was written by story 15. Nobody has followed it on the presenter laptop with a projector and two phones yet. Fill in the sign-off table at the end when someone does.

This is epic "Done when" item 6: the presenter laptop runs CheckInn, and a projector and two phones use it over the stand Wi-Fi, using plain HTTP. You do not need to read the code. Follow the steps in order and tick each box.

## What you need

- [ ] The presenter laptop, charged, with the charger.
- [ ] A projector (or a second screen) connected to the laptop.
- [ ] Two phones, ideally one Android and one iPhone, charged.
- [ ] A Wi-Fi network that the laptop and both phones can join. At the expo this is the stand Wi-Fi. For a rehearsal, a phone hotspot works.
- [ ] Node.js 24 on the laptop (`node --version` prints `v24.…`).
- [ ] A copy of the repository on the laptop, on the branch or tag you will demo.

The app needs no internet. If the Wi-Fi has no internet, hotel and city photos show grey placeholders with the hotel or city name. That is expected.

## 1. Set up the laptop (once, before the expo)

Run these in a terminal in the repository folder.

1. - [ ] **Delete any old database.** A `data/checkinn.db` made on an older branch has a different bookings table, and then every booking fails. Delete it once. The app makes a new one from the seed on the first request.
   - Windows (PowerShell): `Remove-Item data\checkinn.db*`
   - macOS or Linux: `rm -f data/checkinn.db*`

   If it says the file does not exist, that is fine.
2. - [ ] **Install:** `npm install`
3. - [ ] **Build:** `npm run build`. It must end without errors. It does not create a database file.

## 2. Join the network and find the laptop's address

1. - [ ] Connect the laptop **and both phones** to the **same** Wi-Fi network.
2. - [ ] Find the laptop's IP address on that network:
   - Windows: run `ipconfig` and read the "IPv4 Address" under the Wi-Fi adapter, for example `192.168.1.23`.
   - macOS: run `ipconfig getifaddr en0` (if that prints nothing, try `en1`).
   - Linux: run `hostname -I` and take the first address.

   Write it down: `http://<laptop-ip>:3000`, for example `http://192.168.1.23:3000`. This is the address for the phones.
3. - [ ] If the IP changes (a new network, or the laptop sleeps and reconnects), find it again and use the new address.

## 3. Start the app

1. - [ ] Run: `npm start -- -H 0.0.0.0`

   `-H 0.0.0.0` lets other devices on the network reach the app. Without it, only the laptop can open it. Leave this terminal open for the whole session.
2. - [ ] **Firewall.** The first time, the operating system may ask whether Node.js may accept connections:
   - Windows: in the Windows Defender Firewall prompt, tick **Private networks** and choose **Allow access**. If the stand Wi-Fi is marked as a public network, either mark it private in Windows settings or also tick **Public networks** for the day.
   - macOS: choose **Allow** when asked about incoming connections for `node`.

   If no prompt appears and the phones cannot connect, see "If something goes wrong" below.
3. - [ ] Reset to a clean start (see section 6): open a second terminal in the repository folder and run `npm run db:reset`.

## 4. Projector checks

Open a browser on the laptop, show it on the projector, and go to `http://localhost:3000`. Set the browser zoom to 125%.

- [ ] Home shows "Find your stay.", the search bar and 6 city tiles.
- [ ] Click the **Stellenbosch** city tile. The results show without typing.
- [ ] Open **Oak & Vine Manor**. Open a photo, step to the next one, close it.
- [ ] Click **See rooms**. The page scrolls to the room table.
- [ ] Pick 1 **Family Room**. The booking summary shows the total. Click **Reserve**.
- [ ] Fill in a demo name and email (for example `demo@checkinn.test`) and click **Confirm booking**.
- [ ] "You're booked!" shows with a reference like `CI-7K3P9Q` in large type. Write the reference down.
- [ ] On any Hotel page, click the **share icon** in the hotel header (beside the heart). The projector browser uses `localhost`, where the clipboard works, so the toast "Link copied" is expected here. The fallback dialog is checked on the phones.
- [ ] Repeat the Hotel page check at 150% zoom: only the room table may sit below the fold.

## 5. Phone checks (do this on each phone)

Open the phone's browser and go to `http://<laptop-ip>:3000`. The phone shows a "Not secure" warning for plain HTTP; that is expected.

| Check | Phone 1 | Phone 2 |
|---|---|---|
| Home loads, with the search bar and 6 city tiles | [ ] | [ ] |
| Search "Cape Town" with dates picked in the calendar sheet; "Cape Town: 2 properties found" shows | [ ] | [ ] |
| Open Harbourlight Retreat, swipe through the photos, close the viewer | [ ] | [ ] |
| **Share fallback:** tap the **share icon** in the hotel header (beside the heart). Plain HTTP blocks the clipboard, so a dialog opens with the page link selected (not the "Link copied" toast). Close it | [ ] | [ ] |
| Set 1 Standard Double; the bar at the bottom shows "1 room", the total and Reserve | [ ] | [ ] |
| Tap the bar's summary: the full summary opens as a sheet; close it | [ ] | [ ] |
| Reserve, fill in name and email, Confirm booking: "You're booked!" with a reference | [ ] | [ ] |
| Tap the **copy icon** beside the reference. Plain HTTP blocks the clipboard, so the reference text is selected instead of the "Reference copied" toast | [ ] | [ ] |
| **Booking access through the cookie:** reload the page; the booking still opens on this phone without a lookup | [ ] | [ ] |
| Header **Manage booking**: enter the reference and email from the projector booking (section 4); the same Booking shows | [ ] | [ ] |
| Book a Free cancellation stay (for example Coral Coast Resort in Durban, at least 3 days out), then Cancel booking; "Your booking is cancelled." shows | [ ] | [ ] |
| No page scrolls sideways | [ ] | [ ] |

While both phones book, the projector should keep working. A visitor's Booking can lower what the projector shows ("Only N left", "Sold out for your dates"); that is expected.

## 6. Reset between sessions

1. - [ ] With the app still running, open a second terminal in the repository folder.
2. - [ ] Run: `npm run db:reset`

   It prints `Reset data/checkinn.db: 6 cities, 12 hotels, 24 room types.` (with `\` on Windows). Every Booking is removed, and the catalog is back to the seed. Do **not** stop the app first; the reset is safe while it runs.
3. - [ ] Reload the projector browser. A search with the defaults shows "All destinations: 12 properties found".
4. - [ ] A reference booked before the reset now shows "We couldn't find that booking. Check the reference and email." in Manage booking.

## 7. If something goes wrong

| Problem | What to do |
|---|---|
| The app stopped or the terminal was closed | Run `npm start -- -H 0.0.0.0` again. Bookings made so far are kept. Run `npm run db:reset` only if you want a clean start. |
| Every booking fails on confirm | The database is from an older branch. Stop the app (Ctrl+C), delete `data/checkinn.db*` (section 1), start it again. |
| A phone cannot open the address | Check the phone is on the same Wi-Fi (not mobile data). Check the IP (section 2). Check the app was started with `-H 0.0.0.0`. Check the firewall allows Node.js (section 3). Try opening the address in the laptop's browser too. |
| The Wi-Fi blocks devices from talking to each other ("client isolation") | Use a phone hotspot that the laptop and the phones join instead. |
| "Port 3000 is in use" | Another copy is running. Close it, or start on another port with `npm start -- -H 0.0.0.0 -p 3001` and use `:3001` on the phones. |
| Photos are grey placeholders | No internet; expected. Every flow still works. |
| The page says "Something went wrong on our side. Try again." | Press Try again. If it keeps happening, restart the app (first row). |

## Known open items

Things the build left for a real phone or a human to judge:

- Some copy was written during the build where the UX documents gave none: the Manage booking lead, field labels and messages, the cancel dialog title "Cancel booking", "Cancelled on <date>", "This booking is already cancelled.", the "Your details · <Hotel>" and "Booking CI-XXXXXX" page titles, and the arrival-time options. Read them aloud once and flag anything that sounds wrong.
- Swipe in the photo viewer and screen-reader announcements have not been tried on a real phone. The automated test uses emulated touch.
- "You're booked!" shows for a short time after confirming. After that, opening the same Booking shows the Booking view ("Your booking"). Both are correct.
- Wikimedia photos load at 800px wide, so they can look soft on the projector.
- The Save heart can show unsaved for a moment when a Hotel page loads.

## Sign-off

| Date | Who ran it | Laptop (OS) | Phones (model, browser) | Network | Result | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |
