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
