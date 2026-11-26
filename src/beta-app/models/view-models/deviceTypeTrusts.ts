import { TrustCard } from "../evidenceCard.js";
import { Breadcrumb } from "./breadcrumb.js";
import { RelatedContractsTable } from "./relatedContractsTable.js";

// device-type/related-trusts.html
export interface DeviceTypeRelatedTrusts extends DeviceTypeTrustsScope {
  contractsTable: RelatedContractsTable;
}

// device-type/trusts.html
export interface DeviceTypeTrusts extends DeviceTypeTrustsScope {
  trustCards: TrustCard[];
}

export interface DeviceTypeTrustsScope {
  breadcrumbs: Breadcrumb[];
  gmdnCode: number;
  gmdnTerm: string;
  manufacturerId?: number;
  parentHref: string;
  // The related trusts page, without the search query string. Its
  // contracts' pages are beneath it.
  relatedTrustsPath: string;
  searchQueryString: string;
  supplierName?: string;
}
