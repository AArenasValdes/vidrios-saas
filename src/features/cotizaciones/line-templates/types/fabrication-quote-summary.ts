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
  profilesMl: number;
  glassM2: number;
  glassThickness: string;
  glassThicknessWarning: string | null;
  accessoryUnits: number;
  barCount: number;
  fabricacionSnapshot: FabricacionCotizacionSnapshot | null;
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
    const geometryOnly = Boolean(liveResolution?.geometryOnly) && !meta.cubicationSnapshot;

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
      statusLabel: snapshot.source === "manual"
        ? "Ajustada para esta cotización"
        : geometryOnly
          ? "Preliminar · revisar en taller"
          : formatStatusLabel(status),
      profilesMl: snapshot.totalProfilesLinealMm / 1000,
      glassM2: snapshot.glass?.totalM2 ?? 0,
      glassThickness: glassThickness.display,
      glassThicknessWarning: glassThickness.warning,
      accessoryUnits: snapshot.accessoryUnits,
      barCount: snapshot.bars.length,
      fabricacionSnapshot: item.fabricacionSnapshot ?? null,
    });
  }

  return {
    items: rows,
    compositionsPendingRecipe,
    totalItems: items.length,
    totalProfilesMl: rows.reduce((sum, row) => sum + row.profilesMl, 0),
    totalGlassM2: rows.reduce((sum, row) => sum + row.glassM2, 0),
    totalAccessoryUnits: rows.reduce((sum, row) => sum + row.accessoryUnits, 0),
    totalBars: options?.trabajoSnapshot?.totalBars ?? null,
    trabajoSnapshot: options?.trabajoSnapshot ?? null,
  };
}
