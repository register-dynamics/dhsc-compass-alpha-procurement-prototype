import { EvidenceCard } from "../evidenceCard.js";

export interface ProductTrusts {
    aggregationName: string;
    evidenceCards: EvidenceCard[];
    supplierName: string;
}
