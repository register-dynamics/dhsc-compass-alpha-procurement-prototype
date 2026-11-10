import { TrustData } from "../../services/trustDataService.js";

/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the model */
export interface ProductAggregation {
  aggregationName: string;
  supplierName: string;
  deviceType: string;

  // This aggregation, and the supplier's devices in the same or related categories
  trustData: TrustData;
  relatedTrustData: TrustData;
}
