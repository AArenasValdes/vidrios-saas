import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { resolveCotizacionItemDrawingSvg } from "@/features/cotizaciones/visual-composer/services/resolve-item-drawing-svg";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import {
  getSheetSchemeOptions,
  getSheetVariantOptions,
  isTrabajoPersonalizadoComponentType,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  getDefaultConfigurationForComponent,
  getDefaultSystemForComponent,
  isFreeValueComponentType,
} from "@/features/cotizaciones/services/component-catalog.service";

export type ComponentPreviewInput = {
  type: string;
  system?: string | null;
  configuration?: string | null;
  width?: number | null;
  height?: number | null;
  colorHex?: string | null;
  material?: string | null;
  sheetScheme?: string | null;
  sheetVariant?: string | null;
  customSchemeDescription?: string | null;
  isCustomScheme?: boolean;
  hojasBase?: 1 | 2 | 3 | 4 | 5 | null;
  referencia?: string | null;
  palilloEnabled?: boolean;
  palilloType?: string | null;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
  guidedVisualConfig?: GuidedVisualConfig | null;
  maxW?: number;
  maxH?: number;
};

export function shouldRenderComponentPreview(type: string): boolean {
  return !isFreeValueComponentType(type);
}

export function buildSubtypePreviewInput(
  subtipo: string,
  colorHex = "#a8a8a8"
): ComponentPreviewInput {
  const system = getDefaultSystemForComponent(subtipo);
  const configuration = getDefaultConfigurationForComponent(subtipo, system);
  const sheetScheme = getSheetSchemeOptions({
    tipo: subtipo,
    sistema: system,
    configuracion: configuration,
  })[0] ?? "";
  const sheetVariant =
    getSheetVariantOptions(sheetScheme, { tipo: subtipo, sistema: system })[0] ?? "";

  return {
    type: subtipo,
    system,
    configuration,
    sheetScheme,
    sheetVariant,
    colorHex,
    width: null,
    height: null,
    maxW: 62,
    maxH: 54,
  };
}

function buildComponentPreviewFallbackSvg(type: string, maxW: number, maxH: number): string {
  const label = type.trim().slice(0, 12) || "Pieza";
  const width = Math.max(48, maxW);
  const height = Math.max(40, maxH);
  const frame = 4;
  const innerW = width - frame * 2 - 16;
  const innerH = height - frame * 2 - 16;
  const x = 8;
  const y = 8;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}"><rect x="${x}" y="${y}" width="${innerW}" height="${innerH}" fill="#f3f6fb" stroke="#9aa8bc" stroke-width="${frame}" rx="2"/><text x="${width / 2}" y="${height / 2 + 4}" text-anchor="middle" font-size="9" fill="#667085" font-family="sans-serif">${label}</text></svg>`;
}

export function buildComponentPreviewInputFromWorkflowItem(
  item: CotizacionWorkflowItem,
  options?: { maxW?: number; maxH?: number }
): ComponentPreviewInput | null {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  const isFreeValueItem =
    item.tipoItem === "item_libre_con_valor" || meta.displayMode === "item_libre";

  if (isFreeValueItem || !shouldRenderComponentPreview(item.tipo)) {
    return null;
  }

  return {
    type: item.tipo,
    system: meta.sistema,
    configuration: meta.configuracion,
    width: item.ancho,
    height: item.alto,
    colorHex: meta.colorHex,
    material: meta.material,
    sheetScheme: meta.sheetScheme,
    sheetVariant: meta.sheetVariant,
    customSchemeDescription: meta.customSchemeDescription,
    isCustomScheme: meta.isCustomScheme,
    referencia: meta.referencia ?? item.lineaComercial,
    palilloEnabled: meta.palilloEnabled,
    palilloType: meta.palilloType,
    mirrorFormat: meta.mirrorFormat,
    mirrorPaneCount: meta.mirrorPaneCount,
    mirrorPaneDirection: meta.mirrorPaneDirection,
    mirrorInteriorLine: meta.mirrorInteriorLine,
    guidedVisualConfig: meta.guidedVisualConfig,
    maxW: options?.maxW,
    maxH: options?.maxH,
  };
}

export function resolveComponentPreviewSvg(input: ComponentPreviewInput): string {
  if (!shouldRenderComponentPreview(input.type)) {
    return "";
  }

  if (
    isTrabajoPersonalizadoComponentType(input.type) &&
    !input.guidedVisualConfig
  ) {
    return buildComponentPreviewFallbackSvg(
      input.type,
      input.maxW ?? 200,
      input.maxH ?? 150
    );
  }

  const colorHex = input.colorHex?.trim() || "#a8a8a8";
  const maxW = input.maxW ?? 200;
  const maxH = input.maxH ?? 150;

  try {
    const svg = resolveCotizacionItemDrawingSvg({
      tipo: input.type,
      sistema: input.system,
      configuracion: input.configuration,
      hojasBase: input.hojasBase ?? undefined,
      sheetScheme: input.sheetScheme,
      sheetVariant: input.sheetVariant,
      customSchemeDescription: input.customSchemeDescription,
      isCustomScheme: input.isCustomScheme,
      referencia: input.referencia,
      ancho: input.width ?? null,
      alto: input.height ?? null,
      colorHex,
      material: input.material,
      guidedVisualConfig: input.guidedVisualConfig,
      palilloEnabled: input.palilloEnabled,
      palilloType: input.palilloType,
      mirrorFormat: input.mirrorFormat,
      mirrorPaneCount: input.mirrorPaneCount,
      mirrorPaneDirection: input.mirrorPaneDirection,
      mirrorInteriorLine: input.mirrorInteriorLine,
      maxW,
      maxH,
      variant: "default",
    });

    if (svg.trim().startsWith("<svg")) {
      return svg;
    }
  } catch {
    // fallback abajo
  }

  return buildComponentPreviewFallbackSvg(input.type, maxW, maxH);
}
