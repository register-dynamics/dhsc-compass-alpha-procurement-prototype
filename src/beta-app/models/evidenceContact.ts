export interface EvidenceContact {
  contactId: number;
  discussBusinessCase: boolean;
  discussEhrIntegration: boolean;
  discussImplementation: boolean;
  discussOutcomes: boolean;
  discussPharmacyIntegration: boolean;
  discussRealWorldUse: boolean;
  discussTraining: boolean;
  email: null | string;
  evidenceId: number;
  givenName: string;
  phoneNo: null | string;
  role: string;
  surname: string;
  title: null | string;
}
