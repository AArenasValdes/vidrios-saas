import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";

export function resolveMostrarIvaEnPdf(value?: boolean | null) {
  return value ?? true;
}

export type QuotePdfDisplayDefaults = Pick<CotizacionWorkflowDraft, "mostrarIvaEnPdf">;

export function buildQuotePdfDisplayDefaultsFromProfile(
  profile?: Partial<OrganizationProfile> | null
): QuotePdfDisplayDefaults {
  return {
    mostrarIvaEnPdf: resolveMostrarIvaEnPdf(profile?.mostrarIvaEnPdf),
  };
}

export function buildQuoteGrandTotalClientLabel(input: {
  mostrarIvaEnPdf?: boolean | null;
  showItemPrices?: boolean;
}) {
  if (!resolveMostrarIvaEnPdf(input.mostrarIvaEnPdf)) {
    return "Total final";
  }

  return input.showItemPrices ? "Total presupuesto" : "Precio final";
}
