import { expect, test } from "@playwright/test";

test("homepage loads and shows the main service heading", async ({ page }) => {
  await page.goto("/");

  const headerServiceName = page.locator(".nhsuk-header__service-name").first();
  
  await expect(headerServiceName).toHaveText("Search and evaluate medical technologies");
  await expect(headerServiceName).toBeVisible();

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Search and evaluate medical technologies based on good clinical outcomes",
    }),
  ).toBeVisible();
  
  await expect(page).toHaveTitle(/Compass|Search and evaluate medical technologies/i);
});
