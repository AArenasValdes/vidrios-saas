import { renderGuidedVisualSvg } from "@/features/cotizaciones/visual-composer/services/guided-visual-renderer.service";
import { applyCommercialPalilloToGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/services/guided-visual-palillo-compat.service";
import {
  ensureGuidedVisualConfig,
  type GuidedVisualConfig,
} from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import {
  generateComponentSVG,
  resolveLightCierrePreviewBackground,
  resolveLightDoorPreviewBackground,
  resolveLightFixedPanePreviewBackground,
  resolveLightVitrinaPreviewBackground,
  resolveWhiteSlidingPreviewBackground,
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
};

/** Misma prioridad que PDF: guided formal/bridge primero, legacy después. */
export function resolveCotizacionItemDrawingSvg(
  input: ResolveItemDrawingSvgInput
): string {
  const maxW = input.maxW ?? 470;
  const maxH = input.maxH ?? 260;
  const variant = input.variant ?? "pdf";
  const guidedVariant = variant === "pdf" ? "pdf" : "thumbnail";

  try {
    if (input.guidedVisualConfig) {
      const guidedVisualConfig = applyCommercialPalilloToGuidedVisualConfig({
        config: ensureGuidedVisualConfig(input.guidedVisualConfig),
        palilloEnabled: input.palilloEnabled,
        palilloType: input.palilloType,
      });
      return renderGuidedVisualSvg(guidedVisualConfig, {
        maxW,
        maxH,
        variant: guidedVariant,
        canvasBackground: variant === "pdf"
          ? resolveWhiteSlidingPreviewBackground({ ...input, palilloType: input.palilloType ?? undefined }) ??
            resolveLightDoorPreviewBackground({ ...input, tipo: input.tipo }) ??
            resolveLightCierrePreviewBackground({ ...input, tipo: input.tipo }) ??
            resolveLightFixedPanePreviewBackground({ ...input, tipo: input.tipo }) ??
            resolveLightVitrinaPreviewBackground({ ...input, tipo: input.tipo })
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

  return generateComponentSVG({
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
    presentation: variant === "pdf" ? "quote-pdf" : undefined,
    maxW,
    maxH,
    variant,
    palilloEnabled: input.palilloEnabled,
    palilloType: input.palilloType || undefined,
    mirrorFormat: input.mirrorFormat,
    mirrorPaneCount: input.mirrorPaneCount ?? undefined,
    mirrorPaneDirection: input.mirrorPaneDirection,
    mirrorInteriorLine: input.mirrorInteriorLine,
  });
}
