import { expect, test } from "@playwright/test";

test("homepage loads and shows the main service heading", async ({ page }) => {
  await page.goto("/");

  const headerServiceName = page.locator(".nhsuk-header__service-name").first();

  await expect(headerServiceName).toHaveText(
    "Search and evaluate medical technologies",
  );
  await expect(headerServiceName).toBeVisible();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Search and evaluate medical technologies based on good clinical outcomes",
    }),
  ).toBeVisible();

  await expect(page).toHaveTitle(
    /Compass|Search and evaluate medical technologies/i,
  );
});

test("navigating to non-existent page shows the 404 error page", async ({
  page,
}) => {
  await page.goto("/non-existent-page");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "We cannot find the page you're looking for",
    }),
  ).toBeVisible();

  await expect(page).toHaveTitle(
    /|We cannot find the page you're looking for/i,
  );
});

// NB: We can't test the 500 error page directly because it requires triggering a server-side error, which is not feasible in an end-to-end test environment (at the moment).
