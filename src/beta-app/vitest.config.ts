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
        "**/*.d.ts",
        "tests/**/*",
        "reports/**",
        "database/app-schema/*",
        "database/external-schema/*",
      ],
      provider: "v8",
      reporter: ["text", "lcov", "cobertura", "json", "json-summary"],
    },
    environment: "node",
    globals: true,
    include: ["**/*.test.ts"],
  },
});
