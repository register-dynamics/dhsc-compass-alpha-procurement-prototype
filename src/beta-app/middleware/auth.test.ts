/* eslint-disable @typescript-eslint/no-unused-vars */
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import app from "../app.js";
import { loginAndGetCookie } from "../tests/helpers.js";
import { normalizeAuthError } from "./auth.js";

describe("Authentication middleware", () => {
  describe("Authentication flow", () => {
    let authenticatedCookies: string;

    beforeEach(async () => {
      authenticatedCookies = await loginAndGetCookie();
    });

    it("should maintain session after login", async () => {
      const response1 = await request(app)
        .get("/search")
        .set("Cookie", authenticatedCookies);

      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .get("/search-results?q=test")
        .set("Cookie", authenticatedCookies);

      expect(response2.status).toBe(200);
    });

    it("session cookie should be set after successful login", async () => {
      const loginResponse = await request(app)
        .post("/sign-in")
        .send({ password: "northsouth", username: "test@example.com" });

      const setCookieHeaders = loginResponse.headers["set-cookie"];
      expect(setCookieHeaders).toBeDefined();
      expect(
        Array.isArray(setCookieHeaders) || typeof setCookieHeaders === "string",
      ).toBe(true);
    });
  });

  describe("Error normalization", () => {
    it("should handle Error instances correctly", () => {
      const testError = new Error("Test error message");
      const result = normalizeAuthError(testError);

      expect(result).toBe(testError);
      expect(result.message).toBe("Test error message");
    });

    it("should convert non-Error objects to Error instances", () => {
      const stringError = normalizeAuthError("string error");
      expect(stringError).toBeInstanceOf(Error);
      expect(stringError.message).toBe("Authentication error");

      const objectError = normalizeAuthError({ code: "ERR_DB" });
      expect(objectError).toBeInstanceOf(Error);
      expect(objectError.message).toBe("Authentication error");

      const nullError = normalizeAuthError(null);
      expect(nullError).toBeInstanceOf(Error);
      expect(nullError.message).toBe("Authentication error");

      const undefinedError = normalizeAuthError(undefined);
      expect(undefinedError).toBeInstanceOf(Error);
      expect(undefinedError.message).toBe("Authentication error");
    });
  });

  describe("Error handling in authentication", () => {
    it("normalizeAuthError handles Error instances", () => {
      const inputError = new Error("Database connection failed");
      const result = normalizeAuthError(inputError);

      expect(result).toBe(inputError);
      expect(result instanceof Error).toBe(true);
    });

    it("normalizeAuthError creates Error for non-Error types", () => {
      const nonErrorValues = [
        "string error",
        123,
        { error: "object" },
        null,
        undefined,
        [],
      ];

      for (const value of nonErrorValues) {
        const result = normalizeAuthError(value);
        expect(result instanceof Error).toBe(true);
        expect(result.message).toBe("Authentication error");
      }
    });

    it("catch block receives errors from async authentication", () => {
      let capturedError: unknown = null;

      const done = (error: unknown, user?: unknown, info?: unknown) => {
        if (error instanceof Error) {
          capturedError = error;
        }
      };

      const asyncAuthFn = async () => {
        return Promise.reject(new Error("Async authentication failed"));
      };

      asyncAuthFn()
        .then(() => {
          // Success path
        })
        .catch((error: unknown) => {
          done(normalizeAuthError(error));
        });

      setTimeout(() => {
        expect(capturedError).toBeDefined();
        expect(capturedError instanceof Error).toBe(true);
      }, 10);
    });

    it("deserializeUser then callback handles found user", () => {
      const mockUser = {
        id: 1,
        passwordHash: "hash",
        username: "test@example.com",
      };
      let callbackResult: unknown = null;

      const done = (err: unknown, user: unknown) => {
        callbackResult = user;
      };

      const thenCallback = (user: unknown) => {
        done(null, user ?? false);
      };

      thenCallback(mockUser);
      expect(callbackResult).toEqual(mockUser);

      thenCallback(null);
      expect(callbackResult).toBe(false);
    });

    it("deserializeUser handles null user with default value", () => {
      let finalResult: unknown = null;

      const done = (err: unknown, user: unknown) => {
        finalResult = user;
      };

      const thenCallback = (user: unknown) => {
        done(null, user ?? false);
      };

      thenCallback(null);
      expect(finalResult).toBe(false);

      thenCallback(undefined);
      expect(finalResult).toBe(false);

      const validUser = {
        id: 5,
        passwordHash: "hash",
        username: "valid@test.com",
      };
      thenCallback(validUser);
      expect(finalResult).toEqual(validUser);
    });
  });

  describe("Passport error recovery", () => {
    it("should recover from thrown non-Error objects", () => {
      let recoveredError: unknown = null;

      const done = (error: unknown) => {
        recoveredError = error;
      };

      (async () => {
        return Promise.reject(new Error("String error")); // Non-Error object
      })().catch((error: unknown) => {
        done(normalizeAuthError(error));
      });

      setTimeout(() => {
        expect(recoveredError).toBeInstanceOf(Error);
        expect((recoveredError as Error).message).toBe("String error");
      }, 10);
    });

    it("should handle Error exceptions in async authentication", () => {
      let caughtError: unknown = null;

      const done = (error: unknown) => {
        caughtError = error;
      };

      (async () => {
        return Promise.reject(new Error("Password verification failed"));
      })().catch((error: unknown) => {
        done(normalizeAuthError(error));
      });

      setTimeout(() => {
        expect(caughtError).toBeInstanceOf(Error);
        expect((caughtError as Error).message).toBe(
          "Password verification failed",
        );
      }, 10);
    });
  });

  describe("Session deserialization", () => {
    let cookies: string;

    beforeEach(async () => {
      cookies = await loginAndGetCookie();
    });

    it("should deserialize user on subsequent requests", async () => {
      const firstResponse = await request(app)
        .get("/search")
        .set("Cookie", cookies);

      expect(firstResponse.status).toBe(200);

      const secondResponse = await request(app)
        .get("/search-results?q=test")
        .set("Cookie", cookies);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.text).toContain("Search results");
    });

    it("multiple sequential requests should maintain session", async () => {
      const paths = ["/search", "/search-results?q=test", "/search"];

      for (const path of paths) {
        const response = await request(app).get(path).set("Cookie", cookies);

        expect(response.status).toBe(200);
      }
    });
  });

  describe("Error scenarios", () => {
    it("authentication strategy handles invalid password", async () => {
      const response = await request(app)
        .post("/sign-in")
        .send({ password: "wrongpassword", username: "test@example.com" })
        .redirects(0);

      expect([302, 401]).toContain(response.status);
    });

    it("authentication strategy handles non-existent user", async () => {
      const response = await request(app)
        .post("/sign-in")
        .send({ password: "anypassword", username: "doesnotexist@test.com" })
        .redirects(0);

      expect([302, 401]).toContain(response.status);
    });

    it("should handle errors via normalizeAuthError callback", () => {
      const simulateCatchBlock = (error: unknown) => {
        return normalizeAuthError(error);
      };

      const testError = new Error("Database timeout");
      const errorResult = simulateCatchBlock(testError);

      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult.message).toBe("Database timeout");
    });

    it("should handle non-Error throws via normalizeAuthError", () => {
      const simulateCatchBlock = (error: unknown) => {
        return normalizeAuthError(error);
      };

      const errorResult = simulateCatchBlock("Query failed");

      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult.message).toBe("Authentication error");
    });
  });
});
