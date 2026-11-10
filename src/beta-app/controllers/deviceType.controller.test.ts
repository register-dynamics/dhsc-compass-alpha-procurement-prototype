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
