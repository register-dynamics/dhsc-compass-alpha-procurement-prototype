import { expect, test } from "@playwright/test";

import { signIn } from "../helpers.playwrights.js";

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("user can perform a search", async ({ page }) => {
  await page.goto("/search");

  await page
    .getByLabel("Search by product, category or supplier")
    .fill("glucose");

  await page.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/\/search-results\?q=glucose/);

  await expect(page.locator("#q")).toHaveValue("glucose");
});
