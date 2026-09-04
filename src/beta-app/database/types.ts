/* eslint-disable perfectionist/sort-modules */
/* eslint-disable perfectionist/sort-interfaces */
import { Generated, Selectable } from "kysely";

import type { DocumentContact } from "../models/documentContact.js";

export interface Database {
  contacts: ContactTable;
  make_documents: DocumentTable;
  document_contacts: DocumentContactsTable;
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

export type Document = Selectable<DocumentTable>;

export interface DocumentTable {
  productId: number;
  documentId: number;
  uploadDate: string;
  expiryDate: string;
  assessmentDate: string;
  rating: string;
  ratingType: string;
  procured: boolean;
  wardDepartment: string;
  summary: string;
  typeOfDocDesc: string;
  organisationName: string;
  orgCategoryDesc: string;
  orgTypeDesc: string;
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

export type Search = Selectable<SearchTable>;

export interface SearchTable {
  gmdnName: string;
  productName: string;
  model: string;
  productId: number;

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
