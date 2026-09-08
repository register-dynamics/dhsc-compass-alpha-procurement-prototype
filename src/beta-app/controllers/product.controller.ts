import { Request, Response } from "express";

import { db } from "../database/client.js";

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

    // Attach contacts to their respective documents
    documents.forEach((doc) => {
      doc.contacts = contacts.filter(
        (contact) => contact.documentId === doc.documentId,
      );
    });
  }

  res.render("product", { documents, product });
};
