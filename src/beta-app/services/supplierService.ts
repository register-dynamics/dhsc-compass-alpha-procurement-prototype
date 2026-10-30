import { db } from "../database/client.js";
import { Manufacturer } from "../database/types.js";

export const getSupplierWithId = async (
  supplierId: number,
): Promise<Manufacturer | null> => {
  const supplier = await db
    .withSchema("external")
    .selectFrom("manufacturers")
    .selectAll()
    .where("manufacturerId", "=", supplierId)
    .executeTakeFirst();
  return supplier ?? null;
};
