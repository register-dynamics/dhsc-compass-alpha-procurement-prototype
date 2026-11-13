import { describe, expect, it } from "vitest";

import {
  getDeviceTypeTrustData,
  getProductRelatedContracts,
  getProductTrustData,
  getRelatedGmdnCodes,
} from "./trustDataService.js";

// These run against the fake data
describe("Trust data service", () => {
  describe("getRelatedGmdnCodes", () => {
    it("finds terms sharing the most specific Device Function category", async () => {
      // Heart rate monitor and blood glucose/blood pressure monitoring system
      expect(await getRelatedGmdnCodes([35198])).toEqual([63088]);
      expect(await getRelatedGmdnCodes([63088])).toEqual([35198]);
    });

    it("relates terms both ways when only one's category holds the other", async () => {
      // The insulin pump tank's most specific category holds insulin
      // syringes, but not the other way round
      expect(await getRelatedGmdnCodes([35839])).toEqual([38502]);
      expect(await getRelatedGmdnCodes([38502])).toEqual([35839]);
    });

    it("returns nothing for a term with no related terms", async () => {
      expect(await getRelatedGmdnCodes([14035])).toEqual([]);
    });

    it("returns nothing for no terms", async () => {
      expect(await getRelatedGmdnCodes([])).toEqual([]);
    });
  });

  // Contracts in the fake data, by GMDN term and supplier:
  //
  // | Contract | Terms        | Supplier |
  // | -------- | ------------ | -------- |
  // | FAKE0006 | 35198        | 13455    |
  // | FAKE0007 | 35839        | 95632    |
  // | FAKE0008 | 35198, 63088 | 45123    |
  // | FAKE0009 | 63088        | 45123    |
  // | FAKE0010 | 63088        |          |
  // | FAKE0011 | 63088        |          |
  // | FAKE0019 | 63088        | 13455    |
  // | FAKE0020 | 35198        | 45123    |
  // | FAKE0021 | 38502        | 95632    |
  // | FAKE0022 | 63088        | 13455    |
  // | FAKE0023 | 63088        | 13455    |
  //
  // 13455 has 3 aggregations for 35198 and 1 (Aorta BP Monitor) for 63088.
  // 45123 has 1 for 63088 and none for 35198. 95632 has 1 for 35839.
  describe("getProductTrustData", () => {
    it("counts the supplier's contracts for related terms only on the related card", async () => {
      const { exact, related } = await getProductTrustData({
        aggregationName: "InsuFlow Pro",
        manufacturerId: 95632,
      });

      // FAKE0007 is for the pump tank, FAKE0021 for insulin syringes
      expect(exact.contractCount).toBe(1);
      expect(related.contractCount).toBe(1);
      expect(related.trustCount).toBe(1);
    });

    it("counts a single-term contract as exact when it's the supplier's only aggregation for the term", async () => {
      const { exact, related } = await getProductTrustData({
        aggregationName: "Aorta BP Monitor",
        manufacturerId: 13455,
      });

      // FAKE0019, FAKE0022 and FAKE0023, with FAKE0006 for a related term
      expect(exact.contractCount).toBe(3);
      expect(related.contractCount).toBe(1);
    });

    it("counts a contract as related when the supplier has other aggregations for the term", async () => {
      const { exact, related } = await getProductTrustData({
        aggregationName: "Heart Rate Monitor",
        manufacturerId: 13455,
      });

      // FAKE0006 could be for Heart Pro or Pacemaker instead
      expect(exact).toMatchObject({
        contractCount: 0,
        peopleCount: 4,
        trustCount: 2,
      });
      // Heart Pro and Pacemaker have the same term, Aorta BP Monitor a related one
      expect(related).toMatchObject({
        contractCount: 4,
        peopleCount: 10,
        trustCount: 9,
      });
    });
  });

  describe("getProductRelatedContracts", () => {
    it("lists the contracts counted on the related card", async () => {
      const aggregation = {
        aggregationName: "Heart Rate Monitor",
        manufacturerId: 13455,
      };
      const contracts = await getProductRelatedContracts(aggregation);
      const { related } = await getProductTrustData(aggregation);

      expect(contracts.map((c) => c.contractRef).sort()).toEqual([
        "FAKE0006",
        "FAKE0019",
        "FAKE0022",
        "FAKE0023",
      ]);
      expect(contracts).toHaveLength(related.contractCount);
      expect(contracts).toContainEqual({
        contractName: "Blood Pressure Monitoring Equipment",
        contractRef: "FAKE0019",
        primaryCategory: "Patient Monitoring Equipment",
        startDate: expect.any(Date) as Date,
        trust: "Baranduin Teaching Hospitals NHS Foundation Trust",
      });
    });
  });

  describe("getDeviceTypeTrustData", () => {
    it("only counts single-term contracts with a supplier of the term as exact", async () => {
      const { exact, related } = await getDeviceTypeTrustData(63088);

      // FAKE0009, FAKE0019, FAKE0022 and FAKE0023. FAKE0008 is for 2 terms
      // and FAKE0010 and FAKE0011 have no supplier, so they're related, as
      // are FAKE0006 and FAKE0020 for the related term.
      expect(exact.contractCount).toBe(4);
      expect(related.contractCount).toBe(5);
    });

    it("counts a contract as related when its supplier has no aggregation for the term", async () => {
      const { exact, related } = await getDeviceTypeTrustData(35198);

      // Only FAKE0006. 45123 has nothing for 35198, so FAKE0020 is related.
      expect(exact.contractCount).toBe(1);
      expect(related.contractCount).toBe(8);
    });

    it("only counts the supplier's evidence and contracts when given one", async () => {
      const { exact, related } = await getDeviceTypeTrustData(35198, 13455);

      expect(exact).toMatchObject({ contractCount: 1, trustCount: 7 });
      expect(related).toMatchObject({
        contractCount: 3,
        peopleCount: 1,
        trustCount: 4,
      });
    });

    it("counts the supplier's multi-term contracts as related", async () => {
      const { exact, related } = await getDeviceTypeTrustData(63088, 45123);

      // FAKE0009, with FAKE0008 for 2 terms and FAKE0020 for a related term
      expect(exact.contractCount).toBe(1);
      expect(related.contractCount).toBe(2);
    });
  });
});
