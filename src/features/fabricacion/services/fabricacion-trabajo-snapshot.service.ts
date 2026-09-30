import type {
  FabricacionTrabajoBarra,
  FabricacionTrabajoCorte,
  FabricacionTrabajoItemInput,
  FabricacionTrabajoSnapshot,
} from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import { FABRICACION_TRABAJO_SNAPSHOT_VERSION } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";

export function parseFabricacionTrabajoSnapshot(value: unknown): FabricacionTrabajoSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== FABRICACION_TRABAJO_SNAPSHOT_VERSION ||
    record.tipo !== "fabricacion_trabajo_snapshot" ||
    record.packing !== "first_fit_decreasing_sugerido" ||
    !Array.isArray(record.bars) ||
    !Array.isArray(record.sourcePresentations)
  ) return null;
  return value as FabricacionTrabajoSnapshot;
}

type CortePendiente = FabricacionTrabajoCorte & {
  materialKey: string;
  presentationKey: string;
  nombrePerfil: string;
  acabadoKey: string;
  lineTemplateId: number | null;
  largoComercialMm: number;
  despunteInicialMm: number;
  perdidaCorteMm: number;
};

function stableKey(values: readonly (string | number)[]) {
  return values.map((value) => String(value).trim().toLowerCase()).join("|");
}

/**
 * Consolida solo cortes de snapshots inmutables. No lee recetas, no calcula
 * geometría ni precios. materialKey+acabado+largo+regla de corte deben coincidir.
 */
export function construirFabricacionTrabajoSnapshot(input: {
  items: readonly FabricacionTrabajoItemInput[];
  capturedAt?: string;
}): FabricacionTrabajoSnapshot | null {
  const pending: CortePendiente[] = [];
  const itemIds = new Set<string>();
  const sourcePresentations = new Map<string, FabricacionTrabajoSnapshot["sourcePresentations"][number]>();

  for (const item of input.items) {
    const pauta = item.snapshot?.pautaBarras;
    if (!pauta?.calculable || pauta.barras.length === 0) continue;
    itemIds.add(item.id);

    for (const bar of pauta.barras) {
      const commercialLength = Math.round(bar.largoComercialMm);
      if (commercialLength <= 0 || bar.cortes.length === 0) continue;
      const kerf = Math.round(bar.perdidaCortesMm / bar.cortes.length);
      const materialKey = bar.materialKey?.trim()
        ? bar.materialKey.trim()
        : stableKey([item.snapshot?.lineTemplateId ?? "sin-linea", bar.codigoPerfil]);
      const acabadoKey = (item.colorHex ?? "sin-acabado").trim().toLowerCase();
      const presentationKey = stableKey([materialKey, acabadoKey, commercialLength]);
      const sourceKey = presentationKey;
      sourcePresentations.set(sourceKey, {
        technicalInputKey: materialKey,
        presentationKey,
        lineTemplateId: item.snapshot?.lineTemplateId ?? null,
        catalogLineKey: item.catalogLineKey?.trim() || null,
        finishKey: acabadoKey,
        commercialLengthMm: commercialLength,
      });

      for (const cut of bar.cortes) {
        const length = Math.round(cut.largoMm);
        if (length <= 0) continue;
        pending.push({
          itemId: item.id,
          codigoItem: item.codigo,
          nombreItem: item.nombre,
          componenteId: cut.componenteId,
          codigoPerfil: cut.codigoPerfil || bar.codigoPerfil,
          funcion: cut.funcion,
          corte: cut.corte ?? null,
          largoMm: length,
          materialKey,
          presentationKey,
          nombrePerfil: bar.nombrePerfil,
          acabadoKey,
          lineTemplateId: item.snapshot?.lineTemplateId ?? null,
          largoComercialMm: commercialLength,
          despunteInicialMm: Math.round(bar.despunteInicialMm),
          perdidaCorteMm: kerf,
        });
      }
    }
  }

  if (pending.length === 0) return null;

  const groups = new Map<string, CortePendiente[]>();
  for (const cut of pending) {
    const key = stableKey([
      cut.materialKey,
      cut.presentationKey,
      cut.acabadoKey,
      cut.largoComercialMm,
      cut.despunteInicialMm,
      cut.perdidaCorteMm,
    ]);
    const group = groups.get(key) ?? [];
    group.push(cut);
    groups.set(key, group);
  }

  const bars: FabricacionTrabajoBarra[] = [];
  for (const group of groups.values()) {
    group.sort((left, right) => right.largoMm - left.largoMm || left.codigoItem.localeCompare(right.codigoItem));
    for (const cut of group) {
      const consumed = cut.largoMm + cut.perdidaCorteMm;
      const capacity = cut.largoComercialMm - cut.despunteInicialMm;
      // Nunca persistir una pauta global incompleta: el snapshot por ítem
      // conserva la fuente exacta para revisión y una cotización no debe
      // aparentar que todos los cortes caben si alguno excede la barra.
      if (consumed > capacity) return null;

      const existing = bars.find((bar) =>
        bar.materialKey === cut.materialKey &&
        bar.presentationKey === cut.presentationKey &&
        bar.acabadoKey === cut.acabadoKey &&
        bar.largoComercialMm === cut.largoComercialMm &&
        bar.despunteInicialMm === cut.despunteInicialMm &&
        bar.perdidaCorteMm === cut.perdidaCorteMm &&
        bar.usadoMm + consumed <= bar.largoComercialMm
      );
      const target = existing ?? createBar(cut, bars);
      if (!existing) bars.push(target);
      target.usadoMm += consumed;
      target.sobranteMm = target.largoComercialMm - target.usadoMm;
      target.cortes.push({
        itemId: cut.itemId,
        codigoItem: cut.codigoItem,
        nombreItem: cut.nombreItem,
        componenteId: cut.componenteId,
        codigoPerfil: cut.codigoPerfil,
        funcion: cut.funcion,
        corte: cut.corte,
        largoMm: cut.largoMm,
      });
      if (!target.lineaIds.includes(cut.lineTemplateId)) target.lineaIds.push(cut.lineTemplateId);
    }
  }

  return {
    schemaVersion: FABRICACION_TRABAJO_SNAPSHOT_VERSION,
    tipo: "fabricacion_trabajo_snapshot",
    packing: "first_fit_decreasing_sugerido",
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    itemCountWithPauta: itemIds.size,
    totalBars: bars.length,
    totalProfilesLinealMm: pending.reduce((sum, cut) => sum + cut.largoMm, 0),
    totalWasteMm: bars.reduce((sum, bar) => sum + bar.sobranteMm, 0),
    sourcePresentations: [...sourcePresentations.values()],
    bars,
  };
}

function createBar(cut: CortePendiente, bars: FabricacionTrabajoBarra[]): FabricacionTrabajoBarra {
  const key = stableKey([cut.materialKey, cut.acabadoKey, cut.largoComercialMm]);
  return {
    materialKey: cut.materialKey,
    presentationKey: cut.presentationKey,
    codigoPerfil: cut.codigoPerfil,
    nombrePerfil: cut.nombrePerfil,
    acabadoKey: cut.acabadoKey,
    lineaIds: [cut.lineTemplateId],
    largoComercialMm: cut.largoComercialMm,
    indice: bars.filter((bar) => stableKey([bar.materialKey, bar.acabadoKey, bar.largoComercialMm]) === key).length + 1,
    despunteInicialMm: cut.despunteInicialMm,
    perdidaCorteMm: cut.perdidaCorteMm,
    usadoMm: cut.despunteInicialMm,
    sobranteMm: cut.largoComercialMm - cut.despunteInicialMm,
    cortes: [],
  };
}
