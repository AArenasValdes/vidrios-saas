/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  cache: false,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/.kilo/",
    // Zeta extraction has a separate Node test runner; do not mix it into Ventora's Jest suite.
    "<rootDir>/scripts/zeta/",
  ],
  modulePathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.kilo/"],
  watchPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/.kilo/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(customJestConfig);
