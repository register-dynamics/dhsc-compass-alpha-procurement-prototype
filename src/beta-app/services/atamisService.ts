import { db } from "../database/client.js";

export const getContractCountForAggregation = async (
  aggregationName: string,
): Promise<number> => {
  const result = await db
    .withSchema("external")
    .selectFrom("products as p")
    .innerJoin("device_type as dt", "dt.deviceId", "p.deviceId")
    .innerJoin("atamis_to_gmdn as atg", "atg.gmdnCode", "dt.gmdnCode")
    .innerJoin("atamis_contracts as ac", "ac.contractRef", "atg.atamisRef")
    .select((eb) =>
      eb.fn.count<string>("ac.contractRef").distinct().as("contractCount"),
    )
    .where("p.aggregationName", "=", aggregationName)
    .executeTakeFirstOrThrow();
  return Number(result.contractCount);
};
