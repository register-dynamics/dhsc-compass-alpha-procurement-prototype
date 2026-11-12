import { sql } from "kysely";

import { db } from "../database/client.js";

const categoryAllowList = ["Anatomical Specialty", "Device Function"];

export const getTopLevelCategories = async () => {
  return await db
    .withSchema("external")
    .selectFrom("gmdn_category")
    .where("parentId", "is", null)
    .where("name", "in", categoryAllowList)
    .selectAll()
    .orderBy("name", "asc")
    .execute();
};

export const getCategoriesWithParentId = async (parentId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("gmdn_category")
    .leftJoin(
      "gmdn_category as childCategory",
      "childCategory.parentId",
      "gmdn_category.nodeId",
    )
    .where("gmdn_category.parentId", "=", parentId)
    .selectAll("gmdn_category")
    .select((eb) =>
      eb.fn.count<number>("childCategory.nodeId").as("subcategoryCount"),
    )
    .groupBy([
      "gmdn_category.nodeId",
      "gmdn_category.categoryCode",
      "gmdn_category.name",
      "gmdn_category.definition",
      "gmdn_category.parentId",
    ])
    .orderBy("name", "asc")
    .execute();
};
// Set return type for clarity
export const getCategoryById = async (categoryId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("gmdn_category")
    .where("nodeId", "=", categoryId)
    .selectAll()
    .executeTakeFirstOrThrow();
};

export const getHierarchyForCategory = async (categoryId: number) => {
  const category = await getCategoryById(categoryId);
  const hierarchy = [category];
  let currentCategory = category;
  while (currentCategory.parentId) {
    currentCategory = await getCategoryById(currentCategory.parentId);
    hierarchy.unshift(currentCategory);
  }
  return hierarchy;
};

export const getCategoryCodeById = async (categoryId: number) => {
  const result = await db
    .withSchema("external")
    .selectFrom("gmdn_category")
    .where("nodeId", "=", categoryId)
    .select("categoryCode")
    .executeTakeFirstOrThrow();

  return result.categoryCode;
};

export const getTermCodeByCategoryCode = async (categoryCode: string) => {
  const result = await db
    .withSchema("external")
    .selectFrom("gmdn_category_term")
    .where("categoryCode", "=", categoryCode)
    .select("termCode")
    .executeTakeFirstOrThrow();

  return result.termCode;
};

// Pairs each root category with itself and every category beneath it. Walks by
// nodeId because a category code can appear at several places in the tree, and
// a category's own terms don't reliably include those of its descendants.
const withCategorySubtrees = (rootIds: number[]) =>
  db.withSchema("external").withRecursive("subtree", (qb) =>
    qb
      .selectFrom("gmdn_category")
      .where("nodeId", "in", rootIds)
      .select([
        "nodeId as rootId",
        "nodeId",
        "categoryCode",
        sql<number>`1`.as("depth"),
      ])
      .unionAll(
        qb
          .selectFrom("gmdn_category as child")
          .innerJoin("subtree", "subtree.nodeId", "child.parentId")
          .select([
            "subtree.rootId",
            "child.nodeId",
            "child.categoryCode",
            sql<number>`subtree.depth + 1`.as("depth"),
          ]),
      ),
  );

// The number of distinct GMDN terms at or beneath each category. Matches the
// length of the list from getGmdnTermsBeneathCategory.
export const getDeviceTypeCountsForCategories = async (
  categoryIds: number[],
): Promise<Map<number, number>> => {
  if (categoryIds.length === 0) {
    return new Map();
  }

  const rows = await withCategorySubtrees(categoryIds)
    .selectFrom("subtree")
    .innerJoin(
      "gmdn_category_term as ct",
      "ct.categoryCode",
      "subtree.categoryCode",
    )
    .innerJoin("gmdn as g", "g.gmdnCode", "ct.termCode")
    .select((eb) => [
      "subtree.rootId",
      eb.fn.count<string>("g.gmdnCode").distinct().as("deviceTypeCount"),
    ])
    .groupBy("subtree.rootId")
    .execute();

  return new Map(rows.map((row) => [row.rootId, Number(row.deviceTypeCount)]));
};

