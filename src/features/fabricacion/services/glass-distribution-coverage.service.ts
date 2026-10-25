import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

export type GlassDistributionCoverageStatus = "complete" | "partial" | "unavailable";

export type GlassDistributionReference = {
  quoteItemId: string;
  componentCode: string;
  componentName: string;
  displayName: string | null;
  reason: string;
};

export type GlassDistributionCoverage = {
  status: GlassDistributionCoverageStatus;
  completeReferenceCount: number;
  pendingReferenceCount: number;
  pendingReferences: GlassDistributionReference[];
  diagnostics: string[];
};

type CoveragePane = {
  quoteItemId: string;
  componentCode?: string;
  componentName?: string | null;
  glassId: string | null;
  productId: string | null;
  displayName: string | null;
  logicalComponentId: string | null;
  technicalSpec: { hasConflict?: boolean; thicknessMm?: number | null; category?: string } | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  paneUnitIds?: string[];
  physicalUnitCount?: number | null;
  dimensionProvenance: string;
  recipeStatus: string | null;
  validationStatus?: string;
  warnings: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function itemHasExplicitGlass(item: CotizacionWorkflowItem): boolean {
  const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
  const snapshot = asRecord(item.fabricacionSnapshot);
  const selection = asRecord(snapshot?.glassSelection);
  const result = asRecord(snapshot?.result);
  const resultPanes = result?.vidrios;
  return Boolean(
    item.vidrio.trim()
    || presentation.vidrioLineTemplateId
    || presentation.glassTechnicalSpec
    || selection?.productId
    || selection?.displayName
    || (Array.isArray(resultPanes) && resultPanes.length > 0)
  );
}

export function isGlassCoveragePaneComplete(pane: CoveragePane): boolean {
  const physicalUnitCount = pane.physicalUnitCount ?? pane.paneUnitIds?.length ?? 0;
  return Boolean(
    pane.logicalComponentId
    && pane.glassId
    && pane.productId
    && pane.technicalSpec
    && !pane.technicalSpec.hasConflict
    && Number.isSafeInteger(pane.technicalSpec.thicknessMm)
    && Number(pane.technicalSpec.thicknessMm) > 0
    && pane.technicalSpec.category
    && pane.technicalSpec.category !== "pendiente"
    && Number.isSafeInteger(pane.widthMm)
    && Number(pane.widthMm) > 0
    && Number.isSafeInteger(pane.heightMm)
    && Number(pane.heightMm) > 0
    && Number.isSafeInteger(pane.quantity)
    && pane.quantity > 0
    && pane.quantity === physicalUnitCount
    && pane.dimensionProvenance !== "legacy_snapshot"
  );
}

function referenceKey(pane: CoveragePane): string {
  return `${pane.quoteItemId}|${pane.glassId ?? pane.productId ?? pane.displayName ?? "glass-reference"}`;
}

/**
 * Compares identifiable glass references on the quote with frozen technical panes.
 * Pending references deliberately carry no physical-unit count: without valid
 * dimensions the quantity must not be presented as a cut order.
 */
export function buildGlassDistributionCoverage(input: {
  items: readonly CotizacionWorkflowItem[];
  panes: readonly CoveragePane[];
}): GlassDistributionCoverage {
  const itemsById = new Map(input.items.map((item) => [item.id, item]));
  const refs = new Map<string, { panes: CoveragePane[]; item: CotizacionWorkflowItem | undefined }>();

  for (const pane of input.panes) {
    const key = referenceKey(pane);
    const current = refs.get(key);
    if (current) current.panes.push(pane);
    else refs.set(key, { panes: [pane], item: itemsById.get(pane.quoteItemId) });
  }

  for (const item of input.items) {
    if (!itemHasExplicitGlass(item)) continue;
    const itemRefs = [...refs.values()].filter((reference) => reference.item?.id === item.id);
    if (itemRefs.length === 0) {
      refs.set(`${item.id}|unresolved-glass-reference`, { panes: [], item });
    }
  }

  let completeReferenceCount = 0;
  const pendingReferences: GlassDistributionReference[] = [];
  for (const reference of refs.values()) {
    const complete = reference.panes.length > 0 && reference.panes.every(isGlassCoveragePaneComplete);
    if (complete) {
      completeReferenceCount += 1;
      continue;
    }

    const pane = reference.panes[0];
    const item = reference.item;
    const reason = pane
      ? [...new Set(pane.warnings)].join(" ") || "La referencia no tiene dimensiones técnicas completas y verificables."
      : "No existe un paño técnico congelado con dimensiones para esta referencia.";
    pendingReferences.push({
      quoteItemId: item?.id ?? pane?.quoteItemId ?? "",
      componentCode: pane?.componentCode ?? item?.codigo ?? "Componente",
      componentName: pane?.componentName ?? item?.nombre ?? "Componente de la cotización",
      displayName: pane?.displayName ?? item?.vidrio ?? null,
      reason,
    });
  }

  const status: GlassDistributionCoverageStatus = completeReferenceCount === 0
    ? "unavailable"
    : pendingReferences.length > 0 ? "partial" : "complete";
  const diagnostics = pendingReferences.map((reference) =>
    `${reference.componentCode} · ${reference.componentName}: ${reference.reason}`
  );
  if (refs.size === 0) diagnostics.push("No se pudieron identificar referencias técnicas de paño en los componentes de esta cotización.");

  return {
    status,
    completeReferenceCount,
    pendingReferenceCount: pendingReferences.length,
    pendingReferences,
    diagnostics,
  };
}

