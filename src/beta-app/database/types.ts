/* eslint-disable perfectionist/sort-modules */
/* eslint-disable perfectionist/sort-interfaces */
import { Generated, Selectable } from "kysely";

import type { DocumentContact } from "../models/documentContact.js";

export interface Database {
  contacts: ContactTable;
  product_matches: ProductMatchesTable;
  evidence_type: EvidenceTypeTable;
  evidence: EvidenceTable;
  documents: DocumentTable;
  organisation_details: OrganisationDetailsTable;
  document_contacts: DocumentContactsTable;
  product_evidence_useful: ProductEvidenceUsefulTable;
  search: SearchTable;
  users: UserTable;
}

export type Contact = Selectable<ContactTable>;

export interface ContactTable {
  contactId: number;
  title: string;
  givenName: string;
  surname: string;
  email: string;
  phoneNo: string;
  role: string;
}

export type ProductMatches = Selectable<ProductMatchesTable>;

export interface ProductMatchesTable {
  productId: number;
  evidenceId: number;
}

export type EvidenceType = Selectable<EvidenceTypeTable>;

export interface EvidenceTypeTable {
  typeOfEvidenceId: number;
  typeOfEvidenceDesc: string;
}

export type Evidence = Selectable<EvidenceTable>;

export interface EvidenceTable {
  evidenceId: number;
  createdAt: Generated<Date>;
  modifiedAt: Date;
  assessmentDate: string;
  rating: string;
  ratingType: string;
  organisationId: number;
  procured: boolean;
  wardDepartment: string;
  summary: string;

  // Utility prop for documents
  documents: Document[];

  // Utility prop for usefulness
  markedUseful: number;
  totalUsefulCount: number;
}

export type Document = Selectable<DocumentTable>;

export interface DocumentTable {
  documentId: number;
  evidenceId: number;
  uploadDate: string;
  expiryDate: string;
  typeOfDocDesc: string;
  organisationId: number;
  urlDirectory: string;

  // Utility prop for contacts
  contacts: DocumentContact[];
}

export type DocumentContacts = Selectable<DocumentContactsTable>;

export interface DocumentContactsTable {
  documentId: number;
  contactId: number;
  discussImplementation: boolean;
  discussTraining: boolean;
  discussOutcomes: boolean;
  discussPharmacyIntegration: boolean;
  discussBusinessCase: boolean;
  discussRealWorldUse: boolean;
  discussEhrIntegration: boolean;
}

export type ProductEvidenceUseful = Selectable<ProductEvidenceUsefulTable>;

export interface ProductEvidenceUsefulTable {
  productId: number;
  evidenceId: number;
  userId: number;
  dateMarkedUseful: Date;
}

export type Search = Selectable<SearchTable>;

export interface SearchTable {
  gmdnName: string;
  productName: string;
  model: string;
  productId: number;
  searchDoc: string;

  // Temp hardcoded properties
  excluded: number;
  procured: number;
  under_review: number;
  checked: boolean;

  // FTS5 virtual table column for MATCH
  search: string;
}

export type User = Selectable<UserTable>;

export interface UserTable {
  id: Generated<number>;
  username: string;
  passwordHash: string;
  oidcSubject: string;
  givenName: string;
  lastName: string;
  createdAt: Generated<Date>;
  modifiedAt: Date;
}

export type OrganisationDetails = Selectable<OrganisationDetailsTable>;

export interface OrganisationDetailsTable {
  organisationId: number;
  organisationName: string;
  organisationCategoryName: string;
  organisationTypeName: string;
}
