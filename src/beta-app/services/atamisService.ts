import { db } from "../database/client.js";

export const getContractCountsByContractingAuthorityForAggregation = async (
  aggregationName: string,
  manufacturerId: number,
  contractingAuthorities: string[],
): Promise<Map<string, number>> => {
  if (contractingAuthorities.length === 0) {
    return new Map();
  }

  const rows = await db
    .withSchema("external")
    .selectFrom("products as p")
    .innerJoin("device_type as dt", "dt.deviceId", "p.deviceId")
    .innerJoin("atamis_to_gmdn as atg", "atg.gmdnCode", "dt.gmdnCode")
    .innerJoin("atamis_contracts as ac", "ac.contractRef", "atg.atamisRef")
    // Only contracts with the aggregation's supplier
    .innerJoin("contracts_to_mhra_manufacturers as cm", (join) =>
      join
        .onRef("cm.contractRef", "=", "ac.contractRef")
        .onRef("cm.manufacturerId", "=", "p.manufacturerId"),
    )
    .select((eb) => [
      "ac.contractingAuthority",
      eb.fn.count<string>("ac.contractRef").distinct().as("contractCount"),
    ])
    .where("p.aggregationName", "=", aggregationName)
    .where("p.manufacturerId", "=", manufacturerId)
    .where("ac.contractingAuthority", "in", contractingAuthorities)
    .groupBy("ac.contractingAuthority")
    .execute();

  return new Map(
    rows.map((row) => [row.contractingAuthority, Number(row.contractCount)]),
  );
};
