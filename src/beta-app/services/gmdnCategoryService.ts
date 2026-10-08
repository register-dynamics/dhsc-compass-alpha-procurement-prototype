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
