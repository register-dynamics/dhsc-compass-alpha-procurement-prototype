import { db } from "../database/client.js";

const categoryAllowList = ["Anatomical Specialty", "Device Function"];

export const getTopLevelCategories = async () => {
  return await db
    .withSchema("external")
    .selectFrom("gmdnCategory")
    .where("parentId", "is", null)
    .where("name", "in", categoryAllowList)
    .selectAll()
    .orderBy("name", "asc")
    .execute();
};

export const getCategoriesWithParentId = async (parentId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("gmdnCategory")
    .leftJoin(
      "gmdnCategory as childCategory",
      "childCategory.parentId",
      "gmdnCategory.nodeId",
    )
    .where("gmdnCategory.parentId", "=", parentId)
    .selectAll("gmdnCategory")
    .select((eb) =>
      eb.fn.count<number>("childCategory.nodeId").as("subcategoryCount"),
    )
    .groupBy([
      "gmdnCategory.nodeId",
      "gmdnCategory.categoryCode",
      "gmdnCategory.name",
      "gmdnCategory.definition",
      "gmdnCategory.parentId",
    ])
    .orderBy("name", "asc")
    .execute();
};

export const getCategoryById = async (categoryId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("gmdnCategory")
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
