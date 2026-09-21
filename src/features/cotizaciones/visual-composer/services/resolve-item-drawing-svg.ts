import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { applyCommercialPalilloToGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/services/guided-visual-palillo-compat.service";
import {
  ensureGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  generateComponentSVG,
  isThreeLeafCenterFixedSlidingWindowPresentation,
  resolveLightCierrePreviewBackground,
  resolveLightDoorPreviewBackground,
  resolveLightFixedPanePreviewBackground,
  resolveLightVitrinaPreviewBackground,
  resolveWhiteSlidingPreviewBackground,
  type ComponentSVGParams,
} from "@/utils/window-drawings";

type ResolveItemDrawingSvgInput = {
  tipo: string;
  sistema?: string | null;
  configuracion?: string | null;
  hojasBase?: 1 | 2 | 3 | 4 | 5 | null;
  sheetScheme?: string | null;
  sheetVariant?: string | null;
  customSchemeDescription?: string | null;
  isCustomScheme?: boolean;
  referencia?: string | null;
  itemLabel?: string | null;
  ancho: number | null;
  alto: number | null;
  colorHex: string;
  material?: string | null;
  guidedVisualConfig?: GuidedVisualConfig | null;
  palilloEnabled?: boolean;
  palilloType?: string | null;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
  maxW?: number;
  maxH?: number;
  variant?: "pdf" | "default";
  presentation?: "mobile-guided";
};

/** Misma prioridad que PDF: guided formal/bridge primero, legacy después. */
export function resolveCotizacionItemDrawingSvg(
  input: ResolveItemDrawingSvgInput
): string {
  const maxW = input.maxW ?? 470;
  const maxH = input.maxH ?? 260;
  const variant = input.variant ?? "pdf";
  const guidedVariant = variant === "pdf" ? "pdf" : "thumbnail";
  const componentSvgParams: ComponentSVGParams = {
    tipo: input.tipo,
    sistema: input.sistema ?? undefined,
    configuracion: input.configuracion ?? undefined,
    hojasBase: input.hojasBase ?? undefined,
    sheetScheme: input.sheetScheme ?? undefined,
    sheetVariant: input.sheetVariant ?? undefined,
    customSchemeDescription: input.customSchemeDescription ?? undefined,
    isCustomScheme: input.isCustomScheme,
    referencia: input.referencia ?? undefined,
    ancho: input.ancho,
    alto: input.alto,
    colorHex: input.colorHex,
    material: input.material,
    presentation: variant === "pdf" ? "quote-pdf" : input.presentation,
    maxW,
    maxH,
    variant,
    palilloEnabled: input.palilloEnabled,
    palilloType: input.palilloType || undefined,
    mirrorFormat: input.mirrorFormat,
    mirrorPaneCount: input.mirrorPaneCount ?? undefined,
    mirrorPaneDirection: input.mirrorPaneDirection,
    mirrorInteriorLine: input.mirrorInteriorLine,
  };
  const normalizedItemLabel = (input.itemLabel ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const isNamedThreeLeafCenterFixedPdf = variant === "pdf" &&
    normalizedItemLabel.includes("corredera") &&
    normalizedItemLabel.includes("3 hojas") &&
    normalizedItemLabel.includes("2 moviles + 1 fija");
  const targetSvgParams = isNamedThreeLeafCenterFixedPdf
    ? {
        ...componentSvgParams,
        tipo: "Ventana",
        sistema: "Corredera",
        hojasBase: 3 as const,
        sheetScheme: "3 hojas",
        sheetVariant: "2 móviles + 1 fija",
        customSchemeDescription: undefined,
        isCustomScheme: false,
      }
    : componentSvgParams;

  try {
    // Esta variante necesita conservar el dibujo de 3 paños también en PDF.
    // La configuración guiada puede existir, pero su renderer no representa
    // la distribución comercial 25/50/25 de esta presentación.
    if (isNamedThreeLeafCenterFixedPdf || isThreeLeafCenterFixedSlidingWindowPresentation(targetSvgParams)) {
      return generateComponentSVG(targetSvgParams);
    }

    if (input.guidedVisualConfig) {
      const guidedVisualConfig = applyCommercialPalilloToGuidedVisualConfig({
        config: ensureGuidedVisualConfig(input.guidedVisualConfig),
        palilloEnabled: input.palilloEnabled,
        palilloType: input.palilloType,
      });
      const previewBackgroundParams = componentSvgParams;

      return renderGuidedVisualSvg(guidedVisualConfig, {
        maxW,
        maxH,
        variant: guidedVariant,
        canvasBackground: variant === "pdf"
          ? resolveWhiteSlidingPreviewBackground(previewBackgroundParams) ??
            resolveLightDoorPreviewBackground(previewBackgroundParams) ??
            resolveLightCierrePreviewBackground(previewBackgroundParams) ??
            resolveLightFixedPanePreviewBackground(previewBackgroundParams) ??
            resolveLightVitrinaPreviewBackground(previewBackgroundParams)
          : undefined,
        colorHex: input.colorHex,
        showSelection: false,
        showLabels: false,
        showDimensions: true,
      });
    }
  } catch {
    // fallback legacy abajo
  }

  return generateComponentSVG(componentSvgParams);
}
