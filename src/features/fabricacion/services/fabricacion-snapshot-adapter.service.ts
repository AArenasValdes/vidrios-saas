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
  const barras = snapshot.pautaBarras?.barras ?? [];
  const totalAvailableMm = barras.reduce(
    (sum, barra) => sum + barra.largoComercialMm,
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
    bars: barras.map((barra, index) => ({
      index: index + 1,
      usedMm: barra.usadoMm,
      wasteMm: barra.sobranteMm,
      profileCode: barra.codigoPerfil,
      profileName: barra.nombrePerfil,
      barLengthMm: barra.largoComercialMm,
      cuts: barra.cortes.map((corte) => ({
        label: corte.codigoPerfil,
        functionLabel: corte.funcion,
        quantity: 1,
        lengthMm: corte.largoMm,
        totalLinealMm: corte.largoMm,
      })),
    })),
    totalUsedMm: snapshot.pautaBarras?.totalUsadoMm ?? 0,
    totalWasteMm: snapshot.pautaBarras?.totalSobranteMm ?? 0,
    wastePct:
      totalAvailableMm > 0
        ? ((snapshot.pautaBarras?.totalSobranteMm ?? 0) / totalAvailableMm) * 100
        : 0,
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
