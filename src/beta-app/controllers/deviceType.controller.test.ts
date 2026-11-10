import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../app.js";
import { loginAndGetCookie } from "../tests/helpers.js";

// Heart rate monitor, which is in several categories
const deviceTypeId = "35198";
const deviceTypePath = `/category/9990/device-type/${deviceTypeId}`;

describe("Device type controller", () => {
  let cookies: string;

  const get = (path: string) => request(app).get(path).set("Cookie", cookies);

  const supplierPath = async () => {
    const response = await get(deviceTypePath);
    const match = new RegExp(`href="(${deviceTypePath}/supplier/\\d+)"`).exec(
      response.text,
    );
    if (!match) {
      throw new Error("No supplier link found");
    }
    return match[1];
  };

  beforeEach(async () => {
    cookies = await loginAndGetCookie();
  });

  it("GET a device type shows the path through the category in the URL", async () => {
    const response = await get(deviceTypePath);

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/categories"');
    expect(response.text).toContain('href="/category/9986"');
    expect(response.text).toContain('href="/category/9990"');
  });

  it("GET a device type follows a different category when given one", async () => {
    const response = await get(`/category/2016/device-type/${deviceTypeId}`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/category/2143"');
    expect(response.text).not.toContain('href="/category/9986"');
  });

  it("GET a device type from an ancestor of its category works", async () => {
    const response = await get(`/category/9986/device-type/${deviceTypeId}`);

    expect(response.status).toBe(200);
  });

  it.each([
    ["an unknown category", `/category/999999/device-type/${deviceTypeId}`],
    ["a non-numeric category", `/category/abc/device-type/${deviceTypeId}`],
    ["a category it isn't in", `/category/10027/device-type/${deviceTypeId}`],
    ["an unknown device type", "/category/9990/device-type/999999"],
  ])("GET a device type with %s returns 404", async (_, path) => {
    const response = await get(path);

    expect(response.status).toBe(404);
  });

  it("GET a device type's supplier adds the device type to the path", async () => {
    const response = await get(await supplierPath());

    expect(response.status).toBe(200);
    expect(response.text).toContain('href="/category/9990"');
    expect(response.text).toContain(`href="${deviceTypePath}"`);
  });

  it("GET a device type's supplier returns 404 for a category it isn't in", async () => {
    const path = await supplierPath();
    const response = await get(
      path.replace("/category/9990", "/category/10027"),
    );

    expect(response.status).toBe(404);
  });

  it("no longer serves the old device type URL", async () => {
    const response = await get(`/device-type/${deviceTypeId}`);

    expect(response.status).toBe(404);
  });

  describe("available trust data", () => {
    const cardHeadings = (html: string) =>
      [...html.matchAll(/nhsuk-card__heading[^>]*>\s*([^<]+?)\s*</g)].map(
        ([, heading]) => heading,
      );

    it("GET a device type shows trust data for it and similar types", async () => {
      const response = await get(deviceTypePath);

      expect(cardHeadings(response.text)).toEqual([
        "9 trusts have experience with this type of device",
        "8 trusts have experience with similar types of devices",
      ]);
    });

    it("GET a device type's supplier shows trust data for that supplier", async () => {
      const response = await get(`${deviceTypePath}/supplier/13455`);

      expect(cardHeadings(response.text)).toEqual([
        "7 trusts have Aorta Solutions Heart rate monitor experience",
        "4 trusts have experience with devices in the same or related categories",
      ]);
    });

    it("GET a product shows trust data for it and the supplier's related devices", async () => {
      const response = await get(
        `${deviceTypePath}/supplier/13455/product/Heart%20Rate%20Monitor`,
      );

      expect(cardHeadings(response.text)).toEqual([
        "3 trusts have experience with Heart Rate Monitor",
        "9 trusts have experience with Aorta Solutions devices in the same or related categories",
      ]);
    });

    it("GET a product links to its related trusts within the same path", async () => {
      const productPath = `${deviceTypePath}/supplier/13455/product/Heart%20Rate%20Monitor`;
      const response = await get(productPath);

      expect(response.text).toContain(`href="${productPath}/related-trusts"`);
    });
  });

  describe("related trusts pages", () => {
    const productPath = `${deviceTypePath}/supplier/13455/product/Heart%20Rate%20Monitor`;
    const searchProductPath = "/supplier/13455/product/Heart%20Rate%20Monitor";

    const contractNames = (html: string) =>
      [
        ...html.matchAll(
          /role="rowheader"[\s\S]*?<\/span>\s*([^<]+?)\s*<\/th>/g,
        ),
      ].map(([, name]) => name);

    it("GET related trusts lists the related contracts, most recent first", async () => {
      const response = await get(`${productPath}/related-trusts`);

      expect(response.status).toBe(200);
      expect(response.text).toContain("Showing 3 contracts.");
      expect(response.text).toContain(
        "Most recent contracts are listed first.",
      );
      expect(contractNames(response.text)).toEqual([
        "WAH - Cardiology - Ambulatory Blood Pressure Monitors",
        "Blood Pressure Monitoring Equipment",
        "Vital Signs Monitoring - Aorta",
      ]);
      expect(response.text).toContain("February 2026");
      expect(response.text).toContain(`href="${productPath}"`);
    });

    it("GET related trusts filters by category and keeps the filter when sorting", async () => {
      const response = await get(
        `${productPath}/related-trusts?category=Patient%20Monitoring%20Equipment&category=Unknown`,
      );

      expect(response.text).toContain("Filter by category (1 applied)");
      expect(response.text).toContain("Showing 2 of 3 contracts.");
      expect(contractNames(response.text)).toEqual([
        "Blood Pressure Monitoring Equipment",
        "Vital Signs Monitoring - Aorta",
      ]);
      expect(response.text).toContain(
        'href="?category=Patient+Monitoring+Equipment&amp;sort=trust&amp;order=ascending"',
      );
    });

    it("GET related trusts sorts by the column in the URL", async () => {
      const response = await get(
        `${productPath}/related-trusts?sort=trust&order=descending`,
      );

      expect(response.text).toContain("Contracts are listed Z to A by trust.");
      // Whitwell, Waymeet, then Baranduin
      expect(contractNames(response.text)).toEqual([
        "WAH - Cardiology - Ambulatory Blood Pressure Monitors",
        "Vital Signs Monitoring - Aorta",
        "Blood Pressure Monitoring Equipment",
      ]);
    });

    it("GET related trusts from search keeps the search on every link", async () => {
      const response = await get(
        `${searchProductPath}/related-trusts?q=heart&page=2`,
      );

      expect(response.status).toBe(200);
      expect(response.text).toContain("/search-results?q=heart&amp;page=2");
      expect(response.text).toContain(
        `href="${searchProductPath}?q=heart&amp;page=2"`,
      );
      expect(response.text).toContain(
        'href="?q=heart&amp;page=2&amp;sort=trust&amp;order=ascending"',
      );
      expect(response.text).toContain(
        '<input type="hidden" name="q" value="heart">',
      );
    });

    it("GET related trusts for a product with none says so", async () => {
      const response = await get(
        "/supplier/45273/product/Eye%20Shield/related-trusts",
      );

      expect(response.status).toBe(200);
      expect(response.text).toContain(
        "There are no contracts with Epsilon tech Ltd in the same or related categories.",
      );
    });

    it.each([
      [
        "the wrong supplier",
        "/supplier/45123/product/Heart%20Rate%20Monitor/related-trusts",
      ],
      ["an unknown product", "/supplier/13455/product/Nothing/related-trusts"],
      [
        "a category it isn't in",
        "/category/10027/device-type/35198/supplier/13455/product/Heart%20Rate%20Monitor/related-trusts",
      ],
    ])("GET related trusts with %s returns 404", async (_, path) => {
      expect((await get(path)).status).toBe(404);
    });
  });

  describe("product pages", () => {
    const supplierPathFor = `${deviceTypePath}/supplier/13455`;
    const productPath = `${supplierPathFor}/product/Heart%20Rate%20Monitor`;

    it("GET a product through a category shows the full path", async () => {
      const response = await get(productPath);

      expect(response.status).toBe(200);
      expect(response.text).toContain('href="/category/9990"');
      expect(response.text).toContain(`href="${deviceTypePath}"`);
      expect(response.text).toContain(`href="${supplierPathFor}"`);
      expect(response.text).toContain(`href="${productPath}/trusts"`);
      expect(response.text).not.toContain(`href="${productPath}"`);
    });

    it("GET a supplier page links to products within its own path", async () => {
      const response = await get(supplierPathFor);

      expect(response.text).toContain(
        `href="${supplierPathFor}/product/Heart%20Rate%20Monitor"`,
      );
    });

    it("GET a product's trusts through a category keeps the path", async () => {
      const response = await get(`${productPath}/trusts`);

      expect(response.status).toBe(200);
      expect(response.text).toContain(`href="${supplierPathFor}"`);
      expect(response.text).toContain(`href="${productPath}"`);
      expect(response.text).toContain('data-supplier-id="13455"');
    });

    it.each([
      [
        "a product the supplier doesn't make",
        `${supplierPathFor}/product/GlucoSense`,
      ],
      ["an unknown product", `${supplierPathFor}/product/Nothing`],
      [
        "the wrong supplier",
        `${deviceTypePath}/supplier/65283/product/Heart%20Rate%20Monitor`,
      ],
      [
        "the wrong device type",
        "/category/9990/device-type/63088/supplier/13455/product/Heart%20Rate%20Monitor",
      ],
      [
        "a category it isn't in",
        "/category/10027/device-type/35198/supplier/13455/product/Heart%20Rate%20Monitor",
      ],
    ])("GET a product with %s returns 404", async (_, path) => {
      expect((await get(path)).status).toBe(404);
      expect((await get(`${path}/trusts`)).status).toBe(404);
    });

    it("GET /supplier/:supplierId/product/:aggregationName from search links back to those results", async () => {
      const response = await get(
        "/supplier/45123/product/Blood%20Pressure%20Kit?q=blood%20kit&page=2&evil=1",
      );

      expect(response.status).toBe(200);
      expect(response.text).toContain("Search results");
      expect(response.text).toContain(
        "/search-results?q=blood%20kit&amp;page=2",
      );
      expect(response.text).toContain(
        "/supplier/45123/product/Blood%20Pressure%20Kit/trusts?q=blood%20kit&amp;page=2",
      );
      expect(response.text).not.toContain("evil");
    });

    it("GET /supplier/:supplierId/product/:aggregationName without a search falls back to search", async () => {
      const response = await get(
        "/supplier/45123/product/Blood%20Pressure%20Kit",
      );

      expect(response.status).toBe(200);
      expect(response.text).toContain('href="/search"');
      expect(response.text).not.toContain("/search-results");
    });

    it("GET a product through a category links to its device type and supplier", async () => {
      const response = await get(productPath);
      const summary = /nhsuk-summary-list[\s\S]*?<\/dl>/.exec(
        response.text,
      )?.[0];

      expect(summary).toContain(`<a href="${deviceTypePath}">`);
      expect(summary).toContain(`<a href="${supplierPathFor}">`);
    });

    it("GET a product from search links to its device type and supplier", async () => {
      const response = await get(
        "/supplier/45123/product/Blood%20Pressure%20Kit?q=kit",
      );
      const hrefs = /nhsuk-summary-list[\s\S]*?<\/dl>/
        .exec(response.text)?.[0]
        .match(/href="[^"]+"/g);

      expect(hrefs).toHaveLength(2);
      expect(hrefs?.[0]).toMatch(
        /^href="\/category\/\d+\/device-type\/63088"$/,
      );
      expect(hrefs?.[1]).toMatch(
        /^href="\/category\/\d+\/device-type\/63088\/supplier\/45123"$/,
      );

      const [, supplierHref] = /"(.+)"/.exec(hrefs?.[1] ?? "") ?? [];
      expect((await get(supplierHref)).status).toBe(200);
    });

    it("GET a product only in the Anatomical Specialty tree still links to its device type", async () => {
      const response = await get(
        "/supplier/91326/product/Praxis%20Total%20Knee",
      );

      expect(response.text).toMatch(
        /href="\/category\/\d+\/device-type\/33665"/,
      );
    });

    it("GET /search-results passes the search on to product links", async () => {
      const response = await get("/search-results?q=blood");

      expect(response.text).toMatch(
        /href="\/supplier\/\d+\/product\/[^"]+\?q=blood"/,
      );
    });

    it("GET a product from search with the wrong supplier returns 404", async () => {
      const path = "/supplier/13455/product/Blood%20Pressure%20Kit";

      expect((await get(path)).status).toBe(404);
      expect((await get(`${path}/trusts`)).status).toBe(404);
    });
  });
});
