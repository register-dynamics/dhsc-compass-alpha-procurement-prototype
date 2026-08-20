import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("Beta app server (integration)", () => {
  it("GET /search should return 200 and search page", async () => {
    const response = await request(app).get("/search");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search");
  });

  it("GET /search-results should return 200 and search results page", async () => {
    const response = await request(app).get("/search-results?q=test");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });

  it("GET /search-results with empty search should return 200 and search results page", async () => {
    const response = await request(app).get("/search-results");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });

  it("GET /search-results with categories should return 200 and search results page", async () => {
    const response = await request(app).get(
      "/search-results?q=test&[category]=category1",
    );

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });
});
