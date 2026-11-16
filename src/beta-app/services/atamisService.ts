import { db } from "../database/client.js";
import { TrustExperienceContract } from "../models/trustExperience.js";
import { getProductContracts } from "./trustDataService.js";

// The contracts on the product page's exact card, counted for each trust
export const getContractCountsByContractingAuthorityForAggregation = async (
  aggregationName: string,
  manufacturerId: number,
  contractingAuthorities: string[],
): Promise<Map<string, number>> => {
  if (contractingAuthorities.length === 0) {
    return new Map();
  }

  const contracts = await getProductContracts({
    aggregationName,
    manufacturerId,
  });

  const counts = new Map<string, number>();
  for (const { contractingAuthority } of contracts) {
    if (contractingAuthorities.includes(contractingAuthority)) {
      counts.set(
        contractingAuthority,
        (counts.get(contractingAuthority) ?? 0) + 1,
      );
    }
  }

  return counts;
};

// The contracts on the product page's exact card with the trust as
// contracting authority. Atamis relates contracts to trusts by name.
export const getContractsForTrustAndAggregation = async (
  aggregationName: string,
  manufacturerId: number,
  contractingAuthority: string,
): Promise<TrustExperienceContract[]> => {
  const contractRefs = (
    await getProductContracts({ aggregationName, manufacturerId })
  )
    .filter(
      (contract) => contract.contractingAuthority === contractingAuthority,
    )
    .map(({ contractRef }) => contractRef);

  if (contractRefs.length === 0) {
    return [];
  }

  return await db
    .withSchema("external")
    .selectFrom("atamis_contracts")
    .select(["contractRef", "contractName", "businessUnit", "owner"])
    .where("contractRef", "in", contractRefs)
    .orderBy("contractName", "asc")
    .execute();
};
