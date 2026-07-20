import type { SupabaseClient } from "@supabase/supabase-js";

import type { EntityId } from "@/types/common";
import { createCotizacionItemVisualConfigsRepository } from "@/features/cotizaciones/visual-composer/repositories/cotizacion-item-visual-configs.repository";
import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import {
  GUIDED_VISUAL_SCHEMA_VERSION,
  ensureGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  decodeCotizacionItemPresentationMeta,
  mergeFormalGuidedVisualConfigIntoObservaciones,
} from "@/utils/cotizacion-item-presentation";

export function applyFormalGuidedConfigsToItems<
  T extends { id: EntityId | string; observaciones?: string | null },
>(items: T[], formalByItemId: Map<string, GuidedVisualConfig>): T[] {
  if (formalByItemId.size === 0 || items.length === 0) {
    return items;
  }

  return items.map((item) => {
    const formal = formalByItemId.get(String(item.id));
    if (!formal) {
      return item;
    }

    return {
      ...item,
      observaciones: mergeFormalGuidedVisualConfigIntoObservaciones(
        item.observaciones,
        formal
      ),
    };
  });
}

export function createCotizacionItemVisualConfigsService(
  supabase: SupabaseClient
) {
  const repo = createCotizacionItemVisualConfigsRepository(supabase);

  async function loadConfigsByItemIds(
    organizationId: EntityId,
    itemIds: EntityId[]
  ): Promise<Map<string, GuidedVisualConfig>> {
    const rows = await repo.listActiveByItemIds(organizationId, itemIds);
    const map = new Map<string, GuidedVisualConfig>();

    for (const row of rows) {
      try {
        const config = ensureGuidedVisualConfig(row.config_json);
        map.set(String(row.cotizacion_item_id), config);
      } catch {
        // skip invalid formal rows; bridge remains fallback
      }
    }

    return map;
  }

  /**
   * Hydrate en lectura: `cotizacion_item_visual_configs.config_json` gana
   * sobre el bridge `[gvc:]` en `observaciones` (solo en memoria).
   */
  async function hydrateItemsObservaciones<
    T extends { id: EntityId | string; observaciones?: string | null },
  >(input: {
    organizationId: EntityId;
    items: T[];
  }): Promise<T[]> {
    const itemIds = input.items.map((item) => item.id);
    const formalByItemId = await loadConfigsByItemIds(
      input.organizationId,
      itemIds
    );

    return applyFormalGuidedConfigsToItems(input.items, formalByItemId);
  }

  async function syncFromPersistedItems(input: {
    organizationId: EntityId;
    items: Array<{ id: EntityId; observaciones?: string | null; color?: string | null }>;
  }) {
    for (const item of input.items) {
      const presentation = decodeCotizacionItemPresentationMeta(
        item.observaciones ?? ""
      );
      const guided = presentation.guidedVisualConfig;

      if (!guided) {
        await repo.softDeleteActiveForItem(input.organizationId, item.id);
        continue;
      }

      const config = ensureGuidedVisualConfig(guided);
      const svgMarkup = renderGuidedVisualSvg(config, {
        maxW: 470,
        maxH: 260,
        variant: "pdf",
        colorHex: item.color ?? null,
        showSelection: false,
      });

      await repo.upsertActiveConfig({
        organizationId: input.organizationId,
        itemId: item.id,
        schemaVersion: GUIDED_VISUAL_SCHEMA_VERSION,
        configJson: config,
        svgMarkup,
      });
    }
  }

  return {
    loadConfigsByItemIds,
    hydrateItemsObservaciones,
    syncFromPersistedItems,
  };
}

export type CotizacionItemVisualConfigsService = ReturnType<
  typeof createCotizacionItemVisualConfigsService
>;
