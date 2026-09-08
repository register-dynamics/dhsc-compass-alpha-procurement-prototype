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
    .selectFrom("search")
    .selectAll()
    .where("productId", "=", productId)
    .executeTakeFirst();

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const documents = await db
    .selectFrom("make_documents")
    .selectAll()
    .where("productId", "=", productId)
    .execute();

  // Add contacts to documents if there are any
  if (documents.length > 0) {
    const documentIds = documents.map((doc) => doc.documentId);

    const contacts = await db
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

    const documentUsefulness = await db
      .selectFrom("product_documents_useful")
      .select([
        "documentId",
        db.fn
          .max(sql`CASE WHEN "user_id" = ${userId} THEN 1 ELSE 0 END`)
          .as("hasUserMarkedUseful"),
        db.fn.count("documentId").as("totalUsefulCount"),
      ])
      .where("productId", "=", productId)
      .where("documentId", "in", documentIds)
      .groupBy("documentId")
      .execute();

    // Attach contacts to their respective documents
    documents.forEach((doc) => {
      doc.contacts = contacts.filter(
        (contact) => contact.documentId === doc.documentId,
      );

      doc.markedUseful = Number(
        documentUsefulness.find((du) => du.documentId === doc.documentId)
          ?.hasUserMarkedUseful ?? 0,
      );

      doc.totalUsefulCount = Number(
        documentUsefulness.find((du) => du.documentId === doc.documentId)
          ?.totalUsefulCount ?? 0,
      );
    });
  }

  res.render("product", { documents, product });
};

export const postMarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).send("Product ID and Document ID are required");
  }

  const { documentId, productId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .insertInto("product_documents_useful")
      .values({
        // @ts-expect-error: TypeScript may complain about the date format
        // Should be fixed when we switch from SQLite to Postgres
        dateMarkedUseful: new Date().toUTCString(),
        documentId: documentId,
        productId: productId,
        userId,
      })
      .execute();

    const countUseful = await db
      .selectFrom("product_documents_useful")
      .select(db.fn.count("documentId").as("count"))
      .where("documentId", "=", documentId)
      .where("productId", "=", productId)
      .execute();

    res.status(200).send({ count: countUseful[0].count });
  } catch (error) {
    console.error("Failed to mark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to mark as useful");
  }
};

export const postUnmarkUseful = async (req: Request, res: Response) => {
  const result = postMarkUsefulSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).send("Product ID and Document ID are required");
  }

  const { documentId, productId } = result.data;

  // Get the user ID from the session or request context
  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  try {
    await db
      .deleteFrom("product_documents_useful")
      .where("documentId", "=", documentId)
      .where("productId", "=", productId)
      .where("userId", "=", userId)
      .execute();

    const countUseful = await db
      .selectFrom("product_documents_useful")
      .select(db.fn.count("documentId").as("count"))
      .where("documentId", "=", documentId)
      .where("productId", "=", productId)
      .execute();

    res.status(200).send({ count: countUseful[0].count });
  } catch (error) {
    console.error("Failed to unmark as useful", error);
    // TODO: Add proper error handling and logging here
    res.status(500).send("Failed to unmark as useful");
  }
};
