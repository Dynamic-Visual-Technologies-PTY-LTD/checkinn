import { expect, test } from "@playwright/test";

// Manage booking without a Booking: read-only, so it runs in the parallel
// projects. Looking up and cancelling real Bookings is in e2e/booking/uj-3.spec.ts.

test("the header's Manage booking opens the lookup with a focused headline", async ({ page }) => {
  await page.goto("/credits");
  await page.getByRole("banner").getByRole("link", { name: "Manage booking" }).click();

  await expect(page).toHaveURL(/\/manage$/);
  await expect(page).toHaveTitle("Manage booking · CheckInn");
  await expect(page.getByRole("heading", { level: 1, name: "Manage booking" })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
});

test("an empty submit shows the error summary and looks nothing up", async ({ page }) => {
  await page.goto("/manage");
  await page.getByRole("button", { name: "Find booking" }).click();

  await expect(page.getByRole("group", { name: "2 details need fixing" })).toBeFocused();
  await page.getByRole("link", { name: "Enter your email address." }).click();
  await expect(page.getByRole("textbox", { name: "Email" })).toBeFocused();
  await expect(page).toHaveURL(/\/manage$/);
});

test("an unknown reference shows the not-found alert and keeps the values", async ({ page }) => {
  await page.goto("/manage");
  await page.getByRole("textbox", { name: "Booking reference" }).fill("CI-ZZZZZZ");
  await page.getByRole("textbox", { name: "Email" }).fill("nobody@checkinn.test");
  await page.getByRole("button", { name: "Find booking" }).click();

  await expect(
    page.getByRole("group", {
      name: "We couldn't find that booking. Check the reference and email.",
    }),
  ).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toHaveValue("CI-ZZZZZZ");
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("nobody@checkinn.test");
});

test("a reference in the URL is filled in, normalised and cut to the field's limit", async ({
  page,
}) => {
  await page.goto("/manage?reference=ci-7k3p9q");
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toHaveValue("CI-7K3P9Q");

  await page.goto(`/manage?reference=${"b".repeat(20)}`);
  await expect(page.getByRole("textbox", { name: "Booking reference" })).toHaveValue(
    `CI-${"B".repeat(17)}`,
  );
  await page.getByRole("textbox", { name: "Email" }).fill("nobody@checkinn.test");
  await page.getByRole("button", { name: "Find booking" }).click();
  // Valid for the form: the lookup runs and finds nothing.
  await expect(
    page.getByText("We couldn't find that booking. Check the reference and email."),
  ).toBeVisible();
});

test("has no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/manage");
  await page.getByRole("button", { name: "Find booking" }).click();
  await expect(page.getByRole("group", { name: "2 details need fixing" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
