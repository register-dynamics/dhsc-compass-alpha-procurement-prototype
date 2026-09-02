import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../app.js";

describe("Index controller", () => {
  it("GET / should return 200 and welcome message with content-type text/html", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Search and evaluate medical technologies");
    expect(response.headers["content-type"]).toMatch(/html/);
  });

  it("GET /nonexistent should redirect to /sign-in", async () => {
    const response = await request(app).get("/nonexistent").redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });
});
