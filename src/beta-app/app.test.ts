import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "./app.js";

describe("Beta app server (integration)", () => {
  it("GET / should return 200 and welcome message", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Hello, world!");
    expect(response.text).toContain("Compass");
  });

  it("GET /nonexistent should return 404", async () => {
    const response = await request(app).get("/nonexistent");

    expect(response.status).toBe(404);
  });

  it("GET / should have content-type text/html", async () => {
    const response = await request(app).get("/");

    expect(response.headers["content-type"]).toMatch(/html/);
  });
});
