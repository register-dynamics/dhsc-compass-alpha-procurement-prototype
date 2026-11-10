import { EvidenceCard } from "../evidenceCard.js";

export interface ProductTrusts {
  aggregationName: string;
  evidenceCards: EvidenceCard[];
  supplierId: number;
  supplierName: string;
}
