import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";
import { loginAndGetCookie } from "../tests/helpers.js";

describe("Index controller", () => {
  it("GET / should return 200 and welcome message with content-type text/html", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search and evaluate medical technologies");
    expect(response.headers["content-type"]).toMatch(/html/);
  });

  it("GET /nonexistent should render the not-found page", async () => {
    const response = await request(app).get("/nonexistent");

    expect(response.status).toBe(404);
    expect(response.text).toContain(
      "We cannot find the page you're looking for",
    );
    expect(response.headers["content-type"]).toMatch(/html/);
  });

  it("GET /dashboard should return the dashboard page with content-type text/html", async () => {
    const cookies = await loginAndGetCookie();
    const response = await request(app)
      .get("/dashboard")
      .set("Cookie", cookies);

    expect(response.status).toBe(200);
    expect(response.text).toContain("Dashboard");
    expect(response.headers["content-type"]).toMatch(/html/);
  });

  it("GET / should include security headers", async () => {
    const response = await request(app).get("/");

    expect(response.headers["content-security-policy"]).toBeDefined();
    expect(response.headers["cross-origin-opener-policy"]).toBeDefined();
    expect(response.headers["cross-origin-resource-policy"]).toBeDefined();
    expect(response.headers["origin-agent-cluster"]).toBeDefined();
    expect(response.headers["permissions-policy"]).toBeDefined();
    expect(response.headers["referrer-policy"]).toBeDefined();
    expect(response.headers["strict-transport-security"]).toBeDefined();
    expect(response.headers["x-content-type-options"]).toBeDefined();
    expect(response.headers["x-dns-prefetch-control"]).toBeDefined();
    expect(response.headers["x-download-options"]).toBeDefined();
    expect(response.headers["x-frame-options"]).toBeDefined();
    expect(response.headers["x-permitted-cross-domain-policies"]).toBeDefined();
    expect(response.headers["x-xss-protection"]).toBeDefined();
  });

  // NB: We can't test the 500 error page directly because it requires triggering a server-side error, which is not feasible in our unit test environment (at the moment).
});
