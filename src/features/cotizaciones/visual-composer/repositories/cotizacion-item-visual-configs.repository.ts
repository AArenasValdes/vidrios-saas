import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntityId } from "@/types/common";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

export type CotizacionItemVisualConfigRow = {
  id: number;
  organization_id: number;
  cotizacion_item_id: number;
  schema_version: number;
  config_json: GuidedVisualConfig | Record<string, unknown>;
  svg_markup: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};

export function createCotizacionItemVisualConfigsRepository(
  supabase: SupabaseClient
) {
  async function listActiveByItemIds(
    organizationId: EntityId,
    itemIds: EntityId[]
  ): Promise<CotizacionItemVisualConfigRow[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from("cotizacion_item_visual_configs")
      .select(
        "id, organization_id, cotizacion_item_id, schema_version, config_json, svg_markup, creado_en, actualizado_en, eliminado_en"
      )
      .eq("organization_id", organizationId)
      .in("cotizacion_item_id", itemIds)
      .is("eliminado_en", null);

    if (error) {
      throw error;
    }

    return (data as CotizacionItemVisualConfigRow[]) ?? [];
  }

  async function softDeleteActiveForItem(
    organizationId: EntityId,
    itemId: EntityId
  ) {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("cotizacion_item_visual_configs")
      .update({ eliminado_en: now, actualizado_en: now })
      .eq("organization_id", organizationId)
      .eq("cotizacion_item_id", itemId)
      .is("eliminado_en", null);

    if (error) {
      throw error;
    }
  }

  async function upsertActiveConfig(input: {
    organizationId: EntityId;
    itemId: EntityId;
    schemaVersion: number;
    configJson: GuidedVisualConfig;
    svgMarkup: string | null;
  }) {
    const existing = await listActiveByItemIds(input.organizationId, [
      input.itemId,
    ]);
    const now = new Date().toISOString();

    if (existing[0]) {
      const { data, error } = await supabase
        .from("cotizacion_item_visual_configs")
        .update({
          schema_version: input.schemaVersion,
          config_json: input.configJson,
          svg_markup: input.svgMarkup,
          actualizado_en: now,
        })
        .eq("id", existing[0].id)
        .eq("organization_id", input.organizationId)
        .is("eliminado_en", null)
        .select(
          "id, organization_id, cotizacion_item_id, schema_version, config_json, svg_markup, creado_en, actualizado_en, eliminado_en"
        )
        .single();

      if (error) {
        throw error;
      }

      return data as CotizacionItemVisualConfigRow;
    }

    const { data, error } = await supabase
      .from("cotizacion_item_visual_configs")
      .insert({
        organization_id: input.organizationId,
        cotizacion_item_id: input.itemId,
        schema_version: input.schemaVersion,
        config_json: input.configJson,
        svg_markup: input.svgMarkup,
        creado_en: now,
        actualizado_en: now,
        eliminado_en: null,
      })
      .select(
        "id, organization_id, cotizacion_item_id, schema_version, config_json, svg_markup, creado_en, actualizado_en, eliminado_en"
      )
      .single();

    if (error) {
      throw error;
    }

    return data as CotizacionItemVisualConfigRow;
  }

  return {
    listActiveByItemIds,
    softDeleteActiveForItem,
    upsertActiveConfig,
  };
}

export type CotizacionItemVisualConfigsRepository = ReturnType<
  typeof createCotizacionItemVisualConfigsRepository
>;
