import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  buildCatalogGlassTechnicalSpec,
  type GlassTechnicalSpec,
} from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import {
  MANUAL_GLASS_PANE_MEASUREMENTS_VERSION,
  type ManualGlassPaneMeasurement,
  type ManualGlassPaneMeasurementsSnapshot,
} from "@/features/cotizaciones/types/manual-glass-pane-measurements";

export function normalizeManualGlassPaneMeasurements(value: unknown): ManualGlassPaneMeasurementsSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { version: MANUAL_GLASS_PANE_MEASUREMENTS_VERSION, entries: [] };
  }
  const candidate = value as Record<string, unknown>;
  if ((candidate.version !== 1 && candidate.version !== MANUAL_GLASS_PANE_MEASUREMENTS_VERSION) || !Array.isArray(candidate.entries)) {
    return { version: MANUAL_GLASS_PANE_MEASUREMENTS_VERSION, entries: [] };
  }
  const entries = candidate.entries.flatMap((entry): ManualGlassPaneMeasurement[] => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const row = entry as Record<string, unknown>;
    if (
      (row.version !== 1 && row.version !== MANUAL_GLASS_PANE_MEASUREMENTS_VERSION) ||
      row.source !== "manual" ||
      typeof row.id !== "string" || !row.id.trim() ||
      typeof row.productId !== "string" || !row.productId.trim() ||
      typeof row.technicalFingerprint !== "string" || !row.technicalFingerprint.trim() ||
      !Number.isSafeInteger(row.widthMm) || Number(row.widthMm) <= 0 ||
      !Number.isSafeInteger(row.heightMm) || Number(row.heightMm) <= 0 ||
      !Number.isSafeInteger(row.quantity) || Number(row.quantity) <= 0 ||
      typeof row.recordedAt !== "string" || !Number.isFinite(Date.parse(row.recordedAt))
    ) return [];
    return [{
      id: row.id.trim(),
      source: "manual",
      version: MANUAL_GLASS_PANE_MEASUREMENTS_VERSION,
      productId: row.productId.trim(),
      technicalFingerprint: row.technicalFingerprint.trim(),
      widthMm: Number(row.widthMm),
      heightMm: Number(row.heightMm),
      quantity: Number(row.quantity),
      ...(row.quantityBasis === "total" || row.quantityBasis === "per_component" ? { quantityBasis: row.quantityBasis } : {}),
      ...(typeof row.paneSlotId === "string" && row.paneSlotId ? { paneSlotId: row.paneSlotId } : {}),
      ...(typeof row.sourcePosition === "string" && row.sourcePosition ? { sourcePosition: row.sourcePosition } : {}),
      ...(typeof row.rectangularVerified === "boolean" ? { rectangularVerified: row.rectangularVerified } : {}),
      recordedAt: row.recordedAt,
    }];
  });
  return {
    version: candidate.version,
    entries,
    ...(typeof candidate.configurationFingerprint === "string" || candidate.configurationFingerprint === null
      ? { configurationFingerprint: candidate.configurationFingerprint as string | null } : {}),
    ...(typeof candidate.expectedPaneCount === "number" && Number.isSafeInteger(candidate.expectedPaneCount) && candidate.expectedPaneCount > 0
      ? { expectedPaneCount: candidate.expectedPaneCount } : {}),
    ...(candidate.allPanesConfirmed === true ? { allPanesConfirmed: true } : {}),
  };
}

/** JSONB NULL means legacy data may be consulted; a present empty snapshot is an explicit deletion. */
export function resolveManualGlassPaneMeasurements(
  primary: unknown,
  legacy: unknown,
): ManualGlassPaneMeasurementsSnapshot | null {
  if (primary !== null && primary !== undefined) return normalizeManualGlassPaneMeasurements(primary);
  const fallback = normalizeManualGlassPaneMeasurements(legacy);
  return fallback.entries.length > 0 ? fallback : null;
}

export function getCatalogGlassTechnicalFingerprint(spec: GlassTechnicalSpec): string {
  return JSON.stringify({
    productId: spec.productId,
    thicknessMm: spec.thicknessMm,
    category: spec.category,
    manualCutStatus: spec.manualCutStatus,
    technicalReviewConfirmed: spec.technicalReviewConfirmed,
    sheetWidthMm: spec.sheetWidthMm,
    sheetHeightMm: spec.sheetHeightMm,
    pieceOrientation: spec.pieceOrientation ?? "unknown",
    hasConflict: spec.hasConflict,
  });
}

export function getCatalogGlassTechnicalSpec(template: CotizacionLineTemplate): GlassTechnicalSpec {
  return buildCatalogGlassTechnicalSpec({
    productId: String(template.id),
    metadata: template.catalogMetadata,
  });
}

export function isCatalogGlassPlanable(spec: GlassTechnicalSpec): boolean {
  return Boolean(
    spec.productId &&
    spec.category !== "pendiente" &&
    Number.isFinite(spec.thicknessMm) && Number(spec.thicknessMm) > 0 &&
    Number.isSafeInteger(spec.sheetWidthMm) && Number(spec.sheetWidthMm) > 0 &&
    Number.isSafeInteger(spec.sheetHeightMm) && Number(spec.sheetHeightMm) > 0 &&
    spec.manualCutStatus === "confirmed" &&
    !spec.hasConflict
  );
}

export function validateManualGlassPaneMeasurementInput(input: {
  product: CotizacionLineTemplate | null;
  widthMm: number;
  heightMm: number;
  quantity: number;
}): string | null {
  if (!input.product || input.product.categoria !== "vidrio" || !input.product.isActive || input.product.eliminadoEn) {
    return "Selecciona un vidrio activo del catálogo.";
  }
  if (!Number.isSafeInteger(input.widthMm) || input.widthMm <= 0) return "Ingresa un ancho final mayor que cero, en milímetros.";
  if (!Number.isSafeInteger(input.heightMm) || input.heightMm <= 0) return "Ingresa un alto final mayor que cero, en milímetros.";
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) return "Ingresa una cantidad física mayor que cero.";
  if (!isCatalogGlassPlanable(getCatalogGlassTechnicalSpec(input.product))) {
    return "La ficha de este vidrio necesita espesor, categoría, formato de plancha y corte manual confirmados.";
  }
  return null;
}

export function createManualGlassPaneMeasurement(input: {
  product: CotizacionLineTemplate;
  widthMm: number;
  heightMm: number;
  quantity: number;
  quantityBasis?: "total" | "per_component";
  existingId?: string;
  paneSlotId?: string;
  sourcePosition?: string;
  rectangularVerified?: boolean;
  now?: string;
}): ManualGlassPaneMeasurement {
  const spec = getCatalogGlassTechnicalSpec(input.product);
  const randomBytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(randomBytes);
  const generatedId = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `manual-glass-${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const id = input.existingId ?? generatedId;
  return {
    id,
    source: "manual",
    version: MANUAL_GLASS_PANE_MEASUREMENTS_VERSION,
    productId: String(input.product.id),
    technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec),
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    quantity: input.quantity,
    quantityBasis: input.quantityBasis ?? "per_component",
    ...(input.paneSlotId ? { paneSlotId: input.paneSlotId } : {}),
    ...(input.sourcePosition ? { sourcePosition: input.sourcePosition } : {}),
    rectangularVerified: input.rectangularVerified !== false,
    recordedAt: input.now ?? new Date().toISOString(),
  };
}
