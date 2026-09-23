import { Request, Response } from "express";
import { sql } from "kysely";

import { db } from "../database/client.js";
import { postMarkUsefulSchema } from "../models/request-schemas/postMarkUsefulSchema.js";

export const renderProduct = async (req: Request, res: Response) => {
  let productId;

  try {
    productId = parseInt(req.params.id as string);
  } catch {
    // TODO: Send to better error handling page
    return res.status(400).send("Invalid Product ID");
  }

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Product ID is required");
  }

  const product = await db
    .withSchema("external")
    .selectFrom("search")
    .selectAll()
    .where("productId", "=", productId)
    .executeTakeFirst();

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const evidences = await db
    .withSchema("app")
    .selectFrom("evidence")
    .innerJoin(
      "product_matches",
      "product_matches.evidenceId",
      "evidence.evidenceId",
    )
    .innerJoin(
      "evidence_type",
      "evidence_type.typeOfEvidenceId",
      "evidence.typeOfEvidenceId",
    )
    .innerJoin(
      "organisation_details",
      "organisation_details.organisationId",
      "evidence.organisationId",
    )
    .where("productId", "=", productId)
    .selectAll()
    .execute();

  // Add documents to evidences if there are any
  if (evidences.length > 0) {
    const evidenceIds = evidences.map((ev) => ev.evidenceId);
    const documents = await db
      .withSchema("app")
      .selectFrom("documents")
      .innerJoin(
        "document_type",
        "document_type.typeOfDocId",
        "documents.typeOfDocId",
      )
      .where("evidenceId", "in", evidenceIds)
      .selectAll()
      .execute();

    const userId = req.user?.id;

    const evidenceUsefulness = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select([
        "evidenceId",
        db.fn
          .max(sql`CASE WHEN "user_id" = ${userId} THEN 1 ELSE 0 END`)
          .as("hasUserMarkedUseful"),
        db.fn.count("evidenceId").as("totalUsefulCount"),
      ])
      .where("productId", "=", productId)
      .where("evidenceId", "in", evidenceIds)
      .groupBy("evidenceId")
      .execute();

    const contacts = await db
      .withSchema("app")
      .selectFrom("evidence_contacts as ec")
      .innerJoin("contacts as c", "c.contactId", "ec.contactId")
      .select([
        "ec.evidenceId",
        "ec.discussImplementation",
        "ec.discussTraining",
        "ec.discussOutcomes",
        "ec.discussPharmacyIntegration",
        "ec.discussBusinessCase",
        "ec.discussRealWorldUse",
        "ec.discussEhrIntegration",
        "c.contactId",
        "c.title",
        "c.givenName",
        "c.surname",
        "c.email",
        "c.phoneNo",
        "c.role",
      ])
      .where("ec.evidenceId", "in", evidenceIds)
      .execute();

    // Attach contacts, documents, and usefulness to their evidences
    evidences.forEach((ev) => {
      ev.contacts = contacts.filter(
        (contact) => contact.evidenceId === ev.evidenceId,
      );

      ev.documents = documents.filter(
        (doc) => doc.evidenceId === ev.evidenceId,
      );

      ev.markedUseful = Number(
        evidenceUsefulness.find((eu) => eu.evidenceId === ev.evidenceId)
          ?.hasUserMarkedUseful ?? 0,
      );

      ev.totalUsefulCount = Number(
        evidenceUsefulness.find((eu) => eu.evidenceId === ev.evidenceId)
          ?.totalUsefulCount ?? 0,
      );
    });
  }

  res.render("product", { evidences, product });
};

export const postMarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).send("Product ID and Evidence ID are required");
  }

  const { evidenceId, productId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .withSchema("app")
      .insertInto("product_evidence_useful")
      .values({
        // @ts-expect-error: TypeScript may complain about the date format
        // Should be fixed when we switch from SQLite to Postgres
        dateMarkedUseful: new Date().toUTCString(),
        evidenceId: evidenceId,
        productId: productId,
        userId,
      })
      .execute();

    const countUseful = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select(db.fn.count("evidenceId").as("count"))
      .where("evidenceId", "=", evidenceId)
      .where("productId", "=", productId)
      .execute();

    // This gets type "string | number | bigint" for some reason
    const count = Number(countUseful[0].count);

    res.status(200).send({ count: count });
  } catch (error) {
    console.error("Failed to mark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to mark as useful");
  }
};

export const postUnmarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).send("Product ID and Evidence ID are required");
  }

  const { evidenceId, productId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .withSchema("app")
      .deleteFrom("product_evidence_useful")
      .where("evidenceId", "=", evidenceId)
      .where("productId", "=", productId)
      .where("userId", "=", userId)
      .execute();

    const countUseful = await db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select(db.fn.count("evidenceId").as("count"))
      .where("productId", "=", productId)
      .where("evidenceId", "=", productId)
      .execute();

    // This gets type "string | number | bigint" for some reason
    const count = Number(countUseful[0].count);

    res.status(200).send({ count: count });
  } catch (error) {
    console.error("Failed to unmark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to unmark as useful");
  }
};

export const renderAddEvidence = async (req: Request, res: Response) => {
  let productId;

  try {
    productId = parseInt(req.params.id as string);
  } catch {
    // TODO: Send to better error handling page
    return res.status(400).send("Invalid Product ID");
  }

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Product ID is required");
  }

  // TODO: Implement
  // Lookup the product to make sure it exists, then pull the product name
  // Get user's organisation

  res.render("product/add-evidence", { productId });
};

export const postAddEvidence = async (req: Request, res: Response) => {
  // TODO: Implement the logic to add evidence for the product

  res.render("product/add-evidence-success");
};

export const renderAddEvidenceContact = async (req: Request, res: Response) => {
  res.render("product/add-evidence-contact-1");
};

export const renderAddEvidenceContactSelf = async (
  req: Request,
  res: Response,
) => {
  res.render("product/add-evidence-contact-self");
};

export const postAddEvidenceContactSelf = async (
  req: Request,
  res: Response,
) => {
  // TODO: Implement the logic to add contact details for the evidence for self

  res.render("product/add-evidence-contact-self-success");
};

export const postAddEvidenceContact = async (req: Request, res: Response) => {
  // TODO: Implement the logic to add contact details for the evidence

  res.render("product/add-evidence-contact-success");
};
