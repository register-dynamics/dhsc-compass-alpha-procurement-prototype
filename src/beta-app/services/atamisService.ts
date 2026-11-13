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
