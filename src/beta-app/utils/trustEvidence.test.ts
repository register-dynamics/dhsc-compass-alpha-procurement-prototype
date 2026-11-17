import { describe, expect, it } from "vitest";

import {
  combineOutcomes,
  countContractsByTrust,
  countDocumentsByType,
} from "./trustEvidence.js";

describe("trustEvidence", () => {
  describe("combineOutcomes", () => {
    it.each([
      [[null, false, true], true],
      [[null, false], false],
      [[null], null],
      [[], null],
    ])("combines %j as %s", (outcomes, expected) => {
      expect(combineOutcomes(outcomes)).toBe(expected);
    });
  });

  describe("countContractsByTrust", () => {
    it("counts each trust's contracts", () => {
      const counts = countContractsByTrust([
        { contractingAuthority: "Trust A" },
        { contractingAuthority: "Trust B" },
        { contractingAuthority: "Trust A" },
      ]);

      expect([...counts]).toEqual([
        ["Trust A", 2],
        ["Trust B", 1],
      ]);
    });
  });

  describe("countDocumentsByType", () => {
    it("counts each document once, most common type first, then A to Z", () => {
      expect(
        countDocumentsByType([
          { documentId: 1, documentType: "Evaluation" },
          { documentId: 1, documentType: "Evaluation" },
          { documentId: 2, documentType: "Business case" },
          { documentId: 3, documentType: "ODEP assessment" },
          { documentId: 4, documentType: "ODEP assessment" },
        ]),
      ).toEqual([
        { count: 2, documentType: "ODEP assessment" },
        { count: 1, documentType: "Business case" },
        { count: 1, documentType: "Evaluation" },
      ]);
    });
  });
});
