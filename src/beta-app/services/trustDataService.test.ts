import { describe, expect, it } from "vitest";

import {
  getDeviceTypeTrustData,
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

    it("counts evidence on the supplier's other aggregations in the same or related categories", async () => {
      const { exact, related } = await getProductTrustData({
        aggregationName: "Heart Rate Monitor",
        manufacturerId: 13455,
      });

      expect(exact).toMatchObject({
        contractCount: 1,
        peopleCount: 4,
        trustCount: 3,
      });
      // Heart Pro and Pacemaker have the same term, Aorta BP Monitor a related one
      expect(related).toMatchObject({
        contractCount: 1,
        peopleCount: 10,
        trustCount: 7,
      });
    });
  });

  describe("getDeviceTypeTrustData", () => {
    it("leaves contracts for this term off the related card", async () => {
      const { exact, related } = await getDeviceTypeTrustData(35198);

      // FAKE0008 is for both terms, so it's only on the exact card
      expect(exact.contractCount).toBe(3);
      expect(related.contractCount).toBe(4);
    });

    it("only counts the supplier's evidence and contracts when given one", async () => {
      const { exact, related } = await getDeviceTypeTrustData(35198, 13455);

      expect(exact).toMatchObject({ contractCount: 1, trustCount: 7 });
      expect(related).toMatchObject({
        contractCount: 1,
        peopleCount: 1,
        trustCount: 2,
      });
    });
  });
});
