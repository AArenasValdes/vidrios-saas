import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import type { FabricacionVidrioResultado } from "@/features/fabricacion/types/fabricacion-domain";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { GlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";

export const GLASS_PANE_NORMALIZATION_VERSION = 1 as const;
const MAX_NORMALIZED_PHYSICAL_UNITS = 2_000;

export type NormalizedGlassPane = {
  organizationId: string | number;
  quoteId: string | number;
  quoteItemId: string;
  logicalComponentId: string | null;
  glassId: string | null;
  paneId: string;
  paneUnitIds: string[];
  ordinal: number;
  productId: string | null;
  displayName: string | null;
  technicalSpec: GlassTechnicalSpec | null;
  widthMm: number | null;
  heightMm: number | null;
  quantity: number;
  dimensionProvenance: "validated_recipe" | "recipe_trace" | "legacy_snapshot" | "missing";
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
  dimensionTraceRuleIds: string[];
  recipeStatus: string | null;
  snapshotVersion: number;
  source: "validated_recipe" | "recipe_trace" | "legacy_snapshot" | "missing";
  rawSnapshot: unknown;
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
  if (input.spec?.manualCutStatus !== "confirmed") warnings.push("El corte manual no está confirmado para este producto.");
  if (input.spec?.category === "pendiente") warnings.push("La categoría técnica del vidrio está pendiente.");
  if (input.widthMm == null || input.heightMm == null) warnings.push("Faltan dimensiones válidas del paño.");
  if (input.quantity <= 0 || !Number.isSafeInteger(input.quantity)) warnings.push("La cantidad del snapshot no es válida.");
  if (input.quantity > MAX_NORMALIZED_PHYSICAL_UNITS) warnings.push("La cantidad excede el límite seguro de paños para una optimización.");
  if (input.source === "legacy_snapshot") warnings.push("El paño proviene de un snapshot legacy sin identidad técnica completa.");

  const paneId = input.logicalComponentId && input.glassId
    ? `${input.logicalComponentId}:${input.glassId}`
    : `review:${String(context.quoteId)}:${context.item.id}:${input.glassId ?? "unknown"}`;
  const paneUnitIds = Number.isSafeInteger(input.quantity) && input.quantity > 0 && input.quantity <= MAX_NORMALIZED_PHYSICAL_UNITS
    ? Array.from({ length: input.quantity }, (_, index) => `${paneId}:${index + 1}`)
    : [];
  const recipeValidated = input.recipeStatus === "validated";
  if (!recipeValidated) warnings.push("La receta no está validada por el taller.");
  const eligible = warnings.length === 0 && recipeValidated && input.source !== "legacy_snapshot";

  return {
    organizationId: context.organizationId,
    quoteId: context.quoteId,
    quoteItemId: context.item.id,
    logicalComponentId: input.logicalComponentId,
    glassId: input.glassId,
    paneId,
    paneUnitIds,
    ordinal: 1,
    productId: input.productId,
    displayName: input.displayName,
    technicalSpec: input.spec,
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
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

  if (snapshot?.result?.vidrios?.length) {
    return snapshot.result.vidrios.map((glass: FabricacionVidrioResultado) => {
      const dimensionTraceRuleIds = glass.trazabilidad.map((trace) => trace.reglaId);
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
    });
  }

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
}): NormalizedGlassPane[] {
  return input.items.flatMap((item) => extractNormalizedGlassPanes({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
    item,
  }));
}
