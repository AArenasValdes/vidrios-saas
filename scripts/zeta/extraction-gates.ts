import type { ExtractedPlan } from "./types.ts";

export function extractionBlockingIssues(input: {
  plan: Pick<ExtractedPlan, "warnings">;
  consoleLines: string[];
  errorText: string | null;
}): string[] {
  return [
    ...(input.errorText ? [`Error bloqueante de Zeta: ${input.errorText}`] : []),
    ...input.plan.warnings.map((warning) => `Advertencia del Plan: ${warning}`),
    ...input.consoleLines.map((line) => `Consola de Zeta: ${line}`),
  ];
}
