import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { normalizeManualGlassPaneMeasurements } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";

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
  paneSlotId?: string;
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
    || (item.manualGlassMeasurements ?? presentation.manualGlassMeasurements).entries.length > 0
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
    && Number.isFinite(pane.technicalSpec.thicknessMm)
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
    && (pane.recipeStatus === "validated" || pane.dimensionProvenance === "manual")
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
  const refs = new Map<string, { panes: CoveragePane[]; item: CotizacionWorkflowItem | undefined; isConflictedSlot?: boolean }>();
  const invalidatedSlotPanes = new Set<CoveragePane>();

  for (const rawPane of input.panes) {
    const pane: CoveragePane = { ...rawPane, warnings: [...rawPane.warnings] };
    const key = referenceKey(pane);
    const current = refs.get(key);
    if (current) current.panes.push(pane);
    else refs.set(key, { panes: [pane], item: itemsById.get(pane.quoteItemId) });
  }

  const isPaneComplete = (pane: CoveragePane): boolean =>
    !invalidatedSlotPanes.has(pane) && isGlassCoveragePaneComplete(pane);

  for (const item of input.items) {
    const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
    const savedManual = item.manualGlassMeasurements ?? presentation.manualGlassMeasurements;
    const manualSnapshot = normalizeManualGlassPaneMeasurements(savedManual);
    const expected = resolveManualGlassPaneSlots({
      componentType: presentation.fabricacionTipologia || item.tipo,
      system: presentation.sistema,
      configuration: presentation.configuracion,
      sheetScheme: presentation.sheetScheme,
      fabricacionHojas: presentation.fabricacionHojas,
      guidedVisualConfig: presentation.guidedVisualConfig,
      quickCompositionAdjustment: presentation.quickCompositionAdjustment,
    });
    const itemQuantity = Math.max(1, Number.isSafeInteger(item.cantidad) && item.cantidad > 0 ? item.cantidad : 1);
    const itemRefs = [...refs.entries()].filter(([, reference]) => reference.item?.id === item.id);
    const itemPanes = itemRefs.flatMap(([, reference]) => reference.panes);
    let hasExpectedPendingSlots = false;

    if (expected.countIsKnown) {
      const validSlotIds = new Set(expected.slots.map((slot) => slot.id));
      const snapshotStale = manualSnapshot.configurationFingerprint != null
        && manualSnapshot.configurationFingerprint !== expected.configurationFingerprint;

      const manualPanes = itemPanes.filter((pane) => pane.dimensionProvenance === "manual");
      const manualEntryByGlassId = new Map(manualSnapshot.entries.map((entry) => [entry.id, entry]));
      const resolvedSlotByPane = new Map<CoveragePane, string | null>();
      const slotClaimCounts = new Map<string, number>();

      for (const pane of manualPanes) {
        const entry = pane.glassId ? manualEntryByGlassId.get(pane.glassId) : undefined;
        const explicitSlotId = pane.paneSlotId ?? entry?.paneSlotId ?? null;
        const resolvedSlotId = explicitSlotId
          ?? (expected.slots.length === 1 && manualPanes.length === 1 ? expected.slots[0]?.id ?? null : null);
        resolvedSlotByPane.set(pane, resolvedSlotId);
        if (resolvedSlotId && validSlotIds.has(resolvedSlotId)) {
          slotClaimCounts.set(resolvedSlotId, (slotClaimCounts.get(resolvedSlotId) ?? 0) + 1);
        }
      }

      const coveredManualSlotIds = new Set<string>();
      const conflictedSlotPanes = new Map<string, CoveragePane[]>();

      for (const pane of manualPanes) {
        const resolvedSlotId = resolvedSlotByPane.get(pane) ?? null;
        if (snapshotStale) {
          pane.warnings.push("La configuración del componente cambió desde que se registraron las medidas manuales; revisa y vuelve a confirmar cada paño.");
          invalidatedSlotPanes.add(pane);
        } else if (!resolvedSlotId || !validSlotIds.has(resolvedSlotId)) {
          pane.warnings.push("La medición manual debe asociarse explícitamente a su posición de paño.");
          invalidatedSlotPanes.add(pane);
        } else if ((slotClaimCounts.get(resolvedSlotId) ?? 0) > 1) {
          pane.warnings.push("Existen múltiples mediciones manuales asignadas a la misma posición de paño.");
          invalidatedSlotPanes.add(pane);
          const group = conflictedSlotPanes.get(resolvedSlotId) ?? [];
          group.push(pane);
          conflictedSlotPanes.set(resolvedSlotId, group);
        } else if (isPaneComplete(pane)) {
          coveredManualSlotIds.add(resolvedSlotId);
        }
      }

      for (const [slotId, panesInConflict] of conflictedSlotPanes.entries()) {
        for (const pane of panesInConflict) {
          refs.delete(referenceKey(pane));
        }
        refs.set(`${item.id}|slot:${slotId}`, {
          panes: panesInConflict,
          item,
          isConflictedSlot: true,
        });
      }

      const automaticPaneCount = itemPanes
        .filter((pane) => pane.dimensionProvenance === "validated_recipe" && isPaneComplete(pane))
        .reduce((sum, pane) => sum + pane.quantity / itemQuantity, 0);

      const coveredSlotsCount = snapshotStale
        ? 0
        : Math.min(expected.slots.length, Math.max(coveredManualSlotIds.size, Math.round(automaticPaneCount)));
      const uncoveredSlotsCount = Math.max(0, expected.slots.length - coveredSlotsCount);

      if (coveredSlotsCount > 0) {
        const unslottedPreliminaryRefKeys = [...refs.entries()]
          .filter(([, reference]) =>
            reference.item?.id === item.id
            && reference.panes.length > 0
            && reference.panes.every((pane) =>
              (pane.dimensionProvenance === "recipe_trace" || pane.dimensionProvenance === "legacy_snapshot")
              && !pane.paneSlotId
            )
          )
          .map(([key]) => key);

        if (unslottedPreliminaryRefKeys.length > uncoveredSlotsCount) {
          for (const key of unslottedPreliminaryRefKeys.slice(uncoveredSlotsCount)) {
            refs.delete(key);
          }
        }
      }

      const currentItemRefs = [...refs.values()].filter((reference) => reference.item?.id === item.id);
      const pendingItemRefs = currentItemRefs.filter(
        (reference) => !(reference.panes.length > 0 && reference.panes.every(isPaneComplete))
      );

      const accountedUncoveredSlots = pendingItemRefs.reduce((sum, reference) => {
        if (reference.isConflictedSlot) return sum + 1;
        const refQuantity = reference.panes.reduce(
          (qtySum, pane) => qtySum + (Number.isSafeInteger(pane.quantity) && pane.quantity > 0 ? pane.quantity : 0),
          0
        );
        const slotsForRef = refQuantity > 0 ? Math.max(1, Math.round(refQuantity / itemQuantity)) : 1;
        return sum + slotsForRef;
      }, 0);

      const missingCount = Math.max(0, uncoveredSlotsCount - accountedUncoveredSlots);
      hasExpectedPendingSlots = missingCount > 0 || pendingItemRefs.length > 0;
      for (let index = 0; index < missingCount; index += 1) {
        refs.set(`${item.id}|expected-pane-pending-${index + 1}`, {
          panes: [], item,
        });
      }
    } else if (manualSnapshot.version === 2 && itemHasExplicitGlass(item) && itemRefs.length > 0
      && manualSnapshot.entries.length > 0
      && (!manualSnapshot.allPanesConfirmed || manualSnapshot.configurationFingerprint !== expected.configurationFingerprint)) {
      refs.set(`${item.id}|pane-completeness-unconfirmed`, { panes: [], item });
    }

    if (!itemHasExplicitGlass(item)) continue;
    const updatedItemRefsCount = [...refs.values()].filter((reference) => reference.item?.id === item.id).length;
    if (updatedItemRefsCount === 0 && !hasExpectedPendingSlots) {
      refs.set(`${item.id}|unresolved-glass-reference`, { panes: [], item });
    }
  }

  let completeReferenceCount = 0;
  const pendingReferences: GlassDistributionReference[] = [];
  for (const reference of refs.values()) {
    const complete = reference.panes.length > 0 && reference.panes.every(isPaneComplete);
    if (complete) {
      completeReferenceCount += 1;
      continue;
    }

    const pane = reference.panes[0];
    const item = reference.item;
    const reason = pane
      ? [...new Set(pane.warnings)].join(" ") || "La referencia no tiene dimensiones técnicas completas y verificables."
      : "Falta registrar uno o más paños de vidrio de este componente.";
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
