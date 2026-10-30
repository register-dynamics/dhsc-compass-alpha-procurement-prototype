import { db } from "../database/client.js";
import { Product, Search } from "../database/types.js";

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

export const getCountOfOrganisationsWithExperienceWithProduct = async (
  productId: number,
): Promise<number> => {
  const result = await db
    .withSchema("app")
    .selectFrom("product_matches as pm")
    .innerJoin("evidence as e", "e.evidenceId", "pm.evidenceId")
    .select((eb) =>
      eb.fn.count<string>("e.organisationId").distinct().as("orgCount"),
    )
    .where("pm.productId", "=", productId)
    .executeTakeFirstOrThrow();
  return Number(result.orgCount);
};

export const getCountOfContactsWithExperienceWithProduct = async (
  productId: number,
): Promise<number> => {
  const result = await db
    .withSchema("app")
    .selectFrom("product_matches as pm")
    .innerJoin("evidence_contacts as ec", "ec.evidenceId", "pm.evidenceId")
    .select((eb) =>
      eb.fn.count<string>("ec.contactId").distinct().as("contactCount"),
    )
    .where("pm.productId", "=", productId)
    .executeTakeFirstOrThrow();
  return Number(result.contactCount);
};

export const getCountOfDocumentsByTypeForProduct = async (
  productId: number,
): Promise<{ count: number; type: string }[]> => {
  const rows = await db
    .withSchema("app")
    .selectFrom("product_matches as pm")
    .innerJoin("documents as d", "d.evidenceId", "pm.evidenceId")
    .innerJoin("document_type as dt", "dt.typeOfDocId", "d.typeOfDocId")
    .select((eb) => [
      "dt.typeOfDocDesc as type",
      eb.fn.count<string>("d.documentId").distinct().as("count"),
    ])
    .where("pm.productId", "=", productId)
    .groupBy(["dt.typeOfDocId", "dt.typeOfDocDesc"])
    .orderBy("count", "desc")
    .orderBy("type", "asc")
    .execute();
  return rows.map((row) => ({ ...row, count: Number(row.count) }));
};
