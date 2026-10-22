import { db } from "../database/client.js";

export const getProductsByDeviceId = async (deviceId: number) => {
  return await db
    .withSchema("external")
    .selectFrom("products")
    .selectAll()
    .where("deviceId", "=", deviceId)
    .execute();
};
