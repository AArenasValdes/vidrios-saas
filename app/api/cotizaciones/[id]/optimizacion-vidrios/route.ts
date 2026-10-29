import { NextResponse } from "next/server";
import { z } from "zod";

import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { extractNormalizedGlassPanesForOrganization, type NormalizedGlassPane } from "@/features/fabricacion/services/glass-pane-normalization.service";
import { buildGlassDistributionCoverage, getGlassPaneGeometryExclusionReason, isGlassCoveragePaneComplete, isGlassPaneGeometryComplete, type GlassDistributionCoverage, type GlassPaneGeometryExclusion } from "@/features/fabricacion/services/glass-distribution-coverage.service";
import { optimizeGlassCuttingBatch } from "@/features/fabricacion/services/glass-sheet-optimizer.service";
import type { GlassCuttingProfile, GlassPanePlanningUnit } from "@/features/fabricacion/types/glass-sheet-optimizer-contracts";
import type { GlassManualCutProcessConstraints, GlassSheetPhysicalFormat } from "@/features/fabricacion/types/glass-cutting-contracts";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { readQuoteForTechnicalCost } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { createClient } from "@/lib/supabase/server";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const inputSchema = z.object({
  pieceOrientation: z.enum(["fixed", "rotatable", "grain_or_coating_directional"]),
  confirmManualOperations: z.literal(true),
  sheetOrientation: z.enum(["fixed", "rotatable", "grain_or_coating_directional"]),
  sheetSource: z.enum(["catalog", "supplier_document", "workshop_measurement"]),
  sheetSourceReference: z.string().trim().min(1).max(180),
  tableWidthMm: z.number().int().positive().max(20_000),
  tableHeightMm: z.number().int().positive().max(20_000),
  edgeTrimMm: z.object({ top: z.number().int().nonnegative().max(500), right: z.number().int().nonnegative().max(500), bottom: z.number().int().nonnegative().max(500), left: z.number().int().nonnegative().max(500) }),
  separationMm: z.number().int().nonnegative().max(50),
  minimumStripWidthMm: z.number().int().nonnegative().max(2_000),
  remnantMinimumWidthMm: z.number().int().positive().max(20_000),
  remnantMinimumHeightMm: z.number().int().positive().max(20_000),
  remnantOrientation: z.enum(["fixed", "rotatable"]),
  processSourceReference: z.string().trim().min(1).max(180),
}).strict();
const geometricPreviewSchema = z.object({
  mode: z.enum(["geometric_preview", "provider_pdf"]),
  sheetWidthMm: z.number().int().positive().max(20_000).optional(),
  sheetHeightMm: z.number().int().positive().max(20_000).optional(),
}).strict().refine((value) => (value.sheetWidthMm == null) === (value.sheetHeightMm == null), {
  message: "Indica ancho y alto del formato juntos.",
});
const saveWorkshopProfileSchema = inputSchema.extend({
  mode: z.literal("save_workshop_profile"),
  productId: z.string().trim().min(1).max(80),
});

