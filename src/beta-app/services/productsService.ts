import { db } from "../database/client.js";
import { Product, Search } from "../database/types.js";
import { EvidenceCard } from "../models/evidenceCard.js";
import {
  getContractCountsByContractingAuthorityForAggregation,
} from "./atamisService.js";

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

export const getAggregationNameForProductId = async (
  productId: number,
): Promise<null | string> => {
  const product = await db
    .withSchema("external")
    .selectFrom("products")
    .select("aggregationName")
    .where("productId", "=", productId)
    .executeTakeFirst();
  return product?.aggregationName ?? null;
};

export const getAggregationWithName = async (
  aggregationName: string,
): Promise<null | Product[]> => {
  const aggregation = await db
    .withSchema("external")
    .selectFrom("products")
    .selectAll()
    .where("aggregationName", "=", aggregationName)
    .execute();
  return aggregation;
};

export const getCountOfOrganisationsWithExperienceWithAggregation = async (
  aggregationName: string,
): Promise<number> => {
  const result = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence as e", "e.evidenceId", "pe.evidenceId")
    .select((eb) =>
      eb.fn.count<string>("e.organisationId").distinct().as("orgCount"),
    )
    .where("pe.aggregationName", "=", aggregationName)
    .executeTakeFirstOrThrow();
  return Number(result.orgCount);
};

export const getCountOfContactsWithExperienceWithAggregation = async (
  aggregationName: string,
): Promise<number> => {
  const result = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("evidence_contacts as ec", "ec.evidenceId", "pe.evidenceId")
    .select((eb) =>
      eb.fn.count<string>("ec.contactId").distinct().as("contactCount"),
    )
    .where("pe.aggregationName", "=", aggregationName)
    .executeTakeFirstOrThrow();
  return Number(result.contactCount);
};

export const getCountOfDocumentsByTypeForAggregation = async (
  aggregationName: string,
): Promise<{ count: number; documentType: string }[]> => {
  const rows = await db
    .withSchema("app")
    .selectFrom("product_evidence as pe")
    .innerJoin("documents as d", "d.evidenceId", "pe.evidenceId")
    .innerJoin("document_type as dt", "dt.typeOfDocId", "d.typeOfDocId")
    .select((eb) => [
      "dt.typeOfDocDesc as documentType",
      eb.fn.count<string>("d.documentId").distinct().as("count"),
    ])
    .where("pe.aggregationName", "=", aggregationName)
    .groupBy(["dt.typeOfDocId", "dt.typeOfDocDesc"])
    .orderBy("count", "desc")
    .orderBy("documentType", "asc")
    .execute();
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
};

export const getEvidenceCardsForAggregation = async (
  aggregationName: string,
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

  // Atamis contracts are related to trusts by name, as contracting authority
  const contractCounts =
    await getContractCountsByContractingAuthorityForAggregation(
      aggregationName,
      [...new Set(evidenceRows.map((row) => row.organisationName))],
    );

  return evidenceRows.map((row) => ({
    contactCount: Number(row.contactCount),
    evidenceId: row.evidenceId,
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
  }));
};
