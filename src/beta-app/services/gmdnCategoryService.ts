import { db } from "../database/client.js";

const categoryAllowList = [ "Anatomical Specialty", "Device Function" ];

export const getTopLevelCategories = async () => {
  return await db.withSchema("app")
                 .selectFrom("gmdnCategories")
                 .where("parentId", "is", null)
                 .where("name", "in", categoryAllowList)
                 .selectAll()
                 .orderBy("name", "asc")
                 .execute();
};

export const getCategoriesWithParentId = async (parentId: string) => {
  return await db.withSchema("app")
                 .selectFrom("gmdnCategories")
                 .where("parentId", "=", parentId)
                 .selectAll()
                 .orderBy("name", "asc")
                 .execute();
};

export const getCategoryById = async (categoryId: string) => {
  return await db.withSchema("app")
                 .selectFrom("gmdnCategories")
                 .where("id", "=", categoryId)
                 .selectAll()
                 .executeTakeFirstOrThrow();
};

export const getHierarchyForCategory = async (categoryId: string) => {
  const category = await getCategoryById(categoryId);
  const hierarchy = [category];
  let currentCategory = category;
  while (currentCategory.parentId) {
    currentCategory = await getCategoryById(currentCategory.parentId);
    hierarchy.unshift(currentCategory);
  }
  return hierarchy;
};