function parseQuoteId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function loadPanes(quoteId: number, organizationId: number) {
  const quote = await readQuoteForTechnicalCost({ quoteId, organizationId });
  if (!quote) return null;
  const items: CotizacionWorkflowItem[] = quote.items.map((item) => ({
    id: item.id,
    codigo: item.code,
    tipo: "componente",
    lineaComercial: "",
    vidrio: item.glassDescription ?? "",
    nombre: item.name,
    descripcion: item.description,
    ancho: null,
    alto: null,
    cantidad: item.quantity,
    unidad: "unidad",
    areaM2: null,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 0,
    precioTotal: 0,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: item.observaciones ?? "",
    manualGlassMeasurements: item.manualGlassMeasurements == null
      ? decodeCotizacionItemPresentationMeta(item.observaciones).manualGlassMeasurements
      : item.manualGlassMeasurements as CotizacionWorkflowItem["manualGlassMeasurements"],
    fabricacionSnapshot: item.fabricacionSnapshot as CotizacionWorkflowItem["fabricacionSnapshot"],
  }));
  const manualProductIds = [...new Set(items.flatMap((item) =>
    (item.manualGlassMeasurements ?? decodeCotizacionItemPresentationMeta(item.observaciones).manualGlassMeasurements).entries.map((entry) => entry.productId)
  ))];
  const catalogGlassProducts = new Map<string, { name: string; catalogMetadata: Record<string, unknown> }>();
  if (manualProductIds.length > 0) {
    const supabase = await createClient();
    const numericIds = manualProductIds.flatMap((value) => {
      const id = Number(value);
      return Number.isSafeInteger(id) && id > 0 ? [id] : [];
    });
    if (numericIds.length > 0) {
      const { data, error } = await supabase.from("cotizacion_line_templates")
        .select("id, nombre, catalog_metadata")
        .eq("organization_id", organizationId)
        .eq("categoria", "vidrio")
        .eq("is_active", true)
        .in("id", numericIds)
        .is("eliminado_en", null);
      if (error) throw error;
      for (const row of data ?? []) {
        catalogGlassProducts.set(String(row.id), {
          name: row.nombre,
          catalogMetadata: row.catalog_metadata && typeof row.catalog_metadata === "object" && !Array.isArray(row.catalog_metadata)
            ? row.catalog_metadata as Record<string, unknown>
            : {},
        });
      }
    }
  }
  const panes = extractNormalizedGlassPanesForOrganization({ organizationId, quoteId, items, catalogGlassProducts }).map((pane) => ({
    ...pane,
    componentName: items.find((item) => item.id === pane.quoteItemId)?.nombre ?? null,
    quoteCode: quote.code,
    componentCode: items.find((item) => item.id === pane.quoteItemId)?.codigo ?? pane.quoteItemId,
    finishOrientationKey: `${pane.productId ?? "sin-producto"}:${pane.technicalSpec?.category ?? "pendiente"}:${pane.technicalSpec?.thicknessMm ?? "sin-espesor"}:${pane.technicalSpec?.pieceOrientation ?? "unknown"}`,
    orientation: pane.technicalSpec?.pieceOrientation ?? "unknown",
  }));
  const coverage = buildGlassDistributionCoverage({ items, panes });
  const diagnostics: string[] = [];
  if (panes.length === 0 && coverage.pendingReferenceCount === 0) {
    const snapshots = items.filter((item) => item.fabricacionSnapshot);
    if (snapshots.length === 0) {
      diagnostics.push(
        "No hay cubicación técnica congelada en los componentes. Selecciona una línea con receta compatible y validada, revisa su cubicación y guarda explícitamente el despiece antes de optimizar. Las dimensiones comerciales no se convierten en medidas de paño."
      );
    } else {
      diagnostics.push(
        "Los snapshots guardados no contienen resultados de paños de vidrio. Revisa la receta y guarda de nuevo la cubicación desde el resumen de fabricación."
      );
    }
  }
  return { quote, panes, diagnostics: [...new Set([...diagnostics, ...coverage.diagnostics])], coverage };
}

async function readWorkshopProfiles(organizationId: number, productIds: Array<string | null>) {
  const ids = [...new Set(productIds.flatMap((value) => {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? [id] : [];
  }))];
  if (!ids.length) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.from("cotizacion_line_templates")
    .select("id, catalog_metadata")
    .eq("organization_id", organizationId)
    .eq("categoria", "vidrio")
    .in("id", ids)
    .is("eliminado_en", null);
  if (error) throw error;
  return Object.fromEntries((data ?? []).flatMap((row) => {
    const metadata = row.catalog_metadata && typeof row.catalog_metadata === "object" && !Array.isArray(row.catalog_metadata)
      ? row.catalog_metadata as Record<string, unknown> : {};
    const profile = metadata.glassCuttingWorkshopProfile;
    return profile && typeof profile === "object" && !Array.isArray(profile)
      ? [[String(row.id), profile as Record<string, unknown>]] : [];
  }));
}

type QuoteGlassPane = NormalizedGlassPane & {
  componentCode: string;
  componentName: string | null;
  finishOrientationKey: string;
  orientation: NonNullable<NormalizedGlassPane["technicalSpec"]>["pieceOrientation"];
};

