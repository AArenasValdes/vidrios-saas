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
  supplierPresentationId: string | null;
  supplierProviderKey: string | null;
  supplierSku: string | null;
  supplierFinishCode: string | null;
  supplierFinishName: string | null;
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
  const missingPresentations: NonNullable<FabricacionTrabajoSnapshot["missingPresentations"]> = [];
  const qaPreliminaryItems: NonNullable<FabricacionTrabajoSnapshot["qaPreliminary"]>["items"] = [];

  for (const item of input.items) {
    const pauta = item.snapshot?.pautaBarras;
    if (!pauta?.calculable || pauta.barras.length === 0) continue;
    itemIds.add(item.id);

    const preliminary = item.snapshot?.qaPreliminary;
    if (
      preliminary?.mode === "supplier_catalog_v1_qa_preliminary" &&
      preliminary.readiness === "lista_para_validar" &&
      item.snapshot?.recipeStatus === "draft" &&
      item.snapshot.recipeId.trim() &&
      item.snapshot.recipeVersion > 0 &&
      item.snapshot.selectedVariant?.trim()
    ) {
      qaPreliminaryItems.push({
        itemId: item.id,
        recipeId: item.snapshot.recipeId,
        recipeVersion: item.snapshot.recipeVersion,
        variantKey: item.snapshot.selectedVariant,
        recipeStatus: "draft",
        readiness: preliminary.readiness,
        sourceType: preliminary.provenance.sourceType,
        sourceReference: preliminary.provenance.sourceReference,
      });
    }

    for (const bar of pauta.barras) {
      if (bar.cortes.length === 0) continue;
      const kerf = Math.round(bar.perdidaCortesMm / bar.cortes.length);
      const materialKey = bar.materialKey?.trim()
        ? bar.materialKey.trim()
        : stableKey([item.snapshot?.lineTemplateId ?? "sin-linea", bar.codigoPerfil]);
      const acabadoKey = (item.colorHex ?? "sin-acabado").trim().toLowerCase();
      const lineTemplateId = item.snapshot?.lineTemplateId ?? null;
      const catalogLineKey = item.catalogLineKey?.trim() || null;

      for (const cut of bar.cortes) {
        const length = Math.round(cut.largoMm);
        if (length <= 0) continue;
        const selection = item.supplierPresentationSelections?.find(
          (entry) => entry.technicalCode.trim() === cut.codigoPerfil.trim()
        );
        const selectedPresentationIsIncomplete = Boolean(selection && (
          selection.status !== "resolved" ||
          selection.commercialLengthMm == null ||
          selection.commercialLengthMm <= 0
        ));
        if ((item.requireSupplierPresentation && !selection) || selectedPresentationIsIncomplete) {
          missingPresentations.push({
            itemId: item.id,
            technicalCode: cut.codigoPerfil,
            finishKey: acabadoKey,
            reason: selection?.reason ?? "No hay una presentación comercial confirmada para este perfil y acabado.",
            supplierSku: selection?.supplierSku ?? null,
          });
          continue;
        }
        const commercialLength = selection
          ? Math.round(selection.commercialLengthMm ?? 0)
          : Math.round(bar.largoComercialMm);
        if (commercialLength <= 0) {
          missingPresentations.push({
            itemId: item.id,
            technicalCode: cut.codigoPerfil,
            finishKey: acabadoKey,
            reason: selection?.reason ?? "La presentación comercial no tiene largo configurado.",
            supplierSku: selection?.supplierSku ?? null,
          });
          continue;
        }
        const presentationKey = stableKey([
          materialKey,
          acabadoKey,
          commercialLength,
          selection?.presentationId ?? selection?.supplierSku ?? "receta",
        ]);
        // A physical presentation may be used by several explicit catalog lines.
        // Keep each source link while still allowing compatible cuts to share bars.
        const sourceKey = stableKey([
          presentationKey,
          lineTemplateId ?? "sin-linea",
          catalogLineKey ?? "sin-clave-catalogo",
        ]);
        sourcePresentations.set(sourceKey, {
          technicalInputKey: materialKey,
          presentationKey,
          lineTemplateId,
          catalogLineKey,
          finishKey: acabadoKey,
          commercialLengthMm: commercialLength,
          supplierPresentationId: selection?.presentationId ?? null,
          providerKey: selection?.providerKey ?? null,
          supplierSku: selection?.supplierSku ?? null,
          finishCode: selection?.finishCode ?? null,
          finishName: selection?.finishName ?? null,
        });
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
          supplierPresentationId: selection?.presentationId ?? null,
          supplierProviderKey: selection?.providerKey ?? null,
          supplierSku: selection?.supplierSku ?? null,
          supplierFinishCode: selection?.finishCode ?? null,
          supplierFinishName: selection?.finishName ?? null,
        });
      }
    }
  }

  if (pending.length === 0 && missingPresentations.length === 0) return null;

  const groups = new Map<string, CortePendiente[]>();
  for (const cut of pending) {
    const key = stableKey([
      cut.materialKey,
      cut.presentationKey,
      cut.acabadoKey,
      cut.largoComercialMm,
      cut.despunteInicialMm,
      cut.perdidaCorteMm,
      cut.supplierPresentationId ?? "sin-sku",
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
        supplierPresentationId: cut.supplierPresentationId,
        supplierProviderKey: cut.supplierProviderKey,
        supplierSku: cut.supplierSku,
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
    ...(missingPresentations.length > 0 ? { missingPresentations } : {}),
    ...(qaPreliminaryItems.length > 0
      ? {
          qaPreliminary: {
            mode: "supplier_catalog_v1_qa_preliminary" as const,
            items: qaPreliminaryItems,
          },
        }
      : {}),
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
    supplierPresentationId: cut.supplierPresentationId,
    supplierProviderKey: cut.supplierProviderKey,
    supplierSku: cut.supplierSku,
    supplierFinishCode: cut.supplierFinishCode,
    supplierFinishName: cut.supplierFinishName,
    indice: bars.filter((bar) => stableKey([bar.materialKey, bar.acabadoKey, bar.largoComercialMm]) === key).length + 1,
    despunteInicialMm: cut.despunteInicialMm,
    perdidaCorteMm: cut.perdidaCorteMm,
    usadoMm: cut.despunteInicialMm,
    sobranteMm: cut.largoComercialMm - cut.despunteInicialMm,
    cortes: [],
  };
}
