import { expect, test } from "@playwright/test";

import { signIn } from "../helpers.playwrights.js";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("user can search and access product details", async ({ page }) => {
  await page.goto("/search");

  await page
    .getByLabel("Search by product, category or supplier")
    .fill("glucose");

  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/search-results\?q=glucose/);

  await expect(page.locator("#q")).toHaveValue("glucose");

  // Access product details
  await page
    .getByRole("link", { name: "GlucoSense Flex Reader – GlucoSense" })
    .click();

  await expect(page).toHaveURL(/\/product\/14236541/);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "GlucoSense Flex Reader – GlucoSense",
    }),
  ).toBeVisible();

  await expect(
    page.getByRole("paragraph").filter({ hasText: "Saccharine & Sons" })
  ).toBeVisible();

  // TODO: Check more content here once it's not hardcoded  
});

test("user can mark an evidence card as useful", async ({ page }) => {
  await page.goto("/product/14236541");

  const markAsUsefulButton = page.locator(".mark-useful-button").first();
  const usefulCount = page.locator(".useful-count").first();

  await markAsUsefulButton.scrollIntoViewIfNeeded();

  await expect(markAsUsefulButton).toBeVisible();

  // Check that the useful count is initially empty
  await expect(usefulCount).toHaveText(/\s*/);

  await markAsUsefulButton.click();

  await expect(markAsUsefulButton).toContainText("Marked as useful");
  await expect(usefulCount).toContainText("1 person found this useful");

  // Reset after test
  // TODO: We should have a more robust way to reset the useful state after the test
  // Probably by generating unique test data for each run rather than replying on the existing database
  await markAsUsefulButton.click();
});
