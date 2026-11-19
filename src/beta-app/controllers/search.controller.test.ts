import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../app.js";
import { loginAndGetCookie } from "../tests/helpers.js";

describe("Search controller", () => {
  let cookies: string;

  beforeEach(async () => {
    cookies = await loginAndGetCookie();
  });

  it("GET /search should return 200 and search page", async () => {
    const response = await request(app).get("/search").set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search");
  });

  it("GET /search-results should return 200 and search results page", async () => {
    const response = await request(app)
      .get("/search-results?q=test")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });

  it("GET /search-results with empty search should return 200 and search results page", async () => {
    const response = await request(app)
      .get("/search-results")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });

  it("GET /search-results with categories should return 200 and search results page", async () => {
    const response = await request(app)
      .get("/search-results?q=test&[category]=category1")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });

  it("GET /search-results lists every supplier of the device types whose names match", async () => {
    const response = await request(app)
      .get("/search-results?q=glucose")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>3</strong> results");
    for (const supplierId of ["13455", "45123", "55623"]) {
      expect(response.text).toContain(
        `href="/device-type/63088/supplier/${supplierId}?q=glucose"`,
      );
    }
  });

  it("GET /search-results doesn't match supplier names", async () => {
    // Saccharine & Sons is a supplier, and no device type or product
    const response = await request(app)
      .get("/search-results?q=Saccharine")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>0</strong> results");
  });

  it("GET /search-results matches aggregation names, brand/trade names and models", async () => {
    // Lepton Series is the aggregation and brand/trade name, so it matches
    // every device type it covers. L-Box and Lepton PFT are models, so they
    // only match the device type they're under.
    for (const [q, gmdnCodes] of [
      ["Lepton", ["13680", "35242", "35282"]],
      ["L-Box", ["35242"]],
      ["PFT", ["35282"]],
    ] as const) {
      const response = await request(app)
        .get(`/search-results?q=${encodeURIComponent(q)}`)
        .set("Cookie", cookies);

      expect(response.text).toContain(
        `of <strong>${String(gmdnCodes.length)}</strong> results`,
      );
      for (const gmdnCode of gmdnCodes) {
        expect(response.text).toContain(
          `href="/device-type/${gmdnCode}/supplier/30512?`,
        );
      }
    }
  });

  it("GET /search-results lists the GMDN categories of the matching device types", async () => {
    const response = await request(app)
      .get("/search-results?q=heart")
      .set("Cookie", cookies);

    // Heart rate monitor's categories, at every level, from gmdn_category_term
    expect(response.text).toContain('value="CT1444"');
    expect(response.text).toContain("Patient monitors/monitoring systems");
    expect(response.text).toContain('value="CT145"');
    expect(response.text).toContain("Cardivascular devices");
    expect(response.text).not.toContain("No category");
  });

  it("GET /search-results lists each of a supplier's aggregations of a device type as its own result", async () => {
    // Bywater Respiratory's Lepton Series spans three device types. Each
    // matching device type gets a result with only its own models, and the
    // two spirometer registrations share one.
    const response = await request(app)
      .get("/search-results?q=spirometer")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>1</strong> results");
    expect(response.text).toContain(
      'href="/device-type/13680/supplier/30512?q=spirometer"',
    );
    expect(response.text).toContain("Bywater Respiratory Ltd");
    expect(response.text).toContain("Lepton Series");
    expect(response.text).toContain("Lepton Spiro, Lepton Spiro Mini");
    expect(response.text).not.toContain("L-Box");
    expect(response.text).not.toContain("Lepton PFT");
  });

  it("GET /search-results doesn't list models named the same as their aggregation", async () => {
    const response = await request(app)
      .get("/search-results?q=glucose")
      .set("Cookie", cookies);

    // GlucoSense's only model is GlucoSense, so it's shown once, as the aggregation
    expect(response.text.match(/GlucoSense/g)).toHaveLength(1);
  });

  it("GET /search-results filters by GMDN category and keeps the filter on result links", async () => {
    // Heart rate monitor and Blood glucose/blood pressure monitoring system
    // both match "monitor", but only Heart rate monitor is in Electrodes/Leads.
    // Aorta Solutions has 3 aggregations of it, so it's 3 results.
    const response = await request(app)
      .get("/search-results?q=monitor&[category]=CT141")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>3</strong> results");
    expect(response.text).toContain(
      'href="/device-type/35198/supplier/13455?q=monitor&amp;[category]=CT141"',
    );
    expect(response.text).not.toContain('href="/device-type/63088/');
  });

  it("GET /search-results matches any of the selected categories", async () => {
    const response = await request(app)
      .get("/search-results?q=monitor&[category]=CT141&[category]=CT1010")
      .set("Cookie", cookies);

    // 3 Heart rate monitor aggregations from Aorta Solutions, and 1 Blood
    // glucose/blood pressure monitoring system aggregation from each of 3 suppliers
    expect(response.text).toContain("of <strong>6</strong> results");
  });

  it("GET /search-results with only No category selected excludes device types in a category", async () => {
    const response = await request(app)
      .get("/search-results?q=monitor&[category]=")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("of <strong>0</strong> results");
  });

  it("GET /category/:categoryId should list subcategories alongside every device type beneath the category", async () => {
    const response = await request(app)
      .get("/category/9986")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("2 device types in");
    expect(response.text).toContain('href="/category/9990"');
    expect(response.text).toContain("Heart rate monitor");
  });

  it("GET /category/:categoryId should include device types that only descendants are mapped to", async () => {
    const response = await request(app)
      .get("/category/1481")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("2 device types in");
  });

  it("GET /category/:categoryId should list device types without a sidebar at the end of a branch", async () => {
    const response = await request(app)
      .get("/category/9990")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Heart rate monitor");
    expect(response.text).not.toContain("app-side-nav");
  });

  it("GET /category/:categoryId should not link to itself in the breadcrumbs", async () => {
    const response = await request(app)
      .get("/category/9990")
      .set("Cookie", cookies);

    expect(response.text).toContain('href="/category/9986"');
    expect(response.text).not.toContain('href="/category/9990"');
  });
});
