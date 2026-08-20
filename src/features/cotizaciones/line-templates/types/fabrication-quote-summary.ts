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
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

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
  accessoryUnits: number;
  barCount: number;
};

export type FabricationQuoteSummary = {
  items: FabricationSummaryItem[];
  totalItems: number;
  totalProfilesMl: number;
  totalGlassM2: number;
  totalAccessoryUnits: number;
  totalBars: number;
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
  }
): CotizacionItemCubicationSnapshot | null {
  const frozen = item.fabricacionSnapshot
    ? fabricacionSnapshotToLegacyCubicationSnapshot(item.fabricacionSnapshot)
    : meta.cubicationSnapshot;

  if (!options?.recipes || options.organizationId == null) {
    return frozen ?? null;
  }

  const workflowItem = item as CotizacionWorkflowItem;
  const live = resolveFabricacionDespieceForQuoteItem({
    item: workflowItem,
    recipes: options.recipes,
    organizationId: options.organizationId,
  });

  if (live.estado !== "calculado" || !live.cubication) {
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
  }
): FabricationQuoteSummary {
  const rows: FabricationSummaryItem[] = [];

  for (const item of items) {
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones ?? "");
    const snapshot = resolveDisplaySnapshot(item, meta, options);
    if (!snapshot || snapshot.cuts.length === 0) continue;

    const recipe = snapshot.recipe ?? null;
    const status = item.fabricacionSnapshot
      ? item.fabricacionSnapshot.recipeStatus
      : ((recipe?.status ?? snapshot.status) as RecipeStatus | string);

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
      statusLabel: formatStatusLabel(status),
      profilesMl: snapshot.totalProfilesLinealMm / 1000,
      glassM2: snapshot.glass?.totalM2 ?? 0,
      accessoryUnits: snapshot.accessoryUnits,
      barCount: snapshot.bars.length,
    });
  }

  return {
    items: rows,
    totalItems: items.length,
    totalProfilesMl: rows.reduce((sum, row) => sum + row.profilesMl, 0),
    totalGlassM2: rows.reduce((sum, row) => sum + row.glassM2, 0),
    totalAccessoryUnits: rows.reduce((sum, row) => sum + row.accessoryUnits, 0),
    totalBars: rows.reduce((sum, row) => sum + row.barCount, 0),
  };
}
