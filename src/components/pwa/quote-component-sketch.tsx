import { ComponentPreview } from "@/features/cotizaciones/components/component-preview";
import type { GuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";

type QuoteComponentSketchProps = {
  tipo: string;
  ancho: number | null;
  alto: number | null;
  colorHex: string;
  maxW?: number;
  maxH?: number;
  label?: string;
  showMeasurements?: boolean;
  mirrorFormat?: "single" | "divided";
  mirrorPaneCount?: number | null;
  mirrorPaneDirection?: "vertical" | "horizontal";
  mirrorInteriorLine?: "fine" | "marked";
  mobileGuidedWindow?: {
    sistema?: string | null;
    configuracion?: string | null;
    hojasBase?: 1 | 2 | 3 | 4 | 5 | null;
    sheetScheme?: string | null;
    sheetVariant?: string | null;
    customSchemeDescription?: string | null;
    isCustomScheme?: boolean | null;
    material?: string | null;
    referencia?: string | null;
    palilloEnabled?: boolean;
    palilloType?: string | null;
    guidedVisualConfig?: GuidedVisualConfig | null;
  };
};

export function QuoteComponentSketch({
  tipo,
  ancho,
  alto,
  colorHex,
  maxW = 160,
  maxH = 140,
  label,
  mirrorFormat = "single",
  mirrorPaneCount = null,
  mirrorPaneDirection = "vertical",
  mirrorInteriorLine = "fine",
  mobileGuidedWindow,
}: QuoteComponentSketchProps) {
  if (!mobileGuidedWindow) {
    return null;
  }

  return (
    <ComponentPreview
      type={tipo}
      system={mobileGuidedWindow.sistema}
      configuration={mobileGuidedWindow.configuracion}
      width={ancho}
      height={alto}
      colorHex={colorHex}
      material={mobileGuidedWindow.material}
      sheetScheme={mobileGuidedWindow.sheetScheme}
      sheetVariant={mobileGuidedWindow.sheetVariant}
      customSchemeDescription={mobileGuidedWindow.customSchemeDescription ?? undefined}
      isCustomScheme={mobileGuidedWindow.isCustomScheme ?? undefined}
      hojasBase={mobileGuidedWindow.hojasBase}
      referencia={mobileGuidedWindow.referencia}
      palilloEnabled={mobileGuidedWindow.palilloEnabled}
      palilloType={mobileGuidedWindow.palilloType}
      guidedVisualConfig={mobileGuidedWindow.guidedVisualConfig}
      mirrorFormat={mirrorFormat}
      mirrorPaneCount={mirrorPaneCount}
      mirrorPaneDirection={mirrorPaneDirection}
      mirrorInteriorLine={mirrorInteriorLine}
      maxW={maxW}
      maxH={maxH}
      size="hero"
      ariaLabel={label ?? tipo}
      className="my-1 min-w-0 max-w-full lg:hidden print:hidden"
    />
  );
}
