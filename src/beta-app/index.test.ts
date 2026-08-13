import { describe, expect, it } from "vitest";

import config from "./config.js";

// Basic smoke test to verify config import and test setup

describe("Beta app config", () => {
  it("should be called Compass", () => {
    expect(config.app.name).toBe("Compass");
  });
});
