import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

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
});
