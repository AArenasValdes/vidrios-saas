import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    ".kilo/**",
    ".agents/**",
    ".jest-cache/**",
    "next-env.d.ts",
    "caveman/**",
    "supabase/docs/database.types.ts",
  ]),
  {
    // Estas reglas del React Compiler siguen visibles, pero la deuda histórica
    // no debe bloquear el gate de lint mientras se corrige por feature.
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
