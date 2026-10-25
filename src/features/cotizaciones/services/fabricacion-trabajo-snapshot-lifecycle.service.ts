import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";

type FabricationSnapshotCarrier = Parameters<
  typeof construirFabricacionTrabajoSnapshot
>[0]["items"];

export function shouldResolveFabricationRecipesForQuoteSave(input: {
  existingId?: string | number | null;
  existingStatus?: string | null;
  nextStatus?: string | null;
} = {}) {
  if (input.existingId == null) return true;
  return input.existingStatus === "borrador" && input.nextStatus !== "borrador";
}

/** Relee vínculos de compra solo al crear o recalcular técnicamente una cotización. */
export function shouldResolveSupplierPresentationsForQuoteSave(input: {
  existingId?: string | number | null;
  finalizingDraft?: boolean;
  itemCountToResolve?: number;
  shouldRebuildTrabajoSnapshot?: boolean;
} = {}) {
  return input.existingId == null || input.finalizingDraft === true ||
    (input.itemCountToResolve ?? 0) > 0 || input.shouldRebuildTrabajoSnapshot === true;
}

function fabricationInputKey(item: CotizacionWorkflowItem) {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  return JSON.stringify({
    tipoItem: item.tipoItem ?? "componente",
    tipo: item.tipo,
    lineaComercial: item.lineaComercial,
    vidrio: item.vidrio,
    nombre: item.nombre,
    descripcion: item.descripcion,
    ancho: item.ancho,
    alto: item.alto,
    cantidad: item.cantidad,
    lineTemplateId: meta.lineTemplateId,
    catalogLineKey: meta.catalogLineKey,
    vidrioLineTemplateId: meta.vidrioLineTemplateId,
    catalogEspesor: meta.catalogEspesor,
    glassTechnicalSpec: meta.glassTechnicalSpec,
    material: meta.material,
    colorHex: meta.colorHex,
    catalogTerminacion: meta.catalogTerminacion,
    fabricacionTipologia: meta.fabricacionTipologia,
    fabricacionHojas: meta.fabricacionHojas,
    fabricacionModulos: meta.fabricacionModulos,
    fabricacionApertura: meta.fabricacionApertura,
    fabricacionHerraje: meta.fabricacionHerraje,
    fabricacionConfiguracionId: meta.fabricacionConfiguracionId,
    fabricacionComposicionId: meta.fabricacionComposicionId,
    fabricacionVariante: meta.fabricacionVariante,
    fabricacionAnchoHojaAMm: meta.fabricacionAnchoHojaAMm,
    fabricacionGlazing: meta.fabricacionGlazing,
    fabricacionLeg: meta.fabricacionLeg,
    fabricacionReinforcement: meta.fabricacionReinforcement,
    fabricationRecipeId: meta.fabricationRecipeId,
    sheetScheme: meta.sheetScheme,
    sheetVariant: meta.sheetVariant,
    guidedVisualConfig: meta.guidedVisualConfig,
    quickCompositionAdjustment: meta.quickCompositionAdjustment,
  });
}

function createLogicalComponentId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Adds durable logical IDs only inside an explicit quote-save operation. */
export function ensureLogicalComponentIdsForQuoteSave(
  items: readonly CotizacionWorkflowItem[]
): CotizacionWorkflowItem[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (item.tipoItem === "item_libre_con_valor") return item;
    const metadata = decodeCotizacionItemPresentationMeta(item.observaciones);
    if (metadata.logicalComponentId && !seen.has(metadata.logicalComponentId)) {
      seen.add(metadata.logicalComponentId);
      return item;
    }
    const logicalComponentId = createLogicalComponentId();
    seen.add(logicalComponentId);
    return {
      ...item,
      observaciones: encodeCotizacionItemPresentationMeta({
        ...metadata,
        logicalComponentId,
        raw: metadata.raw,
      }),
    };
  });
}

function supplierProviderKey(item: CotizacionWorkflowItem): string {
  return (decodeCotizacionItemPresentationMeta(item.observaciones).supplierProviderKey ?? "")
    .trim()
    .toLocaleLowerCase("es-CL");
}

/**
 * Selects snapshots to calculate at save time without rewriting unchanged
 * historical items. Drafts being finalized and newly added/changed pieces are
 * eligible; unchanged historical NULL snapshots remain NULL.
 */
