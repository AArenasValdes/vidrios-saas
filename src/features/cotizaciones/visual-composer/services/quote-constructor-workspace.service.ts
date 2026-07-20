import type { ComponentFormState } from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import {
  createDefaultGuidedVisualConfig,
  listLeafModules,
  updateModuleType,
  type GuidedModuleType,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

export type QuoteConstructorPresetId = GuidedModuleType;

export type QuoteConstructorPreset = {
  id: QuoteConstructorPresetId;
  label: string;
  componentType: "Ventana" | "Puerta";
  defaultName: string;
};

export const QUOTE_CONSTRUCTOR_PRESETS: QuoteConstructorPreset[] = [
  { id: "fijo", label: "Fijo", componentType: "Ventana", defaultName: "Ventana fija" },
  { id: "corredera", label: "Corredera", componentType: "Ventana", defaultName: "Ventana corredera" },
  { id: "abatible", label: "Abatible", componentType: "Ventana", defaultName: "Ventana abatible" },
  { id: "oscilobatiente", label: "Oscilobatiente", componentType: "Ventana", defaultName: "Ventana oscilobatiente" },
  { id: "proyectante", label: "Proyectante", componentType: "Ventana", defaultName: "Ventana proyectante" },
  { id: "puerta", label: "Puerta", componentType: "Puerta", defaultName: "Puerta abatible" },
  { id: "pano_libre", label: "Paño libre", componentType: "Ventana", defaultName: "Paño por definir" },
];

export type QuoteConstructorItemPatch = Partial<
  Pick<
    ComponentFormState,
    | "nombre"
    | "ancho"
    | "alto"
    | "cantidad"
    | "vidrio"
    | "material"
    | "colorHex"
    | "lineTemplateId"
    | "costoProveedorUnitario"
    | "guidedVisualConfig"
    | "cubicationSnapshot"
  >
> & {
  markPriceManual?: boolean;
};

export function createQuoteConstructorPresetConfig(
  type: QuoteConstructorPresetId,
  dimensions: { widthMm?: number; heightMm?: number } = {}
): GuidedVisualConfig {
  let config = createDefaultGuidedVisualConfig({
    widthMm: dimensions.widthMm ?? 1200,
    heightMm: dimensions.heightMm ?? 1000,
  });
  const root = listLeafModules(config.root)[0];
  config = updateModuleType(config, root.id, type);
  return config;
}

/** Nombre comercial sugerido según tipología homogénea del croquis (p. ej. solo fijo → "Ventana fija"). */
export function resolveQuoteConstructorCommercialName(
  config: GuidedVisualConfig | null | undefined
): string | null {
  if (!config) return null;
  const leaves = listLeafModules(config.root);
  if (leaves.length === 0) return null;

  const types = new Set(leaves.map((leaf) => leaf.type));
  if (types.size !== 1) return null;

  const onlyType = types.values().next().value as QuoteConstructorPresetId | undefined;
  if (!onlyType) return null;

  return QUOTE_CONSTRUCTOR_PRESETS.find((preset) => preset.id === onlyType)?.defaultName ?? null;
}

/** True si el nombre es exactamente el default de un preset del constructor (auto, no custom). */
export function isQuoteConstructorPresetDefaultName(nombre: string) {
  const normalized = nombre
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
  if (!normalized) return false;
  return QUOTE_CONSTRUCTOR_PRESETS.some((preset) => {
    const presetNormalized = preset.defaultName
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
    return presetNormalized === normalized;
  });
}

export function getQuoteConstructorItemConfig(
  item: CotizacionWorkflowItem
): GuidedVisualConfig | null {
  return decodeCotizacionItemPresentationMeta(item.observaciones).guidedVisualConfig;
}

export function isQuoteConstructorCompatibleItem(item: CotizacionWorkflowItem) {
  if (item.tipoItem === "item_libre_con_valor") return false;
  if (getQuoteConstructorItemConfig(item)) return true;
  const type = item.tipo.trim().toLocaleLowerCase("es");
  return type === "ventana" || type === "puerta" || type === "trabajo personalizado";
}

export function moveQuoteConstructorItem(
  items: CotizacionWorkflowItem[],
  itemId: string,
  direction: -1 | 1
) {
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  const targetIndex = sourceIndex + direction;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length) return items;

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}
