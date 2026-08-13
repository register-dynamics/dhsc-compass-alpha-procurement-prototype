// @ts-check

import js from "@eslint/js";
import perfectionist from "eslint-plugin-perfectionist";
import tseslint from "typescript-eslint";
import vitestPlugin from "@vitest/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/*.js", "eslint.config.mjs", "dist/**"],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  perfectionist.configs["recommended-natural"],
  vitestPlugin.configs.recommended,
]);
