import type {
  CotizacionLineTemplateCategoria,
  CotizacionLineTemplateUnidadCobro,
} from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

export const LINE_TEMPLATE_CATEGORIA_LABELS: Record<CotizacionLineTemplateCategoria, string> = {
  aluminio: "Aluminio",
  pvc: "PVC",
  vidrio: "Vidrio",
  shower: "Shower / mampara",
  accesorios: "Accesorios",
  otros: "Otros",
};

export const LINE_TEMPLATE_UNIDAD_LABELS: Record<CotizacionLineTemplateUnidadCobro, string> = {
  m2: "$/m²",
  metro_lineal: "$/ml",
  unidad: "$/ud",
  valor_manual: "Valor manual",
};

export function formatLineTemplatePriceLabel(
  unidadCobro: CotizacionLineTemplateUnidadCobro,
  amount: number,
  formatCurrency: (value: number) => string
) {
  const formatted = formatCurrency(amount);
  switch (unidadCobro) {
    case "metro_lineal":
      return `${formatted}/ml`;
    case "unidad":
      return `${formatted}/ud`;
    case "valor_manual":
      return `${formatted} manual`;
    default:
      return `${formatted}/m²`;
  }
}
