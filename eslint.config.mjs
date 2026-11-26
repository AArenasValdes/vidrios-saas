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
    // Build output from the isolated optimizer visual QA app (next.config.mjs sets this distDir).
    "qa/optimizer-visual-20261024/.next-optimizer-visual/**",
    "qa/optimizer-visual-20261024/next-env.d.ts",
    "caveman/**",
    "supabase/docs/database.types.ts",
  ]),
  {
    // CommonJS utiliza require por definición; la regla sigue activa en los demás archivos.
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    // Estas reglas del React Compiler siguen visibles, pero la deuda histórica
    // no debe bloquear el gate de lint mientras se corrige por feature.
    // Next registra este plugin solo para sus patrones de archivos; el override
    // también alcanza .cjs y debe registrar la misma instancia para ellos.
    plugins: {
      "react-hooks": nextVitals.find((config) => config.plugins?.["react-hooks"]).plugins["react-hooks"],
    },
    rules: {
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
