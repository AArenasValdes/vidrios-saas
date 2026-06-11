import { shouldRequireProfileMaterialForComponent } from "@/features/cotizaciones/new-quote/workflow-ui";

export type CotizacionItemPrintSpec = {
  key: string;
  value: string;
};

export type BuildCotizacionItemPrintSpecsInput = {
  tipo: string;
  dimensionsLabel: string;
  surfaceLabel: string;
  vidrio: string;
  material: string;
  colorName: string;
  systemLabel: string;
  lineLabel: string;
  configuracion?: string;
  sheetSchemeLabel?: string;
  shouldShowSheetSchemeSpec?: boolean;
  palilloEnabled?: boolean;
  palilloType?: string;
  mirrorFormatLabel?: string | null;
  mirrorTotalMeasureLabel?: string | null;
  mirrorPaneMeasureLabel?: string | null;
};

export function buildCotizacionItemPrintSpecs(
  input: BuildCotizacionItemPrintSpecsInput
): CotizacionItemPrintSpec[] {
  const specs: CotizacionItemPrintSpec[] = [
    { key: "Dimensiones", value: input.dimensionsLabel },
    ...(input.configuracion
      ? [{ key: "Configuración", value: input.configuracion }]
      : []),
    ...(input.shouldShowSheetSchemeSpec && input.sheetSchemeLabel
      ? [{ key: "Esquema", value: input.sheetSchemeLabel }]
      : []),
    ...(input.mirrorFormatLabel
      ? [{ key: "Formato", value: input.mirrorFormatLabel }]
      : []),
    ...(input.mirrorTotalMeasureLabel
      ? [{ key: "Medida total", value: input.mirrorTotalMeasureLabel }]
      : []),
    ...(input.mirrorPaneMeasureLabel
      ? [{ key: "Medida por pa\u00f1o", value: input.mirrorPaneMeasureLabel }]
      : []),
    { key: "Sistema", value: input.systemLabel },
    { key: "Línea", value: input.lineLabel },
  ];

  if (shouldRequireProfileMaterialForComponent(input.tipo)) {
    specs.push(
      { key: "Material", value: input.material },
      { key: "Color", value: input.colorName }
    );
  }

  specs.push({ key: "Vidrio", value: input.vidrio || "-" });

  if (input.palilloEnabled) {
    specs.push({
      key: "Palillo",
      value: input.palilloType?.trim() || "Con palillo",
    });
  }

  specs.push({ key: "Superficie", value: input.surfaceLabel });

  return specs;
}
