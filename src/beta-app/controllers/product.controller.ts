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
    .innerJoin("product_matches", "product_matches.evidence_id", "evidence.evidence_id")
    .innerJoin("evidence_type", "evidence_type.type_of_evidence_id", "evidence.type_of_evidence_id")
    .innerJoin("organisation_details", "organisation_details.organisation_id", "evidence.organisation_id")
    .selectAll()
    .where("productId", "=", productId)
    .execute();

  // Add documents to evidences if there are any
  if(evidences.length > 0) {
    const evidenceIds = evidences.map((ev) => ev.evidenceId);
    const documents = await db
      .withSchema("app")
      .selectFrom("documents")
      .where("evidenceId", "in", evidenceIds)
      .execute();

    const documentIds = documents.map((doc) => doc.documentId);

    const contacts = await db
      .withSchema("app")
      .selectFrom("document_contacts as dc")
      .innerJoin("contacts as c", "c.contactId", "dc.contactId")
      .select([
        "dc.documentId",
        "dc.discussImplementation",
        "dc.discussTraining",
        "dc.discussOutcomes",
        "dc.discussPharmacyIntegration",
        "dc.discussBusinessCase",
        "dc.discussRealWorldUse",
        "dc.discussEhrIntegration",
        "c.contactId",
        "c.title",
        "c.givenName",
        "c.surname",
        "c.email",
        "c.phoneNo",
        "c.role",
      ])
      .where("dc.documentId", "in", documentIds)
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

    // Attach contacts to their respective documents
    documents.forEach((doc) => {
      doc.contacts = contacts.filter(
        (contact) => contact.documentId === doc.documentId,
      );
    });

    // Attach documents and usefulness to their evidences
    evidences.forEach((ev) => {
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

  const { productId, evidenceId } = result.data;

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
