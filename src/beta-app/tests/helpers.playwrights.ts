import { expect, Page } from "@playwright/test";

import { testUser } from "./helpers.js";

export async function signIn(page: Page) {
  await page.goto("/sign-in");

  await page.getByLabel("Email address").fill(testUser.username);
  await page.getByLabel("Password").fill(testUser.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/$/);
}
