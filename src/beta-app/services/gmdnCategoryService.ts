import { db } from "../database/client.js";

export const getTopLevelCategories = async () => {
  return await db.withSchema("app")
                 .selectFrom("gmdnCategories")
                 .where("parentId", "is", null)
                 .selectAll()
                 .orderBy("name", "asc")
                 .execute();
};
