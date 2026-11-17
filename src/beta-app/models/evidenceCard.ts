/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the card */

// 1 piece of a trust's evidence for an aggregation, which can be marked as
// useful. A trust with a contract for the device but no evidence has a card
// with no evidence ID.
export interface EvidenceCard extends TrustCard {
  evidenceId: null | number;

  usefulCount: number;
  markedUseful: boolean;
}

export interface EvidenceCardDocumentCount {
  count: number;
  documentType: string;
}

// A trust's experience of a set of devices, on a "Trusts sharing experience"
// page. A trust with a contract but no evidence has no organisation ID if it
// isn't an organisation in the app.
export interface TrustCard {
  organisationId: null | number;
  organisationName: string;

  procured: boolean | null;
  contactCount: number;
  procurementContractCount: number;
  sharedDocuments: EvidenceCardDocumentCount[];
}
