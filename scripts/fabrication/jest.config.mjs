import path from "node:path";
import { fileURLToPath } from "node:url";
import createBaseConfig from "../../jest.config.js";
import { TEST_ROOTS } from "./verification-plan.mjs";

export default async function createFabricationJestConfig() {
  const base = await createBaseConfig();
  const rootDir = fileURLToPath(new URL("../../", import.meta.url));
  return {
    ...base,
    rootDir,
    roots: TEST_ROOTS.map((folder) => path.join(rootDir, folder)),
    testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  };
}
