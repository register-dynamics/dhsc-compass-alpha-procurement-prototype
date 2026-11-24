import type { AtamisContract } from "../../database/types.js";

// contract.html: 1 Atamis contract, ready to show. Values Atamis doesn't
// hold for the contract are null, and their rows are left off the page.
export interface ContractDetails {
  businessUnit: null | string;
  category: string;
  contractName: string;
  endDate: string;
  noticeUrl: null | string;
  owner: null | string;
  procurementLead: null | string;
  startDate: string;
  status: string;
  supplier: string;
  trust: string;
}

// e.g. "1 July 2025"
const formatDate = (date: Date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Atamis doesn't always give the scheme, e.g. "www.contractsfinder...", which
// would make a link relative to the page. Only ever http or https, so a
// stray value can't become a "javascript:" link.
const toNoticeUrl = (url: null | string): null | string => {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    ).href;
  } catch {
    return null;
  }
};

export const getContractDetails = (
  contract: AtamisContract,
): ContractDetails => ({
  businessUnit: contract.businessUnit,
  category: contract.primaryCategory,
  contractName: contract.contractName,
  endDate: formatDate(contract.endDate),
  noticeUrl: toNoticeUrl(contract.contractFinderUrl),
  owner: contract.owner || null,
  procurementLead: contract.procurementDeliveryLead,
  startDate: formatDate(contract.startDate),
  status: contract.status,
  supplier: contract.supplier,
  trust: contract.contractingAuthority,
});
