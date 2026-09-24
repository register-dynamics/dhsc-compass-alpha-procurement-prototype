import { Request, Response } from "express";
import { sql } from "kysely";

import { db } from "../database/client.js";
import { Contact, Organisations, Search } from "../database/types.js";
import { postAddEvidenceContactSelfSchema } from "../models/request-schemas/postAddEvidenceContactSelfSchema.js";
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

  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  const userOrg = await getUserOrganisation(userId);

  if (!userOrg) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user organisation");
  }

  res.render("product", { evidences, organisationName: userOrg.organisationName, product });
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
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  const product = await getProductWithId(productId);

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  const organisation = await getUserOrganisation(userId);

  if (!organisation) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user's organisation");
  }

  res.render("product/add-evidence", { organisationName: organisation.organisationName, productId, productName: product.productName });
};

export const postAddEvidence = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  const product = await getProductWithId(productId);

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  const organisation = await getUserOrganisation(userId);

  if (!organisation) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user's organisation");
  }

  const evidenceId = await createEvidenceCardForOrganisation(organisation.organisationId, productId);

  res.render("product/add-evidence-success", { evidenceId, organisationName: organisation.organisationName, productId, productName: product.productName });
};

export const renderAddEvidenceContactExperience = async (req: Request, res: Response) => {
        const productId = getProductIdFromParams(req);
        
        if (!productId) {
          // TODO: Send to better error handling page
          return res.status(400).send("Valid product ID is required");
        }

  res.render("product/add-evidence-contact-experience", { productId });
};

export const renderAddEvidenceContactAcquisition = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  res.render("product/add-evidence-contact-acquisition", { productId });
};

export const renderAddEvidenceContactDocument = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  res.render("product/add-evidence-contact-document", { productId });
};

export const postAddEvidenceContactDone = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  // TODO: Implement the logic to handle the completion of adding evidence contact

  res.render("product/add-evidence-contact-success", { productId });
};

export const renderAddEvidenceContactSelf = async (req: Request, res: Response) => {
  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  const product = await getProductWithId(productId);

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  const organisation = await getUserOrganisation(userId);

  if (!organisation) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine organisation for user");
  }

  const contact = await getOrCreateContactForUser(userId);

  if (!contact) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine contact for user");
  }

  res.render("product/add-evidence-contact-self", { contact, organisationName: organisation.organisationName, productId, productName: product.productName });
};

export const postAddEvidenceContactSelf = async (req: Request, res: Response) => {
  const result = postAddEvidenceContactSelfSchema.safeParse(req.body);

  if (!result.success) {
    // TODO: Send to better error handling page
    return res.status(400).send("Invalid request body");
  }

  const contactId = result.data.contactId

  const productId = getProductIdFromParams(req);

  if (!productId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid product ID is required");
  }

  const product = await getProductWithId(productId);

  if (!product) {
    // TODO: Send to better error handling page
    return res.status(404).send("Product not found");
  }

  const userId = req.user?.id;

  if (!userId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine user ID");
  }

  const organisation = await getUserOrganisation(userId);

  if (!organisation) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine organisation for user");
  }

  const evidenceCardId = await createEvidenceCardForOrganisation(organisation.organisationId, productId);

  if (!evidenceCardId) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to create evidence card for organisation");
  }

  if (!contactId) {
    // TODO: Send to better error handling page
    return res.status(400).send("Valid contact ID is required");
  }

  const contact = await getContactForUser(userId);

  if (!contact) {
    // TODO: Send to better error handling page
    return res.status(500).send("Unable to determine contact for user");
  }

  const contactName = `${contact.title ?? ""} ${contact.givenName} ${contact.surname}`.trim();

  await linkContactToEvidence(contactId, evidenceCardId);

  res.render("product/add-evidence-contact-success", { contactName: contactName, organisationName: organisation.organisationName, productId, productName: product.productName });
};

async function createEvidenceCardForOrganisation(organisationId: number, productId: number): Promise<number> {
  const genericEvidenceType = 8;
  
  const trx = await db.startTransaction().execute();

  try {
    const evidence = await trx
      .withSchema("app")
      .insertInto("evidence")
      .values({
        organisationId,
        typeOfEvidenceId: genericEvidenceType,
      })
      .returning("evidenceId")
      .executeTakeFirstOrThrow();

    await trx
      .withSchema("app")
      .insertInto("product_matches")
      .values({
        evidenceId : evidence.evidenceId,
        productId,
      })
      .executeTakeFirstOrThrow();

    await trx.commit().execute();
    return evidence.evidenceId;
  } catch (error) {
    await trx.rollback().execute();
    throw error;
  }
}

async function getContactForUser(userId: number): Promise<Contact | null> {
  const contact = await db
    .withSchema("app")
    .selectFrom("contacts")
    .selectAll()
    .where("userId", "=", userId)
    .executeTakeFirst();
  return contact ?? null;
}

async function getOrCreateContactForUser(userId: number): Promise<Contact | null> {
  const contact = await getContactForUser(userId);

  if (!contact) {
    const user = await db
      .withSchema("app")
      .selectFrom("users")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();

    if (!user) {
      throw new Error("Unable to determine user for creating contact");
    }

    const newContact = await db
      .withSchema("app")
      .insertInto("contacts")
      .values({
        email: user.username,
        givenName: user.givenName,
        phoneNo: null,
        role: "TODO: Role",
        surname: user.lastName,
        title: null,
        userId: userId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return newContact;
  }

  return contact;
}

function getProductIdFromParams(req: Request): null | number {
  try {
    const productId = parseInt(req.params.productId as string);
    return isNaN(productId) ? null : productId;
  } catch {
    return null;
  }
}

async function getProductWithId(productId: number): Promise<null | Search> {
  const product = await db
    .withSchema("external")
    .selectFrom("search")
    .selectAll()
    .where("productId", "=", productId)
    .executeTakeFirst();
  return product ?? null;
}

// NOTE: This assumes that the user only belongs to a single organisation
// We know this probably won't hold true for all users, but it's a reasonable assumption for now that we can fix later
async function getUserOrganisation(userId: number): Promise<null | Organisations> {
  const organisation = await db
    .withSchema("app")
    .selectFrom("organisations")
    .selectAll()
    .innerJoin(
      "organisation_user",
      "organisations.organisationId",
      "organisation_user.organisationId"
    )
    .where("organisation_user.userId", "=", userId)
    .executeTakeFirst();
  return organisation ?? null;
}

async function linkContactToEvidence(contactId: number, evidenceId: number): Promise<void> {
  await db
    .withSchema("app")
    .insertInto("evidence_contacts")
    .values({
      contactId,
      discussBusinessCase: false,
      discussEhrIntegration: false,
      discussImplementation: false,
      discussOutcomes: false,
      discussPharmacyIntegration: false,
      discussRealWorldUse: false,
      discussTraining: false,
      evidenceId,
    })
    .executeTakeFirstOrThrow();
}
