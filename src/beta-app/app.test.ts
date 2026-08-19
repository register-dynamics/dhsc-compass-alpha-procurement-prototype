import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "./app.js";

describe("Beta app server (integration)", () => {
  it("GET / should return 200 and welcome message with content-type text/html", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search and evaluate medical technologies");
    expect(response.headers["content-type"]).toMatch(/html/);
  });

  it("GET /nonexistent should return 404", async () => {
    const response = await request(app).get("/nonexistent");

    expect(response.status).toBe(404);
  });

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
    const response = await request(app).get("/search-results?q=test&[category]=category1");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search results");
  });
});