// Every GMDN term at or beneath a category. These are what the
// /category/:categoryId/device-type/:deviceTypeId pages are keyed on.
export const getGmdnTermsBeneathCategory = async (categoryId: number) => {
  const rows = await withCategorySubtrees([categoryId])
    .selectFrom("subtree")
    .innerJoin(
      "gmdn_category_term as ct",
      "ct.categoryCode",
      "subtree.categoryCode",
    )
    .innerJoin("gmdn as g", "g.gmdnCode", "ct.termCode")
    .leftJoin("device_type as dt", "dt.gmdnCode", "g.gmdnCode")
    .select((eb) => [
      "g.gmdnCode",
      "g.gmdnTermName",
      eb.fn.count<string>("dt.manufacturerId").distinct().as("supplierCount"),
    ])
    .groupBy(["g.gmdnCode", "g.gmdnTermName"])
    .orderBy("g.gmdnTermName", "asc")
    .execute();

  return rows.map((row) => ({
    ...row,
    supplierCount: Number(row.supplierCount),
  }));
};

export const getDeviceTypesByGmdnCode = async (gmdnCode: number) => {
  return db
    .withSchema("external")
    .selectFrom("device_type")
    .where("gmdnCode", "=", gmdnCode)
    .selectAll()
    .execute();
};

export const getDeviceTypeById = async (deviceTypeId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("device_type")
    .where("deviceId", "=", deviceTypeId)
    .selectAll()
    .executeTakeFirstOrThrow();
};

export const getGmdnTermForDeviceId = async (deviceTypeId: number) => {
  const result = await db
    .withSchema("external")
    .selectFrom("gmdn as g")
    .innerJoin("device_type as d", "d.gmdnCode", "g.gmdnCode")
    .where("d.deviceId", "=", deviceTypeId)
    .select("g.gmdnTermName")
    .executeTakeFirstOrThrow();

  return result.gmdnTermName;
};

export const getGmdnTermWithCode = async (gmdnCode: number) => {
  return await db
    .withSchema("external")
    .selectFrom("gmdn")
    .where("gmdnCode", "=", gmdnCode)
    .selectAll()
    .executeTakeFirst();
};

// A GMDN term sits in many categories, so a page without a browsing path of
// its own needs one picked for it. This is the most specific category,
// preferring the Device Function tree, and is the same each time.
export const getBrowsePathForDeviceType = async (gmdnCode: number) => {
  const topLevelCategories = await getTopLevelCategories();

  const categories = await withCategorySubtrees(
    topLevelCategories.map(({ nodeId }) => nodeId),
  )
    .selectFrom("subtree")
    .innerJoin(
      "gmdn_category_term as ct",
      "ct.categoryCode",
      "subtree.categoryCode",
    )
    .where("ct.termCode", "=", gmdnCode)
    .select(["subtree.nodeId", "subtree.rootId"])
    .orderBy("subtree.depth", "desc")
    .orderBy("subtree.nodeId", "asc")
    .execute();

  const deviceFunctionId = topLevelCategories.find(
    ({ name }) => name === "Device Function",
  )?.nodeId;
  const category =
    categories.find(({ rootId }) => rootId === deviceFunctionId) ??
    categories.at(0);

  return category && { categoryId: category.nodeId, gmdnCode };
};

// As getBrowsePathForDeviceType, for the GMDN term of a device
export const getBrowsePathForDevice = async (deviceId: number) => {
  const device = await db
    .withSchema("external")
    .selectFrom("device_type")
    .where("deviceId", "=", deviceId)
    .select("gmdnCode")
    .executeTakeFirst();

  if (device?.gmdnCode == null) {
    return undefined;
  }

  return await getBrowsePathForDeviceType(device.gmdnCode);
};
