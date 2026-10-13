import { expect, test } from "@playwright/test";

import { db } from "../../database/client.js";
import { testUser } from "../helpers.js";
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
    page.getByRole("paragraph").filter({ hasText: "Saccharine & Sons" }),
  ).toBeVisible();

  // TODO: Check more content here once it's not hardcoded
});

test("user can mark an evidence card as useful", async ({ page }) => {
  await page.goto("/product/14236541");

  const markAsUsefulButton = page.locator(".mark-useful-button").first();
  const usefulCount = page.locator(".useful-count").first();

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

test.describe("evidence submission journeys", () => {
  test.describe.configure({ mode: "serial" });

  const productId = "73516943";

  const deleteEvidenceForTestOrganisation = async () => {
    const user = await db
      .withSchema("app")
      .selectFrom("users")
      .select("id")
      .where("username", "=", testUser.username)
      .executeTakeFirst();

    if (!user) return;

    const organisation = await db
      .withSchema("app")
      .selectFrom("organisation_user")
      .select("organisationId")
      .where("userId", "=", user.id)
      .executeTakeFirst();

    if (!organisation) return;

    const evidenceRows = await db
      .withSchema("app")
      .selectFrom("product_matches as pm")
      .innerJoin("evidence as e", "e.evidenceId", "pm.evidenceId")
      .select("pm.evidenceId")
      .where("pm.productId", "=", Number(productId))
      .where("e.organisationId", "=", organisation.organisationId)
      .execute();

    const evidenceIds = evidenceRows.map((row) => row.evidenceId);

    if (evidenceIds.length === 0) return;

    await db
      .withSchema("app")
      .deleteFrom("evidence_contacts")
      .where("evidenceId", "in", evidenceIds)
      .execute();

    await db
      .withSchema("app")
      .deleteFrom("product_matches")
      .where("evidenceId", "in", evidenceIds)
      .execute();

    await db
      .withSchema("app")
      .deleteFrom("evidence")
      .where("evidenceId", "in", evidenceIds)
      .execute();
  };

  test.beforeEach(async () => {
    await deleteEvidenceForTestOrganisation();
  });

  test.afterEach(async () => {
    await deleteEvidenceForTestOrganisation();
  });

  test("user can add an evidence card for their organisation", async ({
    page,
  }) => {
    await page.goto(`/product/${productId}`);

    // Check that the card prompting the user to add an evidence card is visible before interacting with it
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Has your trust used this device?",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Add your trust" }).click();

    // Check we've landed on the add evidence page
    await expect(page).toHaveURL(
      new RegExp(`/product/${productId}/add-evidence/?$`),
    );

    // Check that the heading for adding the trust is visible
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Add Barts Health NHS Trust to this device",
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Confirm and add my trust" })
      .click();

    // We should still be on the same URL after POST
    await expect(page).toHaveURL(
      new RegExp(`/product/${productId}/add-evidence/?$`),
    );

    // Check that the confirmation heading is visible
    await expect(
      page.getByRole("heading", { level: 1, name: "Your trust is now listed" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Return to the device" }).click();

    // Make sure we've returned to the product page
    await expect(page).toHaveURL(new RegExp(`/product/${productId}/?$`));

    // Check that the card prompting the user to add an evidence card is no longer visible
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Has your trust used this device?",
      }),
    ).toHaveCount(0);

    // Check for the presence of the newly added evidence card for the user's organisation
    const cardHeader = page.getByRole("heading", {
      level: 3,
      name: "Barts Health NHS Trust",
    });
    await expect(cardHeader).toBeVisible();
  });

  test("user can add an evidence card for their organisation with their contact details", async ({
    page,
  }) => {
    await page.goto(`/product/${productId}`);

    // Check that the card prompting the user to add an evidence card is visible before interacting with it
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Has your trust used this device?",
      }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Add me as a contact for this device" })
      .click();

    // Check we've landed on the add evidence contact self page
    await expect(page).toHaveURL(
      new RegExp(`/product/${productId}/evidence/add-evidence-contact-self/?$`),
    );

    // Check that the heading for adding the trust is visible
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Add yourself as a contact for this device",
      }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: "Confirm and add me as a contact" })
      .click();

    // We should still be on the same URL after POST
    await expect(page).toHaveURL(
      new RegExp(`/product/${productId}/evidence/add-evidence-contact-self/?$`),
    );

    // Check that the confirmation heading is visible
    await expect(
      page.getByRole("heading", { level: 1, name: "Thank you" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Return to the device" }).click();

    // Make sure we've returned to the product page
    await expect(page).toHaveURL(new RegExp(`/product/${productId}/?$`));

    // Check that the card prompting the user to add an evidence card is no longer visible
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Has your trust used this device?",
      }),
    ).toHaveCount(0);

    // Check for the presence of the newly added evidence card for the user's organisation
    const cardHeader = page.getByRole("heading", {
      level: 3,
      name: "Barts Health NHS Trust",
    });
    await expect(cardHeader).toBeVisible();
  });
});
