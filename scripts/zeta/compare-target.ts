import type { ExtractTarget, ExtractedPlan } from "./types.ts";

export type TargetComparison = {
  ok: boolean;
  checks: Array<{ field: string; expected: string; actual: string; ok: boolean }>;
};

export function compareExtractedAgainstTarget(
  target: ExtractTarget,
  plan: ExtractedPlan,
): TargetComparison {
  const checks = [
    {
      field: "line",
      expected: target.line,
      actual: plan.lineName ?? "(vacío)",
      ok: Boolean(plan.lineName && plan.lineName.toUpperCase().includes(target.line.toUpperCase().slice(0, 16))),
    },
    {
      field: "leaves",
      expected: String(target.leaves),
      actual: plan.leaves == null ? "(vacío)" : String(plan.leaves),
      ok: plan.leaves === target.leaves,
    },
    {
      field: "widthMm",
      expected: String(target.widthMm),
      actual: plan.widthMm == null ? "(vacío)" : String(plan.widthMm),
      ok: plan.widthMm === target.widthMm,
    },
    {
      field: "heightMm",
      expected: String(target.heightMm),
      actual: plan.heightMm == null ? "(vacío)" : String(plan.heightMm),
      ok: plan.heightMm === target.heightMm,
    },
    {
      field: "glassCode",
      expected: target.glassCode,
      actual: plan.glass[0]?.code ?? plan.glassCode ?? "(vacío)",
      ok: (plan.glass[0]?.code ?? plan.glassCode ?? "").toUpperCase() === target.glassCode.toUpperCase(),
    },
    {
      field: "profiles",
      expected: ">0",
      actual: String(plan.profiles.length),
      ok: plan.profiles.length > 0,
    },
    {
      field: "glass",
      expected: ">0",
      actual: String(plan.glass.length),
      ok: plan.glass.length > 0,
    },
    {
      field: "hardware",
      expected: ">0",
      actual: String(plan.hardware.length),
      ok: plan.hardware.length > 0,
    },
  ];
  return { ok: checks.every((item) => item.ok), checks };
}

export function formatTargetComparison(result: TargetComparison, targetId: string): string {
  const lines = [`Comparación contra target ${targetId}: ${result.ok ? "OK" : "DIFERENCIAS"}`];
  for (const check of result.checks) {
    lines.push(
      `- [${check.ok ? "ok" : "fail"}] ${check.field}: esperado ${check.expected} / actual ${check.actual}`,
    );
  }
  return lines.join("\n");
}
