export const GLASS_TECHNICAL_CATEGORIES = [
  "monolitico",
  "laminado",
  "dvh",
  "templado",
  "espejo",
  "otro",
  "pendiente",
] as const;

export type GlassTechnicalCategory = (typeof GLASS_TECHNICAL_CATEGORIES)[number];
export type GlassManualCutStatus = "confirmed" | "not_admitted" | "pending_validation";
/** How the organization normally acquires this glass product. Missing means legacy/undecided. */
export type GlassPurchaseMode = "undecided" | "full_sheet" | "supplier_cut";
export type GlassTechnicalProvenance = "catalog" | "manual_override" | "legacy" | "unknown";
export type GlassPaneOrientation = "fixed" | "rotatable" | "grain_or_coating_directional" | "unknown";

/** Frozen technical values attached to a quote item, independent from price data. */
export type GlassTechnicalSpec = {
  version: 1;
  productId: string | null;
  thicknessMm: number | null;
  category: GlassTechnicalCategory;
  manualCutStatus: GlassManualCutStatus;
  /** Revisión explícita requerida para categorías con restricciones especiales. */
  technicalReviewConfirmed: boolean;
  sheetWidthMm: number | null;
  sheetHeightMm: number | null;
  pieceOrientation?: GlassPaneOrientation;
  purchaseMode?: GlassPurchaseMode;
  provenance: GlassTechnicalProvenance;
  sourceProductId: string | null;
  sourceValues: {
    thicknessMm: number | null;
    category: GlassTechnicalCategory;
    manualCutStatus: GlassManualCutStatus;
    technicalReviewConfirmed: boolean;
    sheetWidthMm: number | null;
    sheetHeightMm: number | null;
    pieceOrientation?: GlassPaneOrientation;
    purchaseMode?: GlassPurchaseMode;
  } | null;
  hasConflict: boolean;
};

export type GlassTechnicalCatalogMetadata = {
  espesor?: unknown;
  espesorMm?: unknown;
  categoriaTecnica?: unknown;
  corteManualEstado?: unknown;
  revisionTecnicaExplicita?: unknown;
  planchaAnchoMm?: unknown;
  planchaAltoMm?: unknown;
  orientacionCorte?: unknown;
  formaCompraVidrio?: unknown;
};

const categorySet = new Set<string>(GLASS_TECHNICAL_CATEGORIES);
const categoriesRequiringTechnicalReview = new Set<GlassTechnicalCategory>([
  "laminado",
  "dvh",
  "templado",
  "espejo",
  "otro",
]);

export function glassCategoryRequiresTechnicalReview(category: GlassTechnicalCategory): boolean {
  return categoriesRequiringTechnicalReview.has(category);
}

function resolveManualCutStatus(input: {
  category: GlassTechnicalCategory;
  requested: unknown;
  technicalReviewConfirmed: boolean;
}): GlassManualCutStatus {
  if (input.requested !== "confirmed" && input.requested !== "not_admitted") {
    return "pending_validation";
  }
  if (input.category === "pendiente") return "pending_validation";
  if (glassCategoryRequiresTechnicalReview(input.category) && !input.technicalReviewConfirmed) {
    return "pending_validation";
  }
  return input.requested;
}

function positiveInteger(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numberValue) && numberValue > 0 ? numberValue : null;
}

function positiveThickness(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function paneOrientation(value: unknown): GlassPaneOrientation {
  return value === "fixed" || value === "rotatable" || value === "grain_or_coating_directional"
    ? value
    : "unknown";
}

function glassPurchaseMode(value: unknown): GlassPurchaseMode | undefined {
  return value === "undecided" || value === "full_sheet" || value === "supplier_cut" ? value : undefined;
}

export function parseExplicitGlassThicknessMm(value: unknown): number | null {
  if (typeof value === "number") return positiveThickness(value);
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:mm)?$/i);
  return match ? positiveThickness(match[1]?.replace(",", ".")) : null;
}

function thicknessFromCatalog(value: unknown, fallback?: unknown): number | null {
  const explicit = positiveThickness(fallback);
  if (explicit != null) return explicit;
  return parseExplicitGlassThicknessMm(value);
}

