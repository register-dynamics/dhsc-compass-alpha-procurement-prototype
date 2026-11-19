import { EvidenceCard } from "../evidenceCard.js";

export interface ProductTrusts {
  aggregationName: string;
  evidenceCards: (EvidenceCard & { href: null | string })[];
  supplierId: number;
  supplierName: string;
}
