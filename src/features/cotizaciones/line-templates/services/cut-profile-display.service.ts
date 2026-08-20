import type { CotizacionLineTemplateCut } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { RECIPE_MISSING_PROFILE_LABEL } from "@/features/cotizaciones/line-templates/types/fabrication-recipe";

const UNASSIGNED_PROFILE_LABELS = new Set(
  [
    "por asignar",
    RECIPE_MISSING_PROFILE_LABEL,
    "perfil sin código",
    "perfil sin codigo",
  ].map((label) => label.toLocaleLowerCase("es"))
);

export function isUnassignedProfileLabel(label: string | null | undefined): boolean {
  const normalized = (label ?? "").trim().toLocaleLowerCase("es");
  return !normalized || UNASSIGNED_PROFILE_LABELS.has(normalized);
}

type CutProfileFields = Pick<
  CotizacionLineTemplateCut,
  "profileCode" | "label" | "profileName" | "functionLabel"
>;

export function resolveCutProfileCode(cut: CutProfileFields): string {
  const explicit = cut.profileCode?.trim() ?? "";
  if (explicit && !isUnassignedProfileLabel(explicit)) return explicit;

  const label = cut.label?.trim() ?? "";
  if (!label || isUnassignedProfileLabel(label)) return "";

  const name = cut.profileName?.trim() ?? "";
  const functionLabel = cut.functionLabel?.trim() ?? "";
  if (label === name || label === functionLabel) return "";

  return label;
}

export function resolveCutProfileName(cut: CutProfileFields): string {
  const name = cut.profileName?.trim() ?? "";
  if (name && !isUnassignedProfileLabel(name)) return name;
  return cut.functionLabel?.trim() || "—";
}

export function resolveCutProfileDisplayCode(cut: CutProfileFields): string {
  const code = resolveCutProfileCode(cut);
  return code || "Por asignar";
}