export function normalizeGlassTechnicalSpec(value: unknown): GlassTechnicalSpec | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  const category = typeof candidate.category === "string" && categorySet.has(candidate.category)
    ? candidate.category as GlassTechnicalCategory
    : "pendiente";
  const technicalReviewConfirmed = candidate.technicalReviewConfirmed === true;
  const manualCutStatus = resolveManualCutStatus({
    category,
    requested: candidate.manualCutStatus,
    technicalReviewConfirmed,
  });
  const provenance = candidate.provenance === "catalog" || candidate.provenance === "manual_override" || candidate.provenance === "legacy"
    ? candidate.provenance
    : "unknown";
  const rawSource = candidate.sourceValues;
  const sourceValues = rawSource && typeof rawSource === "object" && !Array.isArray(rawSource)
    ? rawSource as Record<string, unknown>
    : null;
  return {
    version: 1,
    productId: typeof candidate.productId === "string" ? candidate.productId : null,
    thicknessMm: positiveThickness(candidate.thicknessMm),
    category,
    manualCutStatus,
    technicalReviewConfirmed,
    sheetWidthMm: positiveInteger(candidate.sheetWidthMm),
    sheetHeightMm: positiveInteger(candidate.sheetHeightMm),
    pieceOrientation: paneOrientation(candidate.pieceOrientation),
    ...(glassPurchaseMode(candidate.purchaseMode) ? { purchaseMode: glassPurchaseMode(candidate.purchaseMode) } : {}),
    provenance,
    sourceProductId: typeof candidate.sourceProductId === "string" ? candidate.sourceProductId : null,
    sourceValues: sourceValues ? {
      thicknessMm: positiveThickness(sourceValues.thicknessMm),
      category: typeof sourceValues.category === "string" && categorySet.has(sourceValues.category)
        ? sourceValues.category as GlassTechnicalCategory : "pendiente",
      manualCutStatus: sourceValues.manualCutStatus === "confirmed" || sourceValues.manualCutStatus === "not_admitted"
        ? sourceValues.manualCutStatus : "pending_validation",
      technicalReviewConfirmed: sourceValues.technicalReviewConfirmed === true,
      sheetWidthMm: positiveInteger(sourceValues.sheetWidthMm),
      sheetHeightMm: positiveInteger(sourceValues.sheetHeightMm),
      pieceOrientation: paneOrientation(sourceValues.pieceOrientation),
      ...(sourceValues.purchaseMode === "undecided" || sourceValues.purchaseMode === "full_sheet" || sourceValues.purchaseMode === "supplier_cut"
        ? { purchaseMode: sourceValues.purchaseMode }
        : {}),
    } : null,
    hasConflict: candidate.hasConflict === true,
  };
}

export function buildCatalogGlassTechnicalSpec(input: {
  productId: string;
  metadata: GlassTechnicalCatalogMetadata | null | undefined;
}): GlassTechnicalSpec {
  const metadata = input.metadata ?? {};
  const category = typeof metadata.categoriaTecnica === "string" && categorySet.has(metadata.categoriaTecnica)
    ? metadata.categoriaTecnica as GlassTechnicalCategory : "pendiente";
  const technicalReviewConfirmed = metadata.revisionTecnicaExplicita === true;
  return {
    version: 1,
    productId: input.productId,
    thicknessMm: thicknessFromCatalog(metadata.espesor, metadata.espesorMm),
    category,
    manualCutStatus: resolveManualCutStatus({
      category,
      requested: metadata.corteManualEstado,
      technicalReviewConfirmed,
    }),
    technicalReviewConfirmed,
    sheetWidthMm: positiveInteger(metadata.planchaAnchoMm),
    sheetHeightMm: positiveInteger(metadata.planchaAltoMm),
    pieceOrientation: paneOrientation(metadata.orientacionCorte),
    ...(glassPurchaseMode(metadata.formaCompraVidrio) ? { purchaseMode: glassPurchaseMode(metadata.formaCompraVidrio) } : {}),
    provenance: "catalog",
    sourceProductId: input.productId,
    sourceValues: null,
    hasConflict: false,
  };
}

/** Explicit overrides keep the selected catalog values as provenance for conflict review. */
export function applyGlassTechnicalOverride(input: {
  catalogSpec: GlassTechnicalSpec;
  override: Partial<Pick<GlassTechnicalSpec, "thicknessMm" | "category" | "manualCutStatus" | "technicalReviewConfirmed" | "sheetWidthMm" | "sheetHeightMm" | "pieceOrientation">>;
}): GlassTechnicalSpec {
  const source = input.catalogSpec;
  const next = { ...source, ...input.override };
  const hasConflict = (Object.keys(input.override) as Array<keyof typeof input.override>).some((key) =>
    input.override[key] !== undefined && input.override[key] !== source[key]
  );
  return {
    ...next,
    manualCutStatus: resolveManualCutStatus({
      category: next.category,
      requested: next.manualCutStatus,
      technicalReviewConfirmed: next.technicalReviewConfirmed,
    }),
    provenance: "manual_override",
    sourceProductId: source.productId,
    sourceValues: {
      thicknessMm: source.thicknessMm,
      category: source.category,
      manualCutStatus: source.manualCutStatus,
      technicalReviewConfirmed: source.technicalReviewConfirmed,
      sheetWidthMm: source.sheetWidthMm,
      sheetHeightMm: source.sheetHeightMm,
      pieceOrientation: source.pieceOrientation ?? "unknown",
      ...(source.purchaseMode ? { purchaseMode: source.purchaseMode } : {}),
    },
    hasConflict,
  };
}

export function resolveGlassTechnicalSpecForProduct(input: {
  productId: string;
  catalogMetadata: GlassTechnicalCatalogMetadata | null | undefined;
  existing: GlassTechnicalSpec | null | undefined;
}): GlassTechnicalSpec {
  if (input.existing?.productId === input.productId) return input.existing;
  return buildCatalogGlassTechnicalSpec({ productId: input.productId, metadata: input.catalogMetadata });
}
