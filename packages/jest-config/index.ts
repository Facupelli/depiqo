import type { Config } from "@jest/types";

/**
 * Base config shared by all presets.
 * - ts-jest config is in the transform option (globals.ts-jest is deprecated).
 * - Prisma v7 generates .js extension imports that must map to .ts files.
 */
const base: Config.InitialOptions = {
  moduleFileExtensions: ["js", "json", "ts"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testEnvironment: "node",
};

/**
 * Unit test preset.
 * Fast: no DB, no HTTP, no timeouts needed.
 */
export const unitConfig: Config.InitialOptions = {
  ...base,
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  collectCoverageFrom: ["src/**/*.(t|j)s"],
  coverageDirectory: "coverage",
};

/**
 * Integration test preset.
 * Runs sequentially - test files share one disposable database per command
 * and isolate scenarios with unique data, not parallel workers or full-table cleanup.
 */
export const integrationConfig: Config.InitialOptions = {
  ...base,
  rootDir: ".",
  testRegex: ".*\\.integration-spec\\.ts$",
  testTimeout: 30_000,
  maxWorkers: 1,
};

/**
 * E2E test preset.
 * Runs sequentially — boots a real NestJS app + DB.
 */
export const e2eConfig: Config.InitialOptions = {
  ...base,
  rootDir: ".",
  testRegex: ".*\\.e2e-spec\\.ts$",
  testTimeout: 30_000,
  maxWorkers: 1,
};
