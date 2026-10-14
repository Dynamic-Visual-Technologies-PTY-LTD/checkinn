import { expect, test } from "@playwright/test";
import { cancellationDeadline, deadlineLabel } from "@/domain/cancellation";
import {
  blockSeedPhotos,
  bookingStay,
  bookingSummary,
  confirmButton,
  fillGuest,
  pickStay,
  shownReference,
  visible,
} from "../support/booking";
import { uniqueGuestEmail } from "../support/guest";

const TOTAL = /R\s24\s750,00/;

test.beforeEach(async ({ page }) => {
  await blockSeedPhotos(page);
});

// PRD UJ-2, EXPERIENCE.md Flow 2: Sipho brings the family to Durban.
test("UJ-2: 2 adults, 3 children, 2 rooms for 5 nights at Coral Coast Resort", async ({
  page,
}, testInfo) => {
  const stay = bookingStay(testInfo, 1, 5);
  const email = uniqueGuestEmail("sipho");
  const until = `until ${deadlineLabel(cancellationDeadline(stay.checkIn, "14:00"))}`;

  await page.goto("/");
  const bar = page.getByRole("search", { name: "Search hotels" });
  await bar.getByRole("button", { name: /^Occupancy/ }).click();
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button", { name: "Increase children" }).click();
  }
  await page.getByRole("button", { name: "Increase rooms" }).click();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(bar.getByRole("button", { name: /^Occupancy/ })).toContainText(
    "2 adults · 3 children · 2 rooms",
  );
  await bar.getByRole("textbox", { name: "Destination" }).fill("Durban");
  await bar.getByRole("button", { name: /^Dates/ }).click();
  await pickStay(page, stay);
  await bar.getByRole("button", { name: "Search" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Durban: 2 properties found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Coral Coast Resort" }).click();

  await page.getByRole("combobox", { name: "Rooms of Family Room" }).selectOption("1");
  await expect(
    visible(page.getByText("These rooms sleep 4. Your party is 5. Add a room or pick a bigger one.")),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Rooms of Standard Double" }).selectOption("1");
  await visible(page.getByRole("button", { name: "Reserve" })).click();

  // Step 2: both lines, the total and the free-cancellation deadline.
  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
  const summary = bookingSummary(page);
  await expect(summary).toContainText(TOTAL);
  await expect(summary.getByText("Free cancellation", { exact: true })).toBeVisible();
  await expect(summary).toContainText(until);

  await fillGuest(page, { firstName: "Sipho", lastName: "Dlamini", email });
  await confirmButton(page).click();

  // Step 3: one confirmation covering both rooms.
  await expect(page.getByRole("heading", { level: 1, name: "You're booked!" })).toBeVisible();
  await shownReference(page);
  const confirmed = bookingSummary(page);
  await expect(confirmed).toContainText("1 × Standard Double");
  await expect(confirmed).toContainText("1 × Family Room");
  await expect(confirmed).toContainText(TOTAL);
  await expect(confirmed).toContainText(until);
});
