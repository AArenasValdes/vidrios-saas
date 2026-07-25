/**
 * Resumen interno de fabricación para print técnico (no PDF cliente).
 */

import {
  herrajeDisplayLabel,
  RECIPE_STATUS_LABELS,
  type FabricationRecipe,
  type RecipeStatus,
} from "@/features/cotizaciones/line-templates/types/fabrication-recipe";
import type { CotizacionItemCubicationSnapshot } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template-cubication-snapshot";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type FabricationSummaryItem = {
  itemId: string;
  codigo: string;
  nombre: string;
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
  totalProfilesMl: number;
  totalGlassM2: number;
  totalAccessoryUnits: number;
  totalBars: number;
};

type QuoteItemLike = {
  id: string | number;
  codigo?: string | null;
  nombre?: string | null;
  observaciones?: string | null;
};

export function buildFabricationQuoteSummary(
  items: QuoteItemLike[]
): FabricationQuoteSummary {
  const rows: FabricationSummaryItem[] = [];

  for (const item of items) {
    const meta = decodeCotizacionItemPresentationMeta(item.observaciones ?? "");
    const snapshot = meta.cubicationSnapshot;
    if (!snapshot || snapshot.cuts.length === 0) continue;

    const recipe = snapshot.recipe ?? null;
    const status = (recipe?.status ?? snapshot.status) as RecipeStatus | string;
    rows.push({
      itemId: String(item.id),
      codigo: (item.codigo ?? "").trim() || "—",
      nombre: (item.nombre ?? "").trim() || "Pieza",
      widthMm: snapshot.widthMm,
      heightMm: snapshot.heightMm,
      quantity: snapshot.quantity,
      snapshot,
      recipe,
      herrajeLabel: recipe
        ? herrajeDisplayLabel(recipe.herrajeTipo, recipe.herrajeLabel)
        : "—",
      statusLabel:
        typeof status === "string" && status in RECIPE_STATUS_LABELS
          ? RECIPE_STATUS_LABELS[status as RecipeStatus]
          : String(status),
      profilesMl: snapshot.totalProfilesLinealMm / 1000,
      glassM2: snapshot.glass?.totalM2 ?? 0,
      accessoryUnits: snapshot.accessoryUnits,
      barCount: snapshot.bars.length,
    });
  }

  return {
    items: rows,
    totalProfilesMl: rows.reduce((sum, row) => sum + row.profilesMl, 0),
    totalGlassM2: rows.reduce((sum, row) => sum + row.glassM2, 0),
    totalAccessoryUnits: rows.reduce((sum, row) => sum + row.accessoryUnits, 0),
    totalBars: rows.reduce((sum, row) => sum + row.barCount, 0),
  };
}
