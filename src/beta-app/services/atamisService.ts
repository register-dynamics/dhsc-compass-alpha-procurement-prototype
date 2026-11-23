import { db } from "../database/client.js";
import { TrustExperienceContract } from "../models/trustExperience.js";
import { countContractsByTrust } from "../utils/trustEvidence.js";
import { getProductContracts, ProductScope } from "./trustDataService.js";

// The contracts on the product page's exact card, counted for each trust
export const getContractCountsByContractingAuthorityForProduct = async (
  product: ProductScope,
): Promise<Map<string, number>> => {
  const contracts = await getProductContracts(product);

  return countContractsByTrust(contracts);
};

// The contracts on the product page's exact card with the trust as
// contracting authority. Atamis relates contracts to trusts by name.
export const getContractsForTrustAndProduct = async (
  product: ProductScope,
  contractingAuthority: string,
): Promise<TrustExperienceContract[]> => {
  const contractRefs = (await getProductContracts(product))
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
    .select([
      "contractRef",
      "contractName",
      "businessUnit",
      "owner",
      "procurementDeliveryLead",
    ])
    .where("contractRef", "in", contractRefs)
    .orderBy("contractName", "asc")
    .execute();
};
