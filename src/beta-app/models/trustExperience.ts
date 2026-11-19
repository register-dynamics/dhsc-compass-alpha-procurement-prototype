/* eslint-disable perfectionist/sort-interfaces */
/* Justification: Grouping of properties related to how they're displayed on the page */

// 1 trust's experience of 1 aggregation
export interface TrustExperience {
  organisationId: number;
  organisationName: string;

  procured: boolean | null;
  people: TrustExperiencePerson[];
}

// An Atamis contract with the trust as contracting authority
export interface TrustExperienceContract {
  contractRef: string;
  contractName: string;
  businessUnit: null | string;
  owner: string;
}

export interface TrustExperienceDocument {
  documentType: string;
  // Free text, as entered in the sharing flow
  assessmentDate: null | string;
  wardDepartment: null | string;
}

// A person who shared their details on 1 piece of the trust's evidence
export interface TrustExperiencePerson {
  evidenceId: number;
  name: string;
  role: string;
  email: null | string;
  phoneNo: null | string;
  happyToDiscuss: string[];
  documents: TrustExperienceDocument[];

  usefulCount: number;
  markedUseful: boolean;
}
