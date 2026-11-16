/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the card */
// A trust with a contract for the device but no evidence has a card with no
// evidence ID, and no organisation ID if it isn't an organisation in the app
export interface EvidenceCard {
  evidenceId: null | number;
  organisationId: null | number;
  organisationName: string;

  procured: boolean | null;
  contactCount: number;
  procurementContractCount: number;
  sharedDocuments: EvidenceCardDocumentCount[];

  usefulCount: number;
  markedUseful: boolean;
}

export interface EvidenceCardDocumentCount {
  count: number;
  documentType: string;
}
