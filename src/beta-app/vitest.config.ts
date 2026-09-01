import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "index.ts",
        "**/*.config.*",
        "**/*.test.*",
        "assets/**",
        "public/**",
        "scripts/**",
        "**/*.d.ts"
      ],
      provider: "v8",
      reporter: ["text", "lcov", "cobertura", "json", "json-summary"],
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