function buildPreviewExclusions(panes: readonly QuoteGlassPane[], coverage: GlassDistributionCoverage): GlassPaneGeometryExclusion[] {
  const paneExclusions = panes.flatMap((pane) => {
    const reason = getGlassPaneGeometryExclusionReason(pane);
    if (!reason) return [];
    return [{
      quoteItemId: pane.quoteItemId,
      paneId: pane.paneId,
      componentCode: pane.componentCode,
      componentName: pane.componentName ?? "Componente de la cotización",
      displayName: pane.displayName,
      reason,
    }];
  });
  const eligiblePaneIds = new Set(panes.filter(isGlassPaneGeometryComplete).map((pane) => pane.paneId));
  const knownExclusionIds = new Set(paneExclusions.map((entry) => entry.paneId));
  const referenceExclusions = coverage.pendingReferences.flatMap((reference, index) => {
    if (reference.paneId && (eligiblePaneIds.has(reference.paneId) || knownExclusionIds.has(reference.paneId))) return [];
    const paneId = reference.paneId ?? `${reference.quoteItemId}:coverage-pending:${index + 1}`;
    if (knownExclusionIds.has(paneId)) return [];
    knownExclusionIds.add(paneId);
    return [{
      quoteItemId: reference.quoteItemId,
      paneId,
      componentCode: reference.componentCode,
      componentName: reference.componentName,
      displayName: reference.displayName,
      reason: reference.reason,
    }];
  });
  return [...paneExclusions, ...referenceExclusions];
}

async function auth() {
  const context = await resolveAuthenticatedRouteContext();
  return Number(context.profile.organizationId);
}

export async function GET(_request: Request, route: RouteContext) {
  const quoteId = parseQuoteId((await route.params).id);
  if (!quoteId) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  try {
    const organizationId = await auth();
    const loaded = await loadPanes(quoteId, organizationId);
    if (!loaded) return NextResponse.json({ error: "No encontramos esta cotización." }, { status: 404 });
    const workshopProfiles = await readWorkshopProfiles(organizationId, loaded.panes.map((pane) => pane.productId));
    const previewExclusions = buildPreviewExclusions(loaded.panes, loaded.coverage);
    const geometricPanes = loaded.panes.filter(isGlassPaneGeometryComplete);
    return NextResponse.json({ quoteCode: loaded.quote.code, panes: loaded.panes.map((pane) => ({
      ...pane,
      physicalUnitCount: isGlassPaneGeometryComplete(pane) ? pane.paneUnitIds.length : null,
    })), preliminaryPaneCount: geometricPanes.length, previewExclusions, diagnostics: loaded.diagnostics, coverage: loaded.coverage, workshopProfiles });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] optimización de vidrios read", error);
    return NextResponse.json({ error: "No pudimos cargar los paños técnicos guardados." }, { status: 500 });
  }
}

