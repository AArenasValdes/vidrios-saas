import type { FabricacionReglaMedida } from "@/features/fabricacion/types/fabricacion-domain";

/** Normaliza mm de reglas: redondeo comercial al entero más cercano. */
export function normalizeMm(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  return Math.round(value);
}

export function normalizeFabricacionReglaMedida(
  regla: FabricacionReglaMedida
): FabricacionReglaMedida {
  const valorFijoMm = normalizeMm(regla.valorFijoMm);
  const ajusteMm = normalizeMm(regla.ajusteMm);
  return {
    ...regla,
    ...(valorFijoMm == null ? {} : { valorFijoMm }),
    ...(ajusteMm == null ? {} : { ajusteMm }),
  };
}
