/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the card */
export interface EvidenceCard {
  evidenceId: number;
  organisationId: number;
  organisationName: string;

  procured: boolean | null;
  contactCount: number;
  procurementContractCount: number;
  sharedDocuments: EvidenceCardDocumentCount[];
}

export interface EvidenceCardDocumentCount {
  count: number;
  documentType: string;
}
