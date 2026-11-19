import { db } from "../database/client.js";
import { TrustExperienceContract } from "../models/trustExperience.js";
import { countContractsByTrust } from "../utils/trustEvidence.js";
import { getProductContracts } from "./trustDataService.js";

// The contracts on the product page's exact card, counted for each trust
export const getContractCountsByContractingAuthorityForAggregation = async (
  aggregationName: string,
  manufacturerId: number,
): Promise<Map<string, number>> => {
  const contracts = await getProductContracts({
    aggregationName,
    manufacturerId,
  });

  return countContractsByTrust(contracts);
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