export async function POST(request: Request, route: RouteContext) {
  const quoteId = parseQuoteId((await route.params).id);
  if (!quoteId) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  const payload = await request.json().catch(() => null);
  const geometricRequest = geometricPreviewSchema.safeParse(payload);
  const saveProfile = saveWorkshopProfileSchema.safeParse(payload);
  const parsed = geometricRequest.success || saveProfile.success ? null : inputSchema.safeParse(payload);
  if (!geometricRequest.success && !saveProfile.success && !parsed?.success) return NextResponse.json({ error: "Completa las reglas físicas requeridas para esta modalidad.", details: parsed && !parsed.success ? parsed.error.flatten() : undefined }, { status: 400 });
  const mode = geometricRequest.success ? geometricRequest.data.mode : "workshop";
  const isGeometricRequest = geometricRequest.success;
  const workshopInput = saveProfile.success
    ? Object.fromEntries(Object.entries(saveProfile.data).filter(([key]) => key !== "mode" && key !== "productId")) as z.infer<typeof inputSchema>
    : parsed?.success ? parsed.data : null;
  try {
    const organizationId = await auth();
    const loaded = await loadPanes(quoteId, organizationId);
    if (!loaded) return NextResponse.json({ error: "No encontramos esta cotización." }, { status: 404 });
    if (saveProfile.success) {
      const productId = Number(saveProfile.data.productId);
      if (!Number.isSafeInteger(productId) || productId <= 0 || !loaded.panes.some((pane) => pane.productId === String(productId))) {
        return NextResponse.json({ error: "El vidrio no pertenece a esta cotización." }, { status: 400 });
      }
      const supabase = await createClient();
      const { data: row, error: readError } = await supabase.from("cotizacion_line_templates")
        .select("id, actualizado_en, catalog_metadata")
        .eq("id", productId).eq("organization_id", organizationId).eq("categoria", "vidrio")
        .is("eliminado_en", null).maybeSingle();
      if (readError) throw readError;
      if (!row) return NextResponse.json({ error: "No encontramos esa ficha de vidrio activa en esta organización." }, { status: 404 });
      const metadata = row.catalog_metadata && typeof row.catalog_metadata === "object" && !Array.isArray(row.catalog_metadata)
        ? row.catalog_metadata as Record<string, unknown> : {};
      const profile = { version: 1, productId: String(productId), ...workshopInput };
      const { data: updatedRow, error: updateError } = await supabase.from("cotizacion_line_templates")
        .update({ catalog_metadata: { ...metadata, glassCuttingWorkshopProfile: profile }, actualizado_en: new Date().toISOString() })
        .eq("id", productId).eq("organization_id", organizationId).eq("categoria", "vidrio")
        .is("eliminado_en", null).eq("actualizado_en", row.actualizado_en).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (!updatedRow) return NextResponse.json({ error: "La ficha de vidrio cambió mientras guardábamos. Recárgala e inténtalo de nuevo para conservar todos sus metadatos." }, { status: 409 });
      return NextResponse.json({ saved: true, productId: String(productId), profile });
    }
    if (loaded.panes.length === 0) {
      return NextResponse.json({ error: loaded.diagnostics[0] ?? "No hay paños técnicos completos para optimizar.", diagnostics: loaded.diagnostics, coverage: loaded.coverage }, { status: 409 });
    }
    if (mode === "provider_pdf" && loaded.coverage.status !== "complete") {
      return NextResponse.json({ error: "No se puede generar un PDF para el proveedor: la cobertura de vidrio está incompleta.", diagnostics: loaded.coverage.diagnostics, coverage: loaded.coverage }, { status: 422 });
    }
    if (!isGeometricRequest && loaded.coverage.status !== "complete") {
      return NextResponse.json({ error: "La pauta operativa requiere cobertura técnica completa de vidrio.", diagnostics: loaded.coverage.diagnostics, coverage: loaded.coverage }, { status: 422 });
    }
    const completePanes = loaded.panes.filter(isGeometricRequest ? isGlassPaneGeometryComplete : isGlassCoveragePaneComplete);
    const previewExclusions = isGeometricRequest ? buildPreviewExclusions(loaded.panes, loaded.coverage) : [];
    if (isGeometricRequest && completePanes.length === 0) {
      return NextResponse.json({ error: previewExclusions[0]?.reason ?? "No hay geometría de paños admisible para mostrar una vista previa.", diagnostics: previewExclusions.map((entry) => `${entry.componentCode} · ${entry.componentName}: ${entry.reason}`), previewExclusions, coverage: loaded.coverage }, { status: 422 });
    }
    if (!isGeometricRequest) {
      const pendingPanes = loaded.panes.filter((pane) => pane.validationStatus !== "eligible_for_manual_planning");
      if (pendingPanes.length > 0) {
        const diagnostics = [...new Set(pendingPanes.flatMap((pane) => pane.warnings))];
        return NextResponse.json({ error: "La pauta operativa requiere paños técnicos completos y una receta validada.", diagnostics }, { status: 422 });
      }
    }
    const panesForCalculation = isGeometricRequest ? completePanes : loaded.panes;
    const panes: GlassPanePlanningUnit[] = panesForCalculation.map((pane) => ({
      ...pane,
      orientation: pane.technicalSpec?.pieceOrientation && pane.technicalSpec.pieceOrientation !== "unknown"
        ? pane.technicalSpec.pieceOrientation
        : isGeometricRequest ? "fixed" : workshopInput!.pieceOrientation,
    }));
    const profilesByKey = new Map<string, GlassCuttingProfile>();
    for (const pane of panes) {
      const spec = pane.technicalSpec;
      const snapshotFormatComplete = Number.isSafeInteger(spec?.sheetWidthMm) && Number(spec?.sheetWidthMm) > 0
        && Number.isSafeInteger(spec?.sheetHeightMm) && Number(spec?.sheetHeightMm) > 0;
      const sheetWidthMm = isGeometricRequest ? snapshotFormatComplete ? spec!.sheetWidthMm : geometricRequest.data.sheetWidthMm : spec?.sheetWidthMm;
      const sheetHeightMm = isGeometricRequest ? snapshotFormatComplete ? spec!.sheetHeightMm : geometricRequest.data.sheetHeightMm : spec?.sheetHeightMm;
      const key = [pane.productId, spec?.thicknessMm, spec?.category, pane.finishOrientationKey, sheetWidthMm, sheetHeightMm].join("|");
      if (profilesByKey.has(key) || !spec || !pane.productId || !spec.thicknessMm || !sheetWidthMm || !sheetHeightMm) continue;
      const sheet: GlassSheetPhysicalFormat = {
        widthMm: sheetWidthMm,
        heightMm: sheetHeightMm,
        orientation: isGeometricRequest ? "unknown" : workshopInput!.sheetOrientation,
        source: isGeometricRequest ? (snapshotFormatComplete ? "catalog" : "unknown") : workshopInput!.sheetSource,
        sourceReference: isGeometricRequest ? null : workshopInput!.sheetSourceReference,
      };
      const process: GlassManualCutProcessConstraints = {
        tableWidthMm: isGeometricRequest ? sheetWidthMm : workshopInput!.tableWidthMm,
        tableHeightMm: isGeometricRequest ? sheetHeightMm : workshopInput!.tableHeightMm,
        supportedCategories: [spec.category],
        supportedThicknessesMm: [spec.thicknessMm],
        edgeTrimMm: isGeometricRequest ? { top: 0, right: 0, bottom: 0, left: 0 } : workshopInput!.edgeTrimMm,
        kerfOrSeparationMm: isGeometricRequest ? 0 : workshopInput!.separationMm,
        minimumStripWidthMm: isGeometricRequest ? 0 : workshopInput!.minimumStripWidthMm,
        reusableRemnant: isGeometricRequest
          ? { minimumWidthMm: 1, minimumHeightMm: 1, orientation: "unknown" }
          : { minimumWidthMm: workshopInput!.remnantMinimumWidthMm, minimumHeightMm: workshopInput!.remnantMinimumHeightMm, orientation: workshopInput!.remnantOrientation },
        supportedOperations: isGeometricRequest ? [] : workshopInput!.confirmManualOperations ? ["straight_cut", "quiebre"] : [],
        sequence: [],
        workshopValidation: "unvalidated",
        sourceReference: isGeometricRequest ? null : workshopInput!.processSourceReference,
      };
      profilesByKey.set(key, {
        profileId: `quote-${quoteId}-${profilesByKey.size + 1}`,
        productId: pane.productId,
        thicknessMm: spec.thicknessMm,
        category: spec.category,
        finishOrientationKey: pane.finishOrientationKey,
        sheet,
        process,
        purchaseCost: null,
      });
    }
    const results = optimizeGlassCuttingBatch({ panes, profiles: [...profilesByKey.values()], mode: isGeometricRequest ? "geometric_preview" : "workshop" });
    const warnings = isGeometricRequest ? [
      "Vista geométrica preliminar: separación asumida de 0 mm; no representa una regla física.",
      "El formato se usa en la orientación indicada; no se evalúa girar la plancha.",
      ...(panesForCalculation.some((pane) => pane.dimensionProvenance === "recipe_trace")
        ? ["Incluye geometría preliminar de recipe_trace. No está validada por el taller ni es apta para corte operativo."] : []),
      ...(previewExclusions.length > 0 ? [`Se excluyeron ${previewExclusions.length} referencia(s) por falta de geometría o identidad técnica admisible.`] : []),
      ...(panesForCalculation.some((pane) => !pane.technicalSpec?.pieceOrientation || pane.technicalSpec.pieceOrientation === "unknown")
        ? ["La orientación no confirmada se trata como fija: los paños no se giran."] : []),
      "No es una pauta operativa ni está aprobada para fabricación.",
    ] : [];
    return NextResponse.json({ quoteId, quoteCode: loaded.quote.code, mode, coverage: loaded.coverage, warnings, previewExclusions, preliminaryPaneCount: panesForCalculation.length, results, generatedFrom: loaded.panes.map((pane) => pane.snapshotFingerprint) });
  } catch (error) {
    if (error instanceof AuthRouteAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[API] optimización de vidrios calculate", error);
    return NextResponse.json({ error: "No pudimos calcular una distribución verificable." }, { status: 500 });
  }
}
