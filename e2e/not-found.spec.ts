import { expect, test } from "@playwright/test";

test("an unknown URL returns the not-found page inside the shell", async ({
  page,
}) => {
  const response = await page.goto("/nope");

  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found · CheckInn");
  await expect(
    page.getByRole("heading", { level: 1, name: "We can't find that page." }),
  ).toBeVisible();

  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/",
  );
  await expect(
    main.getByRole("link", { name: "Back to search" }),
  ).toHaveAttribute("href", "/search");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});
