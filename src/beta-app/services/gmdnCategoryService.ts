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

// Category codes map to every GMDN term beneath them in the hierarchy, not
// just their own, so this counts suppliers across the whole subtree.
export const getSupplierCountsForCategoryCodes = async (
  categoryCodes: string[],
): Promise<Map<string, number>> => {
  if (categoryCodes.length === 0) {
    return new Map();
  }

  const rows = await db
    .withSchema("external")
    .selectFrom("gmdn_category_term as ct")
    .innerJoin("device_type as dt", "dt.gmdnCode", "ct.termCode")
    .where("ct.categoryCode", "in", categoryCodes)
    .select((eb) => [
      "ct.categoryCode",
      eb.fn.count<string>("dt.manufacturerId").distinct().as("supplierCount"),
    ])
    .groupBy("ct.categoryCode")
    .execute();

  return new Map(
    rows.map((row) => [row.categoryCode, Number(row.supplierCount)]),
  );
};

// A leaf category can map to several GMDN terms. These are what the
// /device-type/:deviceTypeId pages are keyed on.
export const getGmdnTermsForCategoryCode = async (categoryCode: string) => {
  const rows = await db
    .withSchema("external")
    .selectFrom("gmdn_category_term as ct")
    .innerJoin("gmdn as g", "g.gmdnCode", "ct.termCode")
    .leftJoin("device_type as dt", "dt.gmdnCode", "g.gmdnCode")
    .where("ct.categoryCode", "=", categoryCode)
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

export const getGmdnTermNameByTermCode = async (termCode: number) => {
  const result = await db
    .withSchema("external")
    .selectFrom("gmdn")
    .where("gmdnCode", "=", termCode)
    .select("gmdnTermName")
    .executeTakeFirstOrThrow();

  return result.gmdnTermName;
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
