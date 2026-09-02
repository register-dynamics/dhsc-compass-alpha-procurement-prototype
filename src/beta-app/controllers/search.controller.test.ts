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
});
