/* eslint-disable perfectionist/sort-modules */
/* eslint-disable perfectionist/sort-interfaces */
import { Generated, Selectable } from "kysely";

import type { EvidenceContact } from "../models/evidenceContact.js";
export interface Database {
  contacts: ContactTable;
  product_matches: ProductMatchesTable;
  evidence_type: EvidenceTypeTable;
  evidence: EvidenceTable;
  document_type: DocumentTypeTable;
  documents: DocumentTable;
  organisation_details: OrganisationDetailsTable;
  evidence_contacts: EvidenceContactsTable;
  product_evidence_useful: ProductEvidenceUsefulTable;
  search: SearchTable;
  users: UserTable;
  organisation_user: OrganisationUserTable;
  organisation_contact: OrganisationContactTable;
  organisations: OrganisationsTable;

  // external schema
  gmdn_category: GmdnCategoryTable;
  gmdn_category_term: GmdnCategoryTermTable;
  gmdn: GmdnTable;
  device_type: DeviceTypeTable;
  products: ProductTable;
  atamis_contracts: AtamisContractTable;
  atamis_to_gmdn: AtamisToGmdnMappingTable;
}

export type Contact = Selectable<ContactTable>;

export interface ContactTable {
  contactId: Generated<number>;
  title: null | string;
  givenName: string;
  surname: string;
  email: null | string;
  phoneNo: null | string;
  role: string;
  userId: null | number;
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
  evidenceId: Generated<number>;
  createdAt: Generated<Date> | null;
  modifiedAt: Date | null;
  assessmentDate: null | string;
  rating: null | string;
  ratingType: null | string;
  organisationId: number;
  procured: boolean | null;
  wardDepartment: null | string;
  summary: null | string;
  typeOfEvidenceId: number;

  // Utility prop for documents
  documents: Document[] | null;

  // Utility prop for usefulness
  markedUseful: null | number;
  totalUsefulCount: null | number;

  // Utility prop for contacts
  contacts: EvidenceContact[] | null;
}

export type DocumentType = Selectable<DocumentTypeTable>;

export interface DocumentTypeTable {
  typeOfDocId: number;
  typeOfDocDesc: string;
}

export type Document = Selectable<DocumentTable>;

export interface DocumentTable {
  documentId: number;
  evidenceId: number;
  uploadDate: string;
  expiryDate: string;
  typeOfDocId: number;
  organisationId: number;
  urlDirectory: string;
}

export type EvidenceContacts = Selectable<EvidenceContactsTable>;

export interface EvidenceContactsTable {
  evidenceId: number;
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
  manufacturer: string;

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

export type OrganisationUser = Selectable<OrganisationUserTable>;

export interface OrganisationUserTable {
  organisationId: number;
  userId: number;
}

export type OrganisationContact = Selectable<OrganisationContactTable>;

export interface OrganisationContactTable {
  organisationId: number;
  contactId: number;
}

export type Organisations = Selectable<OrganisationsTable>;

export interface OrganisationsTable {
  organisationId: number;
  organisationName: string;
}

export type GmdnCategory = Selectable<GmdnCategoryTable>;

export interface GmdnCategoryTable {
  nodeId: Generated<number>;
  categoryCode: null | string;
  name: string;
  definition: string;
  parentId: null | number;
  topId: null | number;
}

export type GmdnCategoryTerm = Selectable<GmdnCategoryTermTable>;

export interface GmdnCategoryTermTable {
  categoryCode: string;
  termCode: number;
}

export type Gmdn = Selectable<GmdnTable>;

export interface GmdnTable {
  gmdnCode: number;
  gmdnTermName: string;
}

export type DeviceType = Selectable<DeviceTypeTable>;

export interface DeviceTypeTable {
  deviceId: number;
  gmdnCode: null | number;
  deviceRiskSubType: null | string;
  deviceTypeCode: string;
  deviceTypeName: string;
  manufacturerId: number;
}

export type Product = Selectable<ProductTable>;

export interface ProductTable {
  productId: number;
  udiNumber: null | number;
  deviceId: number;
  isModel: number;
  brandTradeName: null | string;
  model: null | string;
  productCode: null | string;
  manufacturerId: number;
  aggregationName: null | string;
  aggregationType: null | string;
}

export type AtamisContract = Selectable<AtamisContractTable>;

export interface AtamisContractTable {
  contractRef: string;
  contractName: string;
  description: string;
  owner: string;
  status: string;
  supplier: string;
  companyRegestrationNumber: null | string;
  duns: null | number;
  contractingAuthority: string;
  businessUnit: null | string;
  primaryCategory: string;
  secondaryCategory: null | string;
  startDate: Date;
  endDate: Date;
  contractFinderUrl: null | string;
}

export type AtamisToGmdnMapping = Selectable<AtamisToGmdnMappingTable>;

export interface AtamisToGmdnMappingTable {
  atamisRef: string;
  gmdnCode: number;
}
