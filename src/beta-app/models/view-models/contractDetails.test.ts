import { describe, expect, it } from "vitest";

import type { AtamisContract } from "../../database/types.js";

import { getContractDetails } from "./contractDetails.js";

const atamisContract = (
  overrides: Partial<AtamisContract> = {},
): AtamisContract => ({
  businessUnit: "MFT - Clinical Support - Diabetes Centre",
  companyRegestrationNumber: null,
  contractFinderUrl: null,
  contractingAuthority: "Manchester University NHS Foundation Trust",
  contractName: "MFT-Diabetes Technology-ArcTech-2025",
  contractRef: "FAKE0001",
  description: "Insulin pump reservoirs",
  duns: null,
  endDate: new Date(2028, 5, 30),
  owner: "Priya Natarajan",
  primaryCategory: "Insulin infusion devices",
  procurementDeliveryLead: null,
  secondaryCategory: null,
  startDate: new Date(2025, 6, 1),
  status: "Active",
  supplier: "ArcTech Ltd",
  ...overrides,
});

describe("getContractDetails", () => {
  it("gives the contract's values ready to show", () => {
    expect(getContractDetails(atamisContract())).toEqual({
      businessUnit: "MFT - Clinical Support - Diabetes Centre",
      category: "Insulin infusion devices",
      contractName: "MFT-Diabetes Technology-ArcTech-2025",
      endDate: "30 June 2028",
      noticeUrl: null,
      owner: "Priya Natarajan",
      procurementLead: null,
      startDate: "1 July 2025",
      status: "Active",
      supplier: "ArcTech Ltd",
      trust: "Manchester University NHS Foundation Trust",
    });
  });

  it.each([
    [
      "a full link",
      "https://www.contractsfinder.service.gov.uk/Notice/abc",
      "https://www.contractsfinder.service.gov.uk/Notice/abc",
    ],
    [
      "a link without the scheme",
      "www.contractsfinder.service.gov.uk/Notice/abc",
      "https://www.contractsfinder.service.gov.uk/Notice/abc",
    ],
    ["a blank value", "  ", null],
    ["a script link", "javascript:alert(1)", null],
  ])("handles a notice URL that's %s", (_, contractFinderUrl, noticeUrl) => {
    expect(
      getContractDetails(atamisContract({ contractFinderUrl })).noticeUrl,
    ).toBe(noticeUrl);
  });
});
