import { createHash } from "node:crypto";

/** Prefix reserved for database keys that identify private workshop rows, not supplier SKUs. */
export const INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX = "ventora-internal:";

export function isGeneratedWorkshopPresentationKey(value: string | null | undefined): boolean {
  return value?.startsWith(INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX) === true;
}

function normalizeIdentityPart(value: string | null | undefined): string {
  return (value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

/** Stable private row key for quick costs; it is never exposed as a supplier SKU. */
export function buildQuickWorkshopPresentationKey(input: {
  organizationId: number;
  familyKey: string;
  configurationKey: string | null;
  technicalCode: string;
  finishName: string | null;
}): string {
  const identity = [
    input.organizationId,
    input.familyKey,
    input.configurationKey ?? "",
    input.technicalCode.trim().toLocaleUpperCase("en-US"),
    normalizeIdentityPart(input.finishName),
  ];
  return `${INTERNAL_WORKSHOP_PRESENTATION_KEY_PREFIX}${createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 40)}`;
}

/** Detects an existing identity before insert; the deterministic key also protects concurrent inserts via the DB unique index. */
export function hasQuickWorkshopPresentationDuplicate<T extends {
  configuration_key?: string | null;
  codigo_tecnico?: string | null;
  acabado_nombre?: string | null;
}>(rows: T[], input: { configurationKey: string | null; technicalCode: string; finishName: string | null }): boolean {
  return rows.some((row) =>
    String(row.configuration_key ?? "") === (input.configurationKey ?? "") &&
    String(row.codigo_tecnico ?? "").trim().toLocaleUpperCase("en-US") === input.technicalCode.trim().toLocaleUpperCase("en-US") &&
    normalizeIdentityPart(row.acabado_nombre) === normalizeIdentityPart(input.finishName)
  );
}
