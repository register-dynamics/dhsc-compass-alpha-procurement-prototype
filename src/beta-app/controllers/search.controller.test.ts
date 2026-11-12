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

  it("GET /search-results matches device type names, not product or supplier names", async () => {
    // Saccharine & Sons and GlucoSense are a supplier and product, not device types
    for (const q of ["Saccharine", "GlucoSense"]) {
      const response = await request(app)
        .get(`/search-results?q=${q}`)
        .set("Cookie", cookies);

      expect(response.text).toContain("of <strong>0</strong> results");
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

  it("GET /search-results filters by GMDN category and keeps the filter on result links", async () => {
    // Heart rate monitor and Blood glucose/blood pressure monitoring system
    // both match "monitor", but only Heart rate monitor is in Electrodes/Leads
    const response = await request(app)
      .get("/search-results?q=monitor&[category]=CT141")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>1</strong> results");
    expect(response.text).toContain(
      'href="/device-type/35198/supplier/13455?q=monitor&amp;[category]=CT141"',
    );
    expect(response.text).not.toContain('href="/device-type/63088/');
  });

  it("GET /search-results matches any of the selected categories", async () => {
    const response = await request(app)
      .get("/search-results?q=monitor&[category]=CT141&[category]=CT1010")
      .set("Cookie", cookies);

    expect(response.text).toContain("of <strong>4</strong> results");
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
