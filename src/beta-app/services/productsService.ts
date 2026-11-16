import { db } from "../database/client.js";
import { Product, Search } from "../database/types.js";
import { EvidenceCard } from "../models/evidenceCard.js";
import {
  TrustExperience,
  TrustExperiencePerson,
} from "../models/trustExperience.js";
import { getContractCountsByContractingAuthorityForAggregation } from "./atamisService.js";

export const getProductsByDeviceId = async (deviceId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("products")
    .selectAll()
    .where("deviceId", "=", deviceId)
    .execute();
};

export const getProductWithId = async (
  productId: number,
): Promise<null | Search> => {
  const product = await db
    .withSchema("external")
    .selectFrom("search")
    .selectAll()
    .where("productId", "=", productId)
    .executeTakeFirst();
  return product ?? null;
};

export const getAggregationForProductId = async (
  productId: number,
): Promise<null | { aggregationName: string; manufacturerId: number }> => {
  const product = await db
    .withSchema("external")
    .selectFrom("products")
    .select(["aggregationName", "manufacturerId"])
    .where("productId", "=", productId)
    .executeTakeFirst();
  return product?.aggregationName
    ? {
        aggregationName: product.aggregationName,
        manufacturerId: product.manufacturerId,
      }
    : null;
};

// Different suppliers can use the same aggregation name for unrelated
// products, so an aggregation is identified by its name and supplier.
export const getAggregationWithName = async (
  aggregationName: string,
  manufacturerId: number,
): Promise<null | Product[]> => {
  const aggregation = await db
    .withSchema("external")
    .selectFrom("products")
    .selectAll()
    .where("aggregationName", "=", aggregationName)
    .where("manufacturerId", "=", manufacturerId)
    .execute();
  return aggregation;
};

export const getEvidenceCardsForAggregation = async (
  aggregationName: string,
  manufacturerId: number,
  userId?: number,
): Promise<EvidenceCard[]> => {
  // Contacts and documents are counted in separate queries so the joins
  // don't fan out against each other.
  const evidenceRows = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
    .innerJoin("organisations as o", "o.organisationId", "e.organisationId")
    .leftJoin("evidence_contacts as ec", "ec.evidenceId", "e.evidenceId")
    .select((eb) => [
      "e.evidenceId",
      "e.organisationId",
      "o.organisationName",
      "e.procured",
      eb.fn.count<string>("ec.contactId").distinct().as("contactCount"),
    ])
    .where("pe.aggregationName", "=", aggregationName)
    .where("pe.manufacturerId", "=", manufacturerId)
    .groupBy(["e.evidenceId", "o.organisationName"])
    .orderBy("o.organisationName", "asc")
    .execute();

  if (evidenceRows.length === 0) {
    return [];
  }

  const documentRows = await db
    .withSchema("app")
    .selectFrom("documents as d")
    .innerJoin("document_type as dt", "dt.typeOfDocId", "d.typeOfDocId")
    .select((eb) => [
      "d.evidenceId",
      "dt.typeOfDocDesc as documentType",
      eb.fn.count<string>("d.documentId").distinct().as("count"),
    ])
    .where(
      "d.evidenceId",
      "in",
      evidenceRows.map((row) => row.evidenceId),
    )
    .groupBy(["d.evidenceId", "dt.typeOfDocId", "dt.typeOfDocDesc"])
    .orderBy("count", "desc")
    .orderBy("documentType", "asc")
    .execute();

  const usefulRows = await db
    .withSchema("app")
    .selectFrom("product_evidence_useful")
    .select((eb) => [
      "evidenceId",
      eb.fn.countAll<string>().as("count"),
      eb.fn
        .countAll<string>()
        .filterWhere("userId", "=", userId ?? null)
        .as("markedCount"),
    ])
    .where("aggregationName", "=", aggregationName)
    .where("manufacturerId", "=", manufacturerId)
    .where(
      "evidenceId",
      "in",
      evidenceRows.map((row) => row.evidenceId),
    )
    .groupBy("evidenceId")
    .execute();

  // Atamis contracts are related to trusts by name, as contracting authority
  const contractCounts =
    await getContractCountsByContractingAuthorityForAggregation(
      aggregationName,
      manufacturerId,
      [...new Set(evidenceRows.map((row) => row.organisationName))],
    );

  return evidenceRows.map((row) => {
    const useful = usefulRows.find((u) => u.evidenceId === row.evidenceId);
    return {
      contactCount: Number(row.contactCount),
      evidenceId: row.evidenceId,
      markedUseful: Number(useful?.markedCount ?? 0) > 0,
      organisationId: row.organisationId,
      organisationName: row.organisationName,
      procured: row.procured,
      procurementContractCount: contractCounts.get(row.organisationName) ?? 0,
      sharedDocuments: documentRows
        .filter((doc) => doc.evidenceId === row.evidenceId)
        .map((doc) => ({
          count: Number(doc.count),
          documentType: doc.documentType,
        })),
      usefulCount: Number(useful?.count ?? 0),
    };
  });
};

