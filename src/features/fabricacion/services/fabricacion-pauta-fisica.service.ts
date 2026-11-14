import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export const PAUTA_TEORICA_AVISO = "PAUTA TEÓRICA · VALIDAR CORTE Y DESPUNTE ANTES DE FABRICAR";
const igual = (a: number, b: number) => Math.abs(a - b) < 1e-7;

/** Verifica aritmética y procedencia sin modificar ni recalcular snapshots guardados. */
export function evaluarPautaFisicaTrabajo(snapshot: FabricacionTrabajoSnapshot | null | undefined): "sin_pauta" | "teorica" | "confirmada" | "incompatible" {
  if (!snapshot?.bars.length) return "sin_pauta";
  let pendiente = false;
  let totalPiecesMm = 0;
  let totalRemainingMm = 0;
  const items = new Set<string>();
  for (const bar of snapshot.bars) {
    const fields = [bar.largoComercialMm, bar.despunteInicialMm, bar.perdidaCorteMm, bar.usadoMm, bar.sobranteMm];
    if (!bar.materialKey?.trim() || !bar.cortes.length ||
      fields.some((value) => !Number.isFinite(value) || value < 0) || bar.largoComercialMm <= 0 ||
      bar.cortes.some((cut) => !cut.itemId || !Number.isFinite(cut.largoMm) || cut.largoMm <= 0 || cut.codigoPerfil !== bar.codigoPerfil)) return "incompatible";
    if (!bar.codigoPerfil?.trim()) pendiente = true;
    const geometria = bar.cortes.reduce((sum, cut) => sum + cut.largoMm, 0);
    totalPiecesMm += geometria;
    totalRemainingMm += bar.sobranteMm;
    for (const cut of bar.cortes) items.add(cut.itemId);
    const consumo = bar.despunteInicialMm + geometria + bar.perdidaCorteMm * bar.cortes.length;
    if (!igual(consumo, bar.usadoMm) || consumo - bar.largoComercialMm > 1e-7 || !igual(bar.sobranteMm, bar.largoComercialMm - consumo)) return "incompatible";
    const parametros = bar.parametrosFisicos;
    if (parametros && ((parametros.perdidaCorteMm != null && parametros.perdidaCorteMm !== bar.perdidaCorteMm) ||
      (parametros.despunteInicialMm != null && parametros.despunteInicialMm !== bar.despunteInicialMm))) return "incompatible";
    if (!parametros || parametros.estado !== "confirmado") {
      pendiente = true;
      continue;
    }
    if (parametros.procedimiento !== "por_pieza" || !parametros.fuente?.trim() ||
      !parametros.largosComercialesConfirmados || parametros.perdidaCorteMm !== bar.perdidaCorteMm ||
      parametros.despunteInicialMm !== bar.despunteInicialMm) return "incompatible";
  }
  if (snapshot.totalBars !== snapshot.bars.length || !igual(snapshot.totalProfilesLinealMm, totalPiecesMm) ||
    !igual(snapshot.totalWasteMm, totalRemainingMm) || snapshot.itemCountWithPauta !== items.size) return "incompatible";
  return pendiente || Boolean(snapshot.missingPresentations?.length) ? "teorica" : "confirmada";
}
