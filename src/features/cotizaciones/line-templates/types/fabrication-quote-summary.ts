/**
 * Resumen interno de fabricacion para print tecnico (no PDF cliente).
 */

import {
  herrajeDisplayLabel,
  RECIPE_STATUS_LABELS,
  type FabricationRecipe,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { resolveCutProfileCode } from "@/features/cotizaciones/line-templates/services/cut-profile-display.service";
import { fabricacionSnapshotToLegacyCubicationSnapshot } from "@/features/fabricacion/services/fabricacion-snapshot-adapter.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";
import type { FabricacionTrabajoSnapshot } from "@/features/fabricacion/types/fabricacion-trabajo-snapshot";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { hasQuickCompositionStructuralChanges } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import { isVeratec7400FourMobileComposition } from "@/features/fabricacion/services/veratec-quote-composition.service";
import { resolveFrozenGlassThickness } from "@/features/fabricacion/services/glass-thickness-resolution.service";
import { hasPivotanteSlidingRecipeConflict } from "@/features/fabricacion/services/fabricacion-contexto-pieza.service";
import { evaluarPautaFisicaTrabajo } from "@/features/fabricacion/services/fabricacion-pauta-fisica.service";

export type FabricationProfileCoverageItem = {
  itemId: string;
  codigo: string;
  nombre: string;
  state: "ready" | "missing_snapshot" | "unvalidated" | "incompatible" | "preliminary" | "not_required";
  reason: string | null;
};

export type FabricationSummaryItem = {
  itemId: string;
  codigo: string;
  nombre: string;
  lineName: string;
  material: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  snapshot: CotizacionItemCubicationSnapshot;
  recipe: FabricationRecipe | null;
  herrajeLabel: string;
  statusLabel: string;
  /** Geometría visible para revisión; no equivale a una pauta técnica completa. */
  geometryOnly?: boolean;
  profilesMl: number;
  glassM2: number;
  glassThickness: string;
  glassThicknessWarning: string | null;
  accessoryUnits: number;
  barCount: number;
  fabricacionSnapshot: FabricacionCotizacionSnapshot | null;
  operationalStatus?: FabricationProfileCoverageItem["state"];
};

export type FabricationQuoteSummary = {
  items: FabricationSummaryItem[];
  compositionsPendingRecipe: Array<{
    itemId: string;
    codigo: string;
    nombre: string;
    lineName: string;
  }>;
  totalItems: number;
  totalProfilesMl: number;
  totalGlassM2: number;
  totalAccessoryUnits: number;
  /** Solo existe cuando se guardó la pauta conjunta; nunca sumar barras por pieza como sustituto. */
  totalBars: number | null;
  trabajoSnapshot: FabricacionTrabajoSnapshot | null;
  /** El snapshot conjunto incluye una pieza cuyo estado actual es solo geométrico preliminar. */
  trabajoSnapshotHasGeometryOnly?: boolean;
  profileCoverage?: {
    status: "complete" | "partial";
    jointPlanStatus: "ready" | "theoretical" | "pending" | "blocked" | "not_required";
    requiredCount: number;
    readyCount: number;
    pendingCount: number;
    items: FabricationProfileCoverageItem[];
  };
};

type QuoteItemLike = {
  id: string | number;
  codigo?: string | null;
  nombre?: string | null;
  lineaComercial?: string | null;
  observaciones?: string | null;
  fabricacionSnapshot?: FabricacionCotizacionSnapshot | null;
  tipo?: string | null;
  tipoItem?: string | null;
  ancho?: number | null;
  alto?: number | null;
  cantidad?: number | null;
  descripcion?: string | null;
};

function snapshotMissingProfileCodes(snapshot: CotizacionItemCubicationSnapshot) {
  return snapshot.cuts.some((cut) => !resolveCutProfileCode(cut));
}

function resolveDisplaySnapshot(
  item: QuoteItemLike,
  meta: ReturnType<typeof decodeCotizacionItemPresentationMeta>,
  options?: {
    recipes?: FabricationRecipeRecord[];
    organizationId?: number | null;
    trabajoSnapshot?: FabricacionTrabajoSnapshot | null;
    /** Evita recalcular snapshots formales en una cotización histórica. */
    allowLiveFormal?: boolean;
  },
  resolvedLive?: ReturnType<typeof resolveFabricacionDespieceForQuoteItem> | null
): CotizacionItemCubicationSnapshot | null {
  if (
    meta.guidedVisualConfig?.quickCompositionStructural ||
    hasQuickCompositionStructuralChanges(meta.quickCompositionAdjustment)
  ) {
    if (!isVeratec7400FourMobileComposition(meta)) return null;
  }
  const frozen = item.fabricacionSnapshot
    ? fabricacionSnapshotToLegacyCubicationSnapshot(item.fabricacionSnapshot)
    : meta.cubicationSnapshot;

  // Un corte ajustado explícitamente por el taller para esta cotización
  // prevalece sobre el snapshot formal del catálogo.
  if (meta.cubicationSnapshot?.source === "manual") {
    return meta.cubicationSnapshot;
  }

  if (!options?.recipes || options.organizationId == null) {
    return frozen ?? null;
  }

  const live = resolvedLive === undefined
    ? resolveFabricacionDespieceForQuoteItem({
        item: item as CotizacionWorkflowItem,
        recipes: options.recipes,
        organizationId: options.organizationId,
      })
    : resolvedLive;
  if (!live) return frozen ?? null;

  if (live.geometryOnly && live.cubication) {
    return frozen ?? live.cubication;
  }

  if (options.allowLiveFormal === false || live.estado !== "calculado" || !live.cubication) {
    return frozen ?? null;
  }

  if (!frozen || snapshotMissingProfileCodes(frozen)) {
    return live.cubication;
  }

  return frozen;
}

export function formatFabricationItemLineCaption(lineName: string, material: string) {
  const line = lineName.trim();
  const mat = material.trim();
  if (line && mat) return `${line} · ${mat}`;
  if (line) return line;
  if (mat) return mat;
  return "Sin línea";
}

function formatStatusLabel(status: RecipeStatus | string) {
  if (typeof status === "string" && status in RECIPE_STATUS_LABELS) {
    return RECIPE_STATUS_LABELS[status as RecipeStatus];
  }
  if (status === "validated") return "Validada";
  if (status === "review_required") return "Requiere revision";
  if (status === "testing") return "En prueba";
  if (status === "draft") return "Borrador";
  return String(status);
}

export function buildFabricationQuoteSummary(
  items: QuoteItemLike[],
  options?: {
    recipes?: FabricationRecipeRecord[];
    organizationId?: number | null;
    trabajoSnapshot?: FabricacionTrabajoSnapshot | null;
    allowLiveFormal?: boolean;
  }
): FabricationQuoteSummary {
  const rows: FabricationSummaryItem[] = [];
  const compositionsPendingRecipe: FabricationQuoteSummary["compositionsPendingRecipe"] = [];
  const profileCoverageItems: FabricationProfileCoverageItem[] = [];

  for (const item of items) {
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones ?? "");
    const structuralCompositionChanged = Boolean(
      meta.guidedVisualConfig?.quickCompositionStructural ||
      hasQuickCompositionStructuralChanges(meta.quickCompositionAdjustment)
    ) && !isVeratec7400FourMobileComposition(meta);
    if (structuralCompositionChanged) {
      compositionsPendingRecipe.push({
        itemId: String(item.id),
        codigo: (item.codigo ?? "").trim() || "-",
        nombre: (item.nombre ?? "").trim() || "Pieza",
        lineName: (item.lineaComercial ?? "").trim() || meta.referencia.trim(),
      });
    }
    const hasManualSnapshot = meta.cubicationSnapshot?.source === "manual";
    const liveResolution = !structuralCompositionChanged && !hasManualSnapshot && options?.recipes && options.organizationId != null
      ? resolveFabricacionDespieceForQuoteItem({
          item: item as CotizacionWorkflowItem,
          recipes: options.recipes,
          organizationId: options.organizationId,
        })
      : null;
    const snapshot = resolveDisplaySnapshot(
      item,
      meta,
      options,
      structuralCompositionChanged || hasManualSnapshot ? null : liveResolution
    );
    const formalIdentity = item.fabricacionSnapshot?.recipeIdentity;
    const identityConflict = hasPivotanteSlidingRecipeConflict({
      commercialType: item.tipo ?? item.tipoItem,
      commercialSystem: meta.sistema,
      commercialConfiguration: meta.configuracion,
      commercialName: item.nombre,
      technicalTypology: formalIdentity?.tipologia ?? meta.fabricacionTipologia,
      technicalOpening: formalIdentity?.apertura ?? meta.fabricacionApertura,
    });
    const normalizedType = `${item.tipo ?? item.tipoItem ?? ""} ${item.nombre ?? ""}`
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
    const explicitlyNonProfile = item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre" ||
      /vidrio|cristal|espejo|cubierta de mesa/.test(normalizedType);
    const requiresProfiles = !explicitlyNonProfile && (
      Boolean(meta.lineTemplateId || meta.catalogLineKey || item.fabricacionSnapshot || meta.cubicationSnapshot) ||
      /ventana|puerta|pano fijo|vitrina|shower|mampara|cierre/.test(normalizedType)
    );
    const hasCuts = Boolean(snapshot?.cuts.length);
    const sourceStatus = item.fabricacionSnapshot?.recipeStatus ?? meta.cubicationSnapshot?.status;
    const operationalStatus: FabricationProfileCoverageItem["state"] = !requiresProfiles
      ? "not_required"
      : identityConflict
        ? "incompatible"
        : !hasCuts
          ? "missing_snapshot"
          : Boolean(liveResolution?.geometryOnly)
            ? "preliminary"
            : sourceStatus === "validated" || sourceStatus === "validada"
              ? "ready"
              : "unvalidated";
    const reason = operationalStatus === "missing_snapshot" ? "No existe snapshot técnico con cortes guardados."
      : operationalStatus === "unvalidated" ? "La receta guardada no está validada para pauta operativa."
        : operationalStatus === "incompatible" ? "La identidad comercial contradice la tipología del snapshot técnico."
          : operationalStatus === "preliminary" ? "El despiece es preliminar y requiere revisión técnica."
            : null;
    profileCoverageItems.push({
      itemId: String(item.id), codigo: (item.codigo ?? "").trim() || "-",
      nombre: (item.nombre ?? "").trim() || "Componente", state: operationalStatus, reason,
    });
    if (!snapshot || snapshot.cuts.length === 0) continue;

    const recipe = snapshot.recipe ?? null;
    const status = item.fabricacionSnapshot
      ? item.fabricacionSnapshot.recipeStatus
      : ((recipe?.status ?? snapshot.status) as RecipeStatus | string);
    const glassThickness = resolveFrozenGlassThickness({
      observations: item.observaciones,
      snapshot: item.fabricacionSnapshot,
      selectedProductId: (item.tipo ?? item.tipoItem ?? "").trim().toLocaleLowerCase("es-CL") === "vidrio / cristal"
        ? meta.lineTemplateId
        : meta.vidrioLineTemplateId,
    });
    const geometryOnly = Boolean(liveResolution?.geometryOnly) && !meta.cubicationSnapshot && !item.fabricacionSnapshot;

    rows.push({
      itemId: String(item.id),
      codigo: (item.codigo ?? "").trim() || "-",
      nombre: (item.nombre ?? "").trim() || "Pieza",
      lineName: (item.lineaComercial ?? "").trim() || meta.referencia.trim(),
      material: meta.material || "",
      widthMm: snapshot.widthMm,
      heightMm: snapshot.heightMm,
      quantity: snapshot.quantity,
      snapshot,
      recipe,
      herrajeLabel: recipe
        ? herrajeDisplayLabel(recipe.herrajeTipo, recipe.herrajeLabel)
        : (item.fabricacionSnapshot?.recipeIdentity.herraje ?? "-"),
      statusLabel: identityConflict
        ? "Identidad incompatible · revisar snapshot histórico"
        : snapshot.source === "manual"
        ? "Ajustada para esta cotización"
        : geometryOnly
          ? "Despiece estructural preliminar · acristalamiento pendiente"
          : formatStatusLabel(status),
      geometryOnly,
      operationalStatus,
      profilesMl: snapshot.totalProfilesLinealMm / 1000,
      glassM2: snapshot.glass?.totalM2 ?? 0,
      glassThickness: glassThickness.display,
      glassThicknessWarning: glassThickness.warning,
      accessoryUnits: snapshot.accessoryUnits,
      barCount: snapshot.bars.length,
      fabricacionSnapshot: item.fabricacionSnapshot ?? null,
    });
  }

  const geometryOnlyItemIds = new Set(rows.filter((row) => row.geometryOnly).map((row) => row.itemId));
  const trabajoSnapshotHasGeometryOnly = Boolean(options?.trabajoSnapshot?.bars.some((bar) =>
    bar.cortes.some((cut) => geometryOnlyItemIds.has(String(cut.itemId)))
  ));
  const requiredCoverage = profileCoverageItems.filter((item) => item.state !== "not_required");
  const readyCount = requiredCoverage.filter((item) => item.state === "ready").length;
  const hasSavedJointBars = Boolean(options?.trabajoSnapshot?.bars.length);
  const physicalStatus = evaluarPautaFisicaTrabajo(options?.trabajoSnapshot);
  const readyItemIds = new Set(requiredCoverage.filter((item) => item.state === "ready").map((item) => item.itemId));
  const readyItemCodes = new Map<string, number>();
  for (const item of requiredCoverage.filter((entry) => entry.state === "ready")) {
    readyItemCodes.set(item.codigo, (readyItemCodes.get(item.codigo) ?? 0) + 1);
  }
  const jointCutsMatchReadyItems = (options?.trabajoSnapshot?.bars ?? []).every((bar) =>
    bar.cortes.every((cut) => readyItemIds.has(String(cut.itemId)) || (
      Boolean(cut.codigoItem) && readyItemCodes.get(cut.codigoItem) === 1 &&
      requiredCoverage.some((item) => item.state === "ready" && item.codigo === cut.codigoItem)
    ))
  );
  const expectedCuts = new Map<string, number>();
  const actualCuts = new Map<string, number>();
  const addCut = (map: Map<string, number>, itemId: string, cut: { componenteId: string; codigoPerfil: string; funcion: string; largoMm: number }) => {
    const key = JSON.stringify([itemId, cut.componenteId, cut.codigoPerfil, cut.funcion, cut.largoMm]);
    map.set(key, (map.get(key) ?? 0) + 1);
  };
  let completeCutEvidence = true;
  for (const row of rows.filter((entry) => entry.operationalStatus === "ready")) {
    const bars = row.fabricacionSnapshot?.pautaBarras?.barras;
    if (!bars?.length) { completeCutEvidence = false; continue; }
    for (const bar of bars) for (const cut of bar.cortes) addCut(expectedCuts, row.itemId, cut);
  }
  for (const bar of options?.trabajoSnapshot?.bars ?? []) for (const cut of bar.cortes) {
    const itemId = readyItemIds.has(String(cut.itemId)) ? String(cut.itemId)
      : requiredCoverage.find((item) => item.state === "ready" && item.codigo === cut.codigoItem && readyItemCodes.get(item.codigo) === 1)?.itemId;
    if (itemId) addCut(actualCuts, itemId, cut);
  }
  const jointCutsReconciled = !completeCutEvidence || (
    expectedCuts.size === actualCuts.size && [...expectedCuts].every(([key, count]) => actualCuts.get(key) === count)
  );
  const jointPlanStatus: NonNullable<FabricationQuoteSummary["profileCoverage"]>["jointPlanStatus"] = requiredCoverage.length === 0
    ? "not_required"
    : readyCount === 0
      ? "blocked"
      : !hasSavedJointBars
      ? "pending"
      : requiredCoverage.some((item) => item.state !== "ready") ||
          (options?.trabajoSnapshot?.itemCountWithPauta ?? 0) !== readyCount ||
          !jointCutsMatchReadyItems || !jointCutsReconciled
        ? "blocked"
        : physicalStatus === "incompatible"
          ? "blocked"
          : physicalStatus === "teorica" || !completeCutEvidence
            ? "theoretical"
        : "ready";
  const profileCoverageStatus = requiredCoverage.some((item) => item.state !== "ready") ||
    (readyCount > 0 && jointPlanStatus !== "ready") ? "partial" : "complete";

  return {
    items: rows,
    compositionsPendingRecipe,
    totalItems: items.length,
    totalProfilesMl: rows.reduce((sum, row) => sum + (row.operationalStatus === "ready" ? row.profilesMl : 0), 0),
    totalGlassM2: rows.reduce((sum, row) => sum + (row.geometryOnly ? 0 : row.glassM2), 0),
    totalAccessoryUnits: rows.reduce((sum, row) => sum + (row.geometryOnly ? 0 : row.accessoryUnits), 0),
    totalBars: profileCoverageStatus === "complete" && jointPlanStatus === "ready" && !trabajoSnapshotHasGeometryOnly
      ? options?.trabajoSnapshot?.totalBars ?? null
      : null,
    trabajoSnapshot: options?.trabajoSnapshot ?? null,
    trabajoSnapshotHasGeometryOnly,
    profileCoverage: {
      status: profileCoverageStatus,
      jointPlanStatus,
      requiredCount: requiredCoverage.length,
      readyCount,
      pendingCount: requiredCoverage.length - readyCount,
      items: profileCoverageItems,
    },
  };
}
