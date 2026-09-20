import { isVentoraCatalogKey } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";

type TechnicalTone = "quote_only" | "draft" | "testing" | "validated";

export function shouldOfferLineFabricationWorkspace(
  template: Pick<CotizacionLineTemplate, "catalogKey" | "categoria">
): boolean {
  if (isVentoraCatalogKey(template.catalogKey)) return true;
  return template.categoria !== "vidrio";
}

export function resolveLineFabricationActionLabel(input: {
  catalogKey?: string | null;
  technicalTone: TechnicalTone;
  needsPrice: boolean;
}): string {
  if (isVentoraCatalogKey(input.catalogKey)) {
    return input.technicalTone === "validated" ? "Ver fabricación" : "Ir a fabricación";
  }

  if (input.needsPrice) {
    return "Configurar fabricación";
  }

  if (input.technicalTone === "validated") {
    return "Ver fabricación";
  }

  if (input.technicalTone === "testing" || input.technicalTone === "draft") {
    return "Ir a fabricación";
  }

  return "Configurar fabricación";
}
