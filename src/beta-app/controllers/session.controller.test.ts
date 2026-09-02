import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import app from "../app.js";
import { loginAndGetCookie } from "../tests/helpers.js";
import { signOut } from "./session.controller.js";

describe("Session controller", () => {
  it("GET /sign-in should return 200 and sign-in page", async () => {
    const response = await request(app).get("/sign-in");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Sign in");
  });

  it("GET /sign-in while already signed in should redirect to root", async () => {
    const cookies = await loginAndGetCookie();

    const response = await request(app).get("/sign-in").set("Cookie", cookies);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
  });

  it("POST /sign-in with invalid credentials should redirect to /sign-in with failure message", async () => {
    const response = await request(app)
      .post("/sign-in")
      .send({ password: "invalid", username: "invalid" });

    console.log(response.text);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });

  it("GET /sign-out should redirect to root", async () => {
    const cookies = await loginAndGetCookie();

    const response = await request(app).get("/sign-out").set("Cookie", cookies);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
  });

  it("GET /sign-out should be accessible without authentication", async () => {
    const response = await request(app).get("/sign-out").redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/");
  });

  it("GET /sign-out handles logout errors by returning 500", () => {
    const logoutError = new Error("logout failed");
    const req = {
      logout: vi.fn((cb) => cb(logoutError) as Error),
    } as never;

    const status = vi.fn().mockReturnThis();
    const send = vi.fn();
    const res = { send, status } as never;

    signOut(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("Error during logout");
  });

  it("GET protected page should redirect to /sign-in when not authenticated", async () => {
    const response = await request(app).get("/search").redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });

  it("GET another protected page should redirect to /sign-in when not authenticated", async () => {
    const response = await request(app).get("/search-results").redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });
});
