import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

export function fabricacionSnapshotToLegacyCubicationSnapshot(
  snapshot: FabricacionCotizacionSnapshot
): CotizacionItemCubicationSnapshot {
  const firstGlass = snapshot.vidrios[0] ?? null;
  const accessoryUnits = snapshot.result.accesorios.reduce(
    (sum, entry) => sum + entry.cantidadUnidades,
    0
  );

  return {
    v: 2,
    source: "auto",
    lineTemplateId: snapshot.lineTemplateId !== null ? String(snapshot.lineTemplateId) : "",
    system: snapshot.recipeIdentity.tipologia,
    status: snapshot.recipeStatus,
    widthMm: snapshot.input.anchoTotalMm,
    heightMm: snapshot.input.altoTotalMm,
    quantity: snapshot.input.cantidad,
    capturedAt: snapshot.calculatedAt,
    cuts: snapshot.pauta.map((row) => ({
      label: row.codigoPerfil.trim() || row.nombrePerfil.trim() || "Por asignar",
      functionLabel: row.funcion,
      quantity: row.cantidadPiezas,
      lengthMm: row.medidaMm,
      totalLinealMm: row.totalLinealMm,
      measureExplanation: row.trazabilidad.map((trace) => trace.formula).join(" / "),
    })),
    bars: [],
    totalUsedMm: 0,
    totalWasteMm: 0,
    wastePct: 0,
    totalProfilesLinealMm: snapshot.result.totalLinealMm,
    glass: firstGlass
      ? {
          widthMm: firstGlass.anchoMm,
          heightMm: firstGlass.altoMm,
          quantity: firstGlass.cantidadPiezas,
          totalM2: firstGlass.totalM2,
        }
      : null,
    accessoryUnits,
    recipe: null,
    estimationKind: "recipe",
  };
}
