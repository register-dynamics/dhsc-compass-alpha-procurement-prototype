/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the model */
export interface ProductAggregation {
  aggregationName: string;
  supplierName: string;
  deviceType: string;

  trustsWithExperienceCount: number;
  peopleWithExperienceCount: number;
  procurementContractCount: number;
  relevantDocuments?: [] | { count: number; documentType: string }[];
}