// What a person on the evidence is happy to discuss, in the order they're
// asked in the sharing flow
const discussTopics = [
  ["discussImplementation", "Implementation"],
  ["discussTraining", "Training"],
  ["discussOutcomes", "Outcomes"],
  ["discussPharmacyIntegration", "Pharmacy integration"],
  ["discussBusinessCase", "Business case"],
  ["discussRealWorldUse", "Real world use"],
  ["discussEhrIntegration", "EHR integration"],
] as const;

// Returns undefined if the organisation doesn't exist
export const getTrustExperienceForAggregation = async (
  aggregationName: string,
  manufacturerId: number,
  organisationId: number,
  userId?: number,
): Promise<TrustExperience | undefined> => {
  const organisation = await db
    .withSchema("app")
    .selectFrom("organisations")
    .select(["organisationId", "organisationName"])
    .where("organisationId", "=", organisationId)
    .executeTakeFirst();

  if (!organisation) {
    return undefined;
  }

  const evidenceRows = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
    .select([
      "e.evidenceId",
      "e.procured",
      "e.assessmentDate",
      "e.wardDepartment",
    ])
    .where("pe.aggregationName", "=", aggregationName)
    .where("pe.manufacturerId", "=", manufacturerId)
    .where("e.organisationId", "=", organisationId)
    .orderBy("e.evidenceId", "asc")
    .execute();

  const evidenceIds = evidenceRows.map((row) => row.evidenceId);

  if (evidenceIds.length === 0) {
    return { ...organisation, people: [], procured: null };
  }

  // Queried separately so the joins don't fan out against each other
  const [contactRows, documentRows, usefulRows] = await Promise.all([
    db
      .withSchema("app")
      .selectFrom("evidence_contacts as ec")
      .innerJoin("contacts as c", "c.contactId", "ec.contactId")
      .selectAll("ec")
      .select([
        "c.title",
        "c.givenName",
        "c.surname",
        "c.role",
        "c.email",
        "c.phoneNo",
      ])
      .where("ec.evidenceId", "in", evidenceIds)
      .orderBy("c.surname", "asc")
      .orderBy("c.givenName", "asc")
      .execute(),
    db
      .withSchema("app")
      .selectFrom("documents as d")
      .innerJoin("document_type as dt", "dt.typeOfDocId", "d.typeOfDocId")
      .select(["d.evidenceId", "dt.typeOfDocDesc as documentType"])
      .where("d.evidenceId", "in", evidenceIds)
      .orderBy("d.uploadDate", "desc")
      .execute(),
    db
      .withSchema("app")
      .selectFrom("product_evidence_useful")
      .select((eb) => [
        "evidenceId",
        eb.fn.countAll<string>().as("count"),
        eb.fn
          .countAll<string>()
          .filterWhere("userId", "=", userId ?? null)
          .as("markedCount"),
      ])
      .where("aggregationName", "=", aggregationName)
      .where("manufacturerId", "=", manufacturerId)
      .where("evidenceId", "in", evidenceIds)
      .groupBy("evidenceId")
      .execute(),
  ]);

  // A person can be on more than 1 piece of the trust's evidence, but gets
  // 1 card, with the documents and topics from all of it
  const contactIds = [...new Set(contactRows.map((row) => row.contactId))];

  const people = contactIds.map((contactId): TrustExperiencePerson => {
    const rows = contactRows.filter((row) => row.contactId === contactId);
    const contact = rows[0];
    // Marking as useful needs a single piece of evidence, so it's the latest
    const evidenceId = Math.max(...rows.map((row) => row.evidenceId));
    const useful = usefulRows.find((row) => row.evidenceId === evidenceId);

    return {
      documents: rows.flatMap((row) => {
        const evidence = evidenceRows.find(
          (e) => e.evidenceId === row.evidenceId,
        );
        return documentRows
          .filter((doc) => doc.evidenceId === row.evidenceId)
          .map((doc) => ({
            assessmentDate: evidence?.assessmentDate ?? null,
            documentType: doc.documentType,
            wardDepartment: evidence?.wardDepartment ?? null,
          }));
      }),
      email: contact.email,
      evidenceId,
      happyToDiscuss: discussTopics
        .filter(([key]) => rows.some((row) => row[key]))
        .map(([, label]) => label),
      markedUseful: Number(useful?.markedCount ?? 0) > 0,
      name: [contact.title, contact.givenName, contact.surname]
        .filter(Boolean)
        .join(" "),
      phoneNo: contact.phoneNo,
      role: contact.role,
      usefulCount: Number(useful?.count ?? 0),
    };
  });

  // The trust procured it if any of its evidence says so
  const outcomes = evidenceRows.map((row) => row.procured);
  const procured = outcomes.includes(true)
    ? true
    : outcomes.includes(false)
      ? false
      : null;

  return { ...organisation, people, procured };
};
