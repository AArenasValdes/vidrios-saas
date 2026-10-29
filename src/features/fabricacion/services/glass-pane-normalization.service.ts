import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { FabricacionVidrioResultado } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { buildCatalogGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import {
  getCatalogGlassTechnicalFingerprint,
  normalizeManualGlassPaneMeasurements,
} from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";

export const GLASS_PANE_NORMALIZATION_VERSION = 1 as const;
const MAX_NORMALIZED_PHYSICAL_UNITS = 2_000;

export type NormalizedGlassPane = {
  organizationId: string | number;
  quoteId: string | number;
  quoteItemId: string;
  logicalComponentId: string | null;
  glassId: string | null;
  paneId: string;
  paneSlotId?: string;
  paneUnitIds: string[];
  ordinal: number;
  productId: string | null;
  displayName: string | null;
  technicalSpec: GlassTechnicalSpec | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  commercialQuantity: number | null;
  dimensionProvenance: "validated_recipe" | "recipe_trace" | "manual" | "legacy_snapshot" | "missing";
  dimensionTraceRuleIds: string[];
  recipeStatus: string | null;
  validationStatus: "eligible_for_manual_planning" | "requires_review";
  warnings: string[];
  snapshotVersion: number;
  snapshotFingerprint: string;
  normalizationVersion: typeof GLASS_PANE_NORMALIZATION_VERSION;
};

type ExtractInput = {
  organizationId: string | number;
  quoteId: string | number;
  item: CotizacionWorkflowItem;
  catalogGlassProducts?: ReadonlyMap<string, { name: string; catalogMetadata: Record<string, unknown> }>;
};

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function fingerprint(value: unknown): string {
  const json = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeRow(input: {
  context: ExtractInput;
  logicalComponentId: string | null;
  glassId: string | null;
  productId: string | null;
  displayName: string | null;
  spec: GlassTechnicalSpec | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  paneSlotId?: string;
  dimensionTraceRuleIds: string[];
  recipeStatus: string | null;
  snapshotVersion: number;
  source: "validated_recipe" | "recipe_trace" | "manual" | "legacy_snapshot" | "missing";
  rawSnapshot: unknown;
  additionalWarnings?: string[];
}): NormalizedGlassPane {
  const { context } = input;
  const warnings: string[] = [];
  if (!input.logicalComponentId) warnings.push("Falta identidad lógica estable del componente.");
  if (!input.glassId) warnings.push("El snapshot no identifica el paño de vidrio.");
  if (!input.productId || !input.spec) warnings.push("Falta producto o especificación técnica congelada.");
  if (input.spec?.productId && input.productId && input.spec.productId !== input.productId) {
    warnings.push("El producto congelado no coincide con la especificación técnica.");
  }
  if (input.spec?.hasConflict) warnings.push("La especificación manual difiere del catálogo de origen.");
  if (input.spec && input.spec.thicknessMm == null) warnings.push("Falta el espesor técnico en milímetros.");
  if (input.spec && (input.spec.sheetWidthMm == null || input.spec.sheetHeightMm == null)) {
    warnings.push("Falta el formato físico de plancha de vidrio.");
  }
  if (input.spec?.purchaseMode === undefined) warnings.push("La forma de compra no está confirmada en esta ficha antigua.");
  else if (input.spec.purchaseMode === "undecided") warnings.push("Confirma si este vidrio se compra por plancha antes de distribuirlo.");
  else if (input.spec.purchaseMode === "supplier_cut") warnings.push("Este vidrio se compra cortado por proveedor; no corresponde distribuirlo como plancha del taller.");
  if (input.spec?.manualCutStatus !== "confirmed") warnings.push("El corte manual no está confirmado para este producto.");
  if (input.spec?.category === "pendiente") warnings.push("La categoría técnica del vidrio está pendiente.");
  if (input.additionalWarnings?.includes("non_rectangular")) warnings.push("La geometría del paño no es rectangular y no se puede enviar como corte rectangular verificado.");
  if (input.widthMm == null || input.heightMm == null) warnings.push("Faltan dimensiones válidas del paño.");
  if (input.quantity <= 0 || !Number.isSafeInteger(input.quantity)) warnings.push("La cantidad del snapshot no es válida.");
  const itemQuantity = positiveInteger(context.item.cantidad);
  if (!itemQuantity) {
    warnings.push("La cantidad comercial guardada del componente no es válida; no se puede reconciliar la cantidad física de vidrio.");
  } else if (input.quantity > 0 && input.quantity % itemQuantity !== 0) {
    warnings.push("La cantidad física congelada no corresponde a un múltiplo de la cantidad comercial del componente.");
  }
  if (input.quantity > MAX_NORMALIZED_PHYSICAL_UNITS) warnings.push("La cantidad excede el límite seguro de paños para una optimización.");
  if (input.source === "legacy_snapshot") warnings.push("El paño proviene de un snapshot legacy sin identidad técnica completa.");
  warnings.push(...(input.additionalWarnings ?? []));

  const paneId = input.logicalComponentId && input.glassId
    ? `${input.logicalComponentId}:${input.glassId}`
    : `review:${String(context.quoteId)}:${context.item.id}:${input.glassId ?? "unknown"}`;
  const paneUnitIds = Number.isSafeInteger(input.quantity) && input.quantity > 0 && input.quantity <= MAX_NORMALIZED_PHYSICAL_UNITS
    ? Array.from({ length: input.quantity }, (_, index) => `${paneId}:${index + 1}`)
    : [];
  const recipeValidated = input.recipeStatus === "validated";
  if (!recipeValidated && input.source !== "manual") warnings.push("La receta no está validada por el taller.");
  const eligible = warnings.length === 0 && (recipeValidated || input.source === "manual") && input.source !== "legacy_snapshot";

  return {
    organizationId: context.organizationId,
    quoteId: context.quoteId,
    quoteItemId: context.item.id,
    logicalComponentId: input.logicalComponentId,
    glassId: input.glassId,
    paneId,
    ...(input.paneSlotId ? { paneSlotId: input.paneSlotId } : {}),
    paneUnitIds,
    ordinal: 1,
    productId: input.productId,
    displayName: input.displayName,
    technicalSpec: input.spec,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    commercialQuantity: positiveInteger(context.item.cantidad),
    dimensionProvenance: input.source,
    dimensionTraceRuleIds: input.dimensionTraceRuleIds,
    recipeStatus: input.recipeStatus,
    validationStatus: eligible ? "eligible_for_manual_planning" : "requires_review",
    warnings,
    snapshotVersion: input.snapshotVersion,
    snapshotFingerprint: fingerprint(input.rawSnapshot),
    normalizationVersion: GLASS_PANE_NORMALIZATION_VERSION,
  };
}

/** Extracts only frozen pane geometry; never consults the live glass catalog or area estimates. */
export function extractNormalizedGlassPanes(input: ExtractInput): NormalizedGlassPane[] {
  const presentation = decodeCotizacionItemPresentationMeta(input.item.observaciones);
  const snapshot = input.item.fabricacionSnapshot as FabricacionCotizacionSnapshot | null | undefined;
  const selection = snapshot?.glassSelection;
  const logicalComponentId = presentation.logicalComponentId || null;
  const spec = selection?.technicalSpec ?? presentation.glassTechnicalSpec;
  const productId = selection?.productId ?? (presentation.vidrioLineTemplateId || null);
  const displayName = selection?.displayName ?? (input.item.vidrio || null);

  const recipePanes = Array.isArray(snapshot?.result?.vidrios) && snapshot.result.vidrios.length > 0
    ? snapshot.result.vidrios.map((glass: FabricacionVidrioResultado) => {
      // Older or partially persisted snapshots may omit trace metadata. Geometry still
      // comes exclusively from the frozen pane result; missing trace only reduces evidence.
      const dimensionTraceRuleIds = Array.isArray(glass.trazabilidad)
        ? glass.trazabilidad.flatMap((trace) => typeof trace?.reglaId === "string" ? [trace.reglaId] : [])
        : [];
      const provenance = snapshot.recipeStatus === "validated"
        ? "validated_recipe"
        : "recipe_trace";
      const row = normalizeRow({
        context: input,
        logicalComponentId,
        glassId: glass.vidrioId || null,
        productId,
        displayName: displayName ?? glass.nombre,
        spec,
        widthMm: positiveInteger(glass.anchoMm),
        heightMm: positiveInteger(glass.altoMm),
        // FabricacionVidrioResultado quantity already includes quote-item quantity.
        quantity: positiveInteger(glass.cantidadPiezas) ?? 0,
        dimensionTraceRuleIds,
        recipeStatus: snapshot.recipeStatus,
        snapshotVersion: snapshot.schemaVersion,
        source: provenance,
        rawSnapshot: { snapshot, glass },
      });
      return row;
    })
    : [];

  const manualMeasurements = normalizeManualGlassPaneMeasurements(
    input.item.manualGlassMeasurements ?? presentation.manualGlassMeasurements
  );
  const expectedSlots = manualMeasurements.entries.length > 0
    ? resolveManualGlassPaneSlots({
      componentType: presentation.fabricacionTipologia || input.item.tipo,
      system: presentation.sistema,
      configuration: presentation.configuracion,
      sheetScheme: presentation.sheetScheme,
      fabricacionHojas: presentation.fabricacionHojas,
      guidedVisualConfig: presentation.guidedVisualConfig,
      quickCompositionAdjustment: presentation.quickCompositionAdjustment,
      manualPaneCount: manualMeasurements.manualPaneCount,
    })
    : null;
  const validSlotIds = expectedSlots?.countIsKnown
    ? new Set(expectedSlots.slots.map((slot) => slot.id))
    : null;
  const manualSnapshotStale = Boolean(
    expectedSlots?.countIsKnown
    && manualMeasurements.configurationFingerprint != null
    && manualMeasurements.configurationFingerprint !== expectedSlots.configurationFingerprint
  );
  const manualSlotClaimCounts = new Map<string, number>();
  if (validSlotIds && expectedSlots) {
    for (const entry of manualMeasurements.entries) {
      const slotId = entry.paneSlotId
        ?? (expectedSlots.slots.length === 1 && manualMeasurements.entries.length === 1
          ? expectedSlots.slots[0]?.id
          : undefined);
      if (slotId && validSlotIds.has(slotId)) {
        manualSlotClaimCounts.set(slotId, (manualSlotClaimCounts.get(slotId) ?? 0) + 1);
      }
    }
  }
  const manual = manualMeasurements.entries.flatMap((entry) => {
    const catalogProduct = input.catalogGlassProducts?.get(entry.productId);
    const currentSpec = catalogProduct
      ? buildCatalogGlassTechnicalSpec({ productId: entry.productId, metadata: catalogProduct.catalogMetadata })
      : null;
    const specFingerprint = currentSpec ? getCatalogGlassTechnicalFingerprint(currentSpec) : null;
    const warnings = !catalogProduct
      ? ["El vidrio guardado ya no está disponible en el catálogo activo de esta organización."]
      : specFingerprint !== entry.technicalFingerprint
        ? ["La ficha técnica del vidrio cambió desde que se ingresaron estas medidas; revisa y vuelve a guardar la referencia."]
        : [];
    const slotWarnings: string[] = [];
    if (expectedSlots?.countIsKnown && validSlotIds) {
      const resolvedSlotId = entry.paneSlotId
        ?? (expectedSlots.slots.length === 1 && manualMeasurements.entries.length === 1
          ? expectedSlots.slots[0]?.id
          : undefined);
      if (manualSnapshotStale) {
        slotWarnings.push("La configuración del componente cambió desde que se registraron las medidas manuales; revisa y vuelve a confirmar cada paño.");
      } else if (!resolvedSlotId || !validSlotIds.has(resolvedSlotId)) {
        slotWarnings.push("La medición manual debe asociarse explícitamente a su posición de paño.");
      } else if ((manualSlotClaimCounts.get(resolvedSlotId) ?? 0) > 1) {
        slotWarnings.push("Existen múltiples mediciones manuales asignadas a la misma posición de paño.");
      }
    }
    return [normalizeRow({
      context: input,
      logicalComponentId,
      glassId: entry.id,
      productId: entry.productId,
      displayName: catalogProduct?.name ?? entry.productId,
      spec: currentSpec,
      widthMm: positiveInteger(entry.widthMm),
      heightMm: positiveInteger(entry.heightMm),
      quantity: entry.quantityBasis === "per_component"
        ? (positiveInteger(entry.quantity) ?? 0) * (positiveInteger(input.item.cantidad) ?? 0)
        : positiveInteger(entry.quantity) ?? 0,
      ...(entry.paneSlotId ? { paneSlotId: entry.paneSlotId } : {}),
      dimensionTraceRuleIds: [],
      recipeStatus: null,
      snapshotVersion: entry.version,
      source: "manual",
      rawSnapshot: entry,
      additionalWarnings: [...warnings, ...slotWarnings, ...(entry.rectangularVerified === false ? ["non_rectangular"] : [])],
    })];
  });

  if (recipePanes.length > 0) {
    // Prefer the validated recipe when it covers at least as many physical panes
    // for that catalog product. If it resolves only part of the reference and the
    // maestro has a fuller manual backup, use that backup instead of duplicating
    // unmatchable recipe/manual panes.
    const validAutomaticProducts = new Set(recipePanes
      .filter((pane) => pane.validationStatus === "eligible_for_manual_planning")
      .map((pane) => pane.productId)
      .filter((id): id is string => Boolean(id)));
    const itemQuantity = positiveInteger(input.item.cantidad);
    const automaticCounts = new Map<string, number>();
    const manualCounts = new Map<string, number>();
    for (const pane of recipePanes) {
      if (pane.validationStatus !== "eligible_for_manual_planning" || !pane.productId) continue;
      if (itemQuantity) automaticCounts.set(pane.productId, (automaticCounts.get(pane.productId) ?? 0) + pane.quantity / itemQuantity);
    }
    for (const pane of manual) {
      if (!pane.productId) continue;
      if (itemQuantity) manualCounts.set(pane.productId, (manualCounts.get(pane.productId) ?? 0) + pane.quantity / itemQuantity);
    }
    const manualFallbackProducts = new Set([...manualCounts]
      .filter(([productId, count]) => validAutomaticProducts.has(productId) && count > (automaticCounts.get(productId) ?? 0))
      .map(([productId]) => productId));
    const manualPanes = manual.filter((pane) => pane.productId == null
      || !validAutomaticProducts.has(pane.productId)
      || manualFallbackProducts.has(pane.productId));
    const retainedRecipePanes = recipePanes.filter((pane) =>
      pane.validationStatus === "eligible_for_manual_planning"
        ? !pane.productId || !manualFallbackProducts.has(pane.productId)
        : !manualPanes.some((manualPane) => !pane.productId || !manualPane.productId || manualPane.productId === pane.productId)
    );
    return [...retainedRecipePanes, ...manualPanes];
  }

  if (manual.length > 0) return manual;

  const legacyGlass = presentation.cubicationSnapshot?.glass;
  if (!legacyGlass) return [];
  return [normalizeRow({
    context: input,
    logicalComponentId,
    glassId: null,
    productId,
    displayName,
    spec,
    widthMm: positiveInteger(legacyGlass.widthMm),
    heightMm: positiveInteger(legacyGlass.heightMm),
    quantity: positiveInteger(legacyGlass.quantity) ?? 0,
    dimensionTraceRuleIds: [],
    recipeStatus: null,
    snapshotVersion: presentation.cubicationSnapshot?.v ?? 1,
    source: "legacy_snapshot",
    rawSnapshot: legacyGlass,
  })];
}

/** Rejects accidental cross-organization batches before extracting their items. */
export function extractNormalizedGlassPanesForOrganization(input: {
  organizationId: string | number;
  quoteId: string | number;
  items: readonly CotizacionWorkflowItem[];
  catalogGlassProducts?: ReadonlyMap<string, { name: string; catalogMetadata: Record<string, unknown> }>;
}): NormalizedGlassPane[] {
  return input.items.flatMap((item) => extractNormalizedGlassPanes({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
    item,
    catalogGlassProducts: input.catalogGlassProducts,
  }));
}