export function prepareFabricacionSnapshotsForQuoteSave(input: {
  existingId?: string | number | null;
  finalizingDraft?: boolean;
  existingItems?: readonly CotizacionWorkflowItem[];
  items: readonly CotizacionWorkflowItem[];
}): {
  items: CotizacionWorkflowItem[];
  itemIdsToResolve: Set<string>;
  /** Explicit pauta saves and provider changes must refresh the quote-level rollup. */
  shouldRebuildTrabajoSnapshot: boolean;
} {
  const resolveAllMissing = input.existingId == null || input.finalizingDraft === true;
  const existingById = new Map((input.existingItems ?? []).map((item) => [item.id, item]));
  const itemIdsToResolve = new Set<string>();
  let shouldRebuildTrabajoSnapshot = false;

  const items = input.items.map((item) => {
    if (item.tipoItem === "item_libre_con_valor") return item;
    const previous = existingById.get(item.id);
    const changed = previous != null && fabricationInputKey(previous) !== fabricationInputKey(item);
    const supplierChanged = previous != null && supplierProviderKey(previous) !== supplierProviderKey(item);

    if (supplierChanged) {
      // A supplier choice changes resolved presentation, finish/length and the
      // consolidated work pauta. It does not change the piece's recipe geometry.
      shouldRebuildTrabajoSnapshot = true;
    }

    if (changed) {
      itemIdsToResolve.add(item.id);
      return { ...item, fabricacionSnapshot: null };
    }

    if (previous && !changed) {
      if (
        item.fabricacionSnapshot &&
        JSON.stringify(item.fabricacionSnapshot) !== JSON.stringify(previous.fabricacionSnapshot ?? null)
      ) {
        // This path is reached only when a user explicitly saves a calculated
        // pauta from the review surface. Preserve all other historical items.
        shouldRebuildTrabajoSnapshot = true;
      }
      const preserved = item.fabricacionSnapshot ?? previous.fabricacionSnapshot ?? null;
      if (preserved) return { ...item, fabricacionSnapshot: preserved };
      if (!resolveAllMissing) return item;
      itemIdsToResolve.add(item.id);
      return item;
    }

    if (item.fabricacionSnapshot) return item;
    itemIdsToResolve.add(item.id);
    return item;
  });

  return { items, itemIdsToResolve, shouldRebuildTrabajoSnapshot };
}

/**
 * Resolve each eligible item independently. A malformed or unsupported piece
 * must stay without a snapshot without preventing other pieces from resolving.
 */
export function resolveFabricacionSnapshotsIndependently(input: {
  items: readonly CotizacionWorkflowItem[];
  itemIdsToResolve: ReadonlySet<string>;
  resolveSnapshot: (item: CotizacionWorkflowItem) => FabricacionCotizacionSnapshot | null;
  onItemError?: (item: CotizacionWorkflowItem, error: unknown) => void;
}): CotizacionWorkflowItem[] {
  return input.items.map((item) => {
    if (!input.itemIdsToResolve.has(item.id)) return item;
    try {
      const resolved = input.resolveSnapshot(item);
      if (!resolved) return { ...item, fabricacionSnapshot: null };
      const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
      const glassSelection = presentation.vidrioLineTemplateId || presentation.glassTechnicalSpec
        ? {
            productId: presentation.vidrioLineTemplateId || null,
            displayName: item.vidrio || null,
            technicalSpec: presentation.glassTechnicalSpec,
          }
        : undefined;
      return {
        ...item,
        fabricacionSnapshot: {
          ...resolved,
          ...(glassSelection ? { glassSelection } : {}),
        },
      };
    } catch (error) {
      input.onItemError?.(item, error);
      return item;
    }
  });
}

/**
 * Restricts the recipe read to lines that actually need a snapshot during this
 * save. Besides reducing payload and resolver work, this keeps the query
 * surface aligned with the per-item save scope.
 */
export function getFabricationRecipeLineTemplateIdsForSnapshotResolution(input: {
  items: readonly CotizacionWorkflowItem[];
  itemIdsToResolve: ReadonlySet<string>;
}): number[] {
  const lineTemplateIds = new Set<number>();

  for (const item of input.items) {
    if (!input.itemIdsToResolve.has(item.id)) continue;
    const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
    const rawId = presentation.lineTemplateId ?? item.fabricacionSnapshot?.lineTemplateId;
    const lineTemplateId = Number(rawId);
    if (Number.isInteger(lineTemplateId) && lineTemplateId > 0) {
      lineTemplateIds.add(lineTemplateId);
    }
  }

  return Array.from(lineTemplateIds);
}

export function resolveFabricacionTrabajoSnapshotForQuoteSave(input: {
  existingId?: string | number | null;
  existingSnapshot?: FabricacionTrabajoSnapshot | null;
  forceRebuild?: boolean;
  capturedAt: string;
  items: FabricationSnapshotCarrier;
}): FabricacionTrabajoSnapshot | null {
  if (input.existingId != null && !input.forceRebuild) {
    return input.existingSnapshot ?? null;
  }

  return construirFabricacionTrabajoSnapshot({
    capturedAt: input.capturedAt,
    items: input.items,
  });
}
