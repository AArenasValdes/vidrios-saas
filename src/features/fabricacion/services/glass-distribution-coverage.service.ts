import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { normalizeManualGlassPaneMeasurements } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import { resolveManualGlassPaneComponentType, resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";

export type GlassDistributionCoverageStatus = "complete" | "partial" | "unavailable";

export type GlassDistributionReference = {
  quoteItemId: string;
  paneId?: string;
  glassId?: string | null;
  paneSlotId?: string;
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

export type GlassPaneGeometryCandidate = {
  quoteItemId: string;
  paneId?: string;
  snapshotFingerprint?: string;
  componentCode?: string;
  componentName?: string | null;
  glassId: string | null;
  paneSlotId?: string;
  productId: string | null;
  displayName: string | null;
  logicalComponentId: string | null;
  technicalSpec: { productId?: string | null; hasConflict?: boolean; thicknessMm?: number | null; category?: string; manualCutStatus?: string; purchaseMode?: "undecided" | "full_sheet" | "supplier_cut" } | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  commercialQuantity?: number | null;
  paneUnitIds?: string[];
  physicalUnitCount?: number | null;
  dimensionProvenance: string;
  recipeStatus: string | null;
  validationStatus?: string;
  warnings: string[];
};

export type GlassPaneGeometryExclusion = {
  quoteItemId: string;
  paneId: string;
  componentCode: string;
  componentName: string;
  displayName: string | null;
  reason: string;
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

export function isGlassCoveragePaneComplete(pane: GlassPaneGeometryCandidate): boolean {
  const physicalUnitCount = pane.physicalUnitCount ?? pane.paneUnitIds?.length ?? 0;
  return Boolean(
    pane.validationStatus === "eligible_for_manual_planning"
    &&
    pane.logicalComponentId
    && pane.glassId
    && pane.productId
    && pane.technicalSpec
    && !pane.technicalSpec.hasConflict
    && pane.technicalSpec.productId === pane.productId
    && pane.technicalSpec.purchaseMode === "full_sheet"
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

/** Safe for an informative geometric preview; it does not grant coverage or workshop eligibility. */
export function getGlassPaneGeometryExclusionReason(pane: GlassPaneGeometryCandidate): string | null {
  const physicalUnitCount = pane.physicalUnitCount ?? pane.paneUnitIds?.length ?? 0;
  const warnings = pane.warnings ?? [];
  const blockingWarning = warnings.find((warning) =>
    warning.includes("ficha técnica del vidrio cambió")
    || warning.includes("configuración del componente cambió")
    || warning.includes("debe asociarse explícitamente")
    || warning.includes("múltiples mediciones manuales asignadas")
    || warning.includes("no corresponde a un múltiplo de la cantidad comercial")
    || warning.includes("cantidad comercial guardada del componente no es válida")
    || warning.includes("geometría del paño no es rectangular")
  );
  if (blockingWarning) return blockingWarning;
  if (pane.dimensionProvenance === "legacy_snapshot") return "El snapshot histórico no conserva identidad técnica suficiente para simular este paño.";
  if (pane.dimensionProvenance === "missing") return "No hay dimensiones congeladas para este paño.";
  if (!pane.logicalComponentId || !pane.glassId || !pane.paneId || !pane.snapshotFingerprint) return "Falta identidad física estable del componente, vidrio o snapshot.";
  if (!pane.productId || !pane.technicalSpec) return "Falta el producto o la especificación técnica congelada del vidrio.";
  if (pane.technicalSpec.hasConflict) return "La especificación técnica del vidrio tiene un conflicto pendiente.";
  if (pane.technicalSpec.productId !== pane.productId) return "El producto no coincide exactamente con la especificación técnica congelada.";
  if (pane.technicalSpec.purchaseMode === "supplier_cut") return "Este vidrio se compra cortado por proveedor; no corresponde distribuirlo como plancha del taller.";
  if (pane.technicalSpec.purchaseMode === "undecided") return "Confirma si este vidrio se compra por plancha antes de distribuirlo en el taller.";
  if (pane.technicalSpec.purchaseMode !== "full_sheet") return "La ficha antigua no confirma la forma de compra. Selecciona plancha completa antes de distribuir este vidrio en el taller.";
  if (!Number.isFinite(pane.technicalSpec.thicknessMm) || Number(pane.technicalSpec.thicknessMm) <= 0) return "Falta un espesor técnico válido del vidrio.";
  if (!pane.technicalSpec.category || pane.technicalSpec.category === "pendiente") return "Falta una categoría técnica compatible del vidrio.";
  if (pane.technicalSpec.manualCutStatus === "not_admitted") return "La especificación del vidrio no admite corte manual.";
  if (!Number.isSafeInteger(pane.widthMm) || Number(pane.widthMm) <= 0 || !Number.isSafeInteger(pane.heightMm) || Number(pane.heightMm) <= 0) {
    return "Faltan dimensiones rectangulares, enteras y positivas congeladas para este paño.";
  }
  if (!Number.isSafeInteger(Number(pane.widthMm) * Number(pane.heightMm))) return "El área geométrica del paño excede el rango entero seguro.";
  if (!Number.isSafeInteger(pane.quantity) || pane.quantity <= 0 || pane.quantity !== physicalUnitCount) return "La cantidad física no coincide con las identidades de unidad guardadas.";
  if (!Number.isSafeInteger(pane.commercialQuantity) || Number(pane.commercialQuantity) <= 0) return "Falta una cantidad comercial válida para comprobar las unidades físicas.";
  if (pane.quantity % Number(pane.commercialQuantity) !== 0) return "La cantidad física no es coherente con la cantidad comercial del componente.";
  if (!pane.paneUnitIds?.length || pane.paneUnitIds.length !== pane.quantity || pane.paneUnitIds.some((id) => !id.trim())
    || new Set(pane.paneUnitIds).size !== pane.paneUnitIds.length) return "Faltan identidades físicas únicas para cada unidad de este paño.";
  return null;
}

/** Safe for an informative geometric preview; it does not grant coverage or workshop eligibility. */
export function isGlassPaneGeometryComplete(pane: GlassPaneGeometryCandidate): boolean {
  return getGlassPaneGeometryExclusionReason(pane) === null;
}

function referenceKey(pane: GlassPaneGeometryCandidate): string {
  return `${pane.quoteItemId}|${pane.glassId ?? pane.productId ?? pane.displayName ?? "glass-reference"}`;
}

/**
 * Compares identifiable glass references on the quote with frozen technical panes.
 * Pending references deliberately carry no physical-unit count: without valid
 * dimensions the quantity must not be presented as a cut order.
 */
export function buildGlassDistributionCoverage(input: {
  items: readonly CotizacionWorkflowItem[];
  panes: readonly GlassPaneGeometryCandidate[];
}): GlassDistributionCoverage {
  const itemsById = new Map(input.items.map((item) => [item.id, item]));
  const refs = new Map<string, { panes: GlassPaneGeometryCandidate[]; item: CotizacionWorkflowItem | undefined; isConflictedSlot?: boolean }>();
  const invalidatedSlotPanes = new Set<GlassPaneGeometryCandidate>();

  for (const rawPane of input.panes) {
    const pane: GlassPaneGeometryCandidate = { ...rawPane, warnings: [...rawPane.warnings] };
    const key = referenceKey(pane);
    const current = refs.get(key);
    if (current) current.panes.push(pane);
    else refs.set(key, { panes: [pane], item: itemsById.get(pane.quoteItemId) });
  }

  const isPaneComplete = (pane: GlassPaneGeometryCandidate): boolean => {
    const item = itemsById.get(pane.quoteItemId);
    const itemQuantity = item?.cantidad;
    return !invalidatedSlotPanes.has(pane)
      && Number.isSafeInteger(itemQuantity)
      && Number(itemQuantity) > 0
      && Number.isSafeInteger(pane.quantity)
      && pane.quantity % Number(itemQuantity) === 0
      && isGlassCoveragePaneComplete(pane);
  };

  for (const item of input.items) {
    const presentation = decodeCotizacionItemPresentationMeta(item.observaciones);
    const savedManual = item.manualGlassMeasurements ?? presentation.manualGlassMeasurements;
    const manualSnapshot = normalizeManualGlassPaneMeasurements(savedManual);
    const expected = resolveManualGlassPaneSlots({
      componentType: resolveManualGlassPaneComponentType({
        itemType: item.tipo,
        fabricationType: presentation.fabricacionTipologia,
      }),
      system: presentation.sistema,
      configuration: presentation.configuracion,
      sheetScheme: presentation.sheetScheme,
      fabricacionHojas: presentation.fabricacionHojas,
      guidedVisualConfig: presentation.guidedVisualConfig,
      quickCompositionAdjustment: presentation.quickCompositionAdjustment,
      manualPaneCount: manualSnapshot.manualPaneCount,
    });
    const itemQuantity = Number.isSafeInteger(item.cantidad) && item.cantidad > 0 ? item.cantidad : 0;
    const itemRefs = [...refs.entries()].filter(([, reference]) => reference.item?.id === item.id);
    const itemPanes = itemRefs.flatMap(([, reference]) => reference.panes);
    let hasExpectedPendingSlots = false;

    for (const pane of itemPanes) {
      if (itemQuantity === 0) {
        pane.warnings.push("La cantidad comercial guardada del componente no es válida; no se puede reconciliar la cantidad física de vidrio.");
        invalidatedSlotPanes.add(pane);
      } else if (Number.isSafeInteger(pane.quantity) && pane.quantity > 0 && pane.quantity % itemQuantity !== 0) {
        pane.warnings.push("La cantidad física congelada no corresponde a un múltiplo de la cantidad comercial del componente.");
        invalidatedSlotPanes.add(pane);
      }
    }

    if (expected.countIsKnown) {
      const validSlotIds = new Set(expected.slots.map((slot) => slot.id));
      const snapshotStale = manualSnapshot.configurationFingerprint != null
        && manualSnapshot.configurationFingerprint !== expected.configurationFingerprint;

      const manualPanes = itemPanes.filter((pane) => pane.dimensionProvenance === "manual");
      const manualEntryByGlassId = new Map(manualSnapshot.entries.map((entry) => [entry.id, entry]));
      const resolvedSlotByPane = new Map<GlassPaneGeometryCandidate, string | null>();
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
      const conflictedSlotPanes = new Map<string, GlassPaneGeometryCandidate[]>();

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

      const automaticPaneCount = itemQuantity > 0 ? itemPanes
        .filter((pane) => pane.dimensionProvenance === "validated_recipe" && isPaneComplete(pane))
        .reduce((sum, pane) => sum + pane.quantity / itemQuantity, 0) : 0;

      const coveredSlotsCount = snapshotStale
        ? 0
        : Math.min(expected.slots.length, Math.max(coveredManualSlotIds.size, automaticPaneCount));
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
        if (itemQuantity > 0 && refQuantity > 0 && refQuantity % itemQuantity !== 0) return sum + expected.slots.length;
        const slotsForRef = refQuantity > 0 && itemQuantity > 0 ? Math.max(1, refQuantity / itemQuantity) : 1;
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
      ...(pane?.paneId ? { paneId: pane.paneId } : {}),
      ...(pane?.glassId ? { glassId: pane.glassId } : {}),
      ...(pane?.paneSlotId ? { paneSlotId: pane.paneSlotId } : {}),
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
