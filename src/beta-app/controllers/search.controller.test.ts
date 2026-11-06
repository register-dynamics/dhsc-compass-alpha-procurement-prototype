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
