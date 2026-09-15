import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import type { CotizacionWorkflowDraft } from "@/features/cotizaciones/types/cotizacion-workflow";
import { VALIDEZ_OPTIONS } from "@/features/cotizaciones/new-quote/workflow-ui";
import {
  normalizeDocumentOptionalText,
  normalizeDocumentText,
} from "@/utils/cotizacion-document";

export const DEFAULT_QUOTE_VALIDEZ = "15 dias";

export type QuoteCommercialDefaults = Pick<
  CotizacionWorkflowDraft,
  "validez" | "condicionesDePago" | "condicionesVenta" | "terminosCondiciones"
>;

export type QuoteCommercialConditionsSource = {
  condicionesDePago?: string | null;
  condicionesVenta?: string | null;
  terminosCondiciones?: string | null;
  observaciones?: string | null;
};

export type QuoteCommercialOrganizationFallback = {
  formaPago?: string | null;
  condicionesVentaPredeterminadas?: string | null;
  terminosCondicionesPredeterminados?: string | null;
};

export type QuoteDocumentCommercialSection = {
  title: string;
  body: string;
};

function normalizeValidezPredeterminada(value: string | null | undefined) {
  const normalized = normalizeDocumentOptionalText(value);

  if (!normalized) {
    return DEFAULT_QUOTE_VALIDEZ;
  }

  if (VALIDEZ_OPTIONS.includes(normalized)) {
    return normalized;
  }

  const digits = normalized.match(/\d+/)?.[0];
  if (!digits) {
    return DEFAULT_QUOTE_VALIDEZ;
  }

  const days = Number(digits);
  if (days <= 7) return "7 dias";
  if (days <= 15) return "15 dias";
  return "30 dias";
}

export function formatValidezPredeterminadaLabel(value: string | null | undefined) {
  const normalized = normalizeValidezPredeterminada(value);
  const days = normalized.match(/\d+/)?.[0] ?? "15";
  return `${days} días`;
}

export function buildQuoteCommercialDefaultsFromProfile(
  profile?: Partial<OrganizationProfile> | null
): QuoteCommercialDefaults {
  return {
    validez: normalizeValidezPredeterminada(profile?.validezPredeterminada),
    condicionesDePago: normalizeDocumentOptionalText(profile?.formaPago),
    condicionesVenta: normalizeDocumentOptionalText(
      profile?.condicionesVentaPredeterminadas
    ),
    terminosCondiciones: normalizeDocumentOptionalText(
      profile?.terminosCondicionesPredeterminados
    ),
  };
}

export function hasActiveQuoteCommercialDefaults(
  profile?: Partial<OrganizationProfile> | null
) {
  const defaults = buildQuoteCommercialDefaultsFromProfile(profile);

  return Boolean(
    defaults.condicionesDePago ||
      defaults.condicionesVenta ||
      defaults.terminosCondiciones
  );
}

export function buildQuotePreferencesSummary(
  profile?: Partial<OrganizationProfile> | null
) {
  const defaults = buildQuoteCommercialDefaultsFromProfile(profile);
  const parts = [
    formatValidezPredeterminadaLabel(defaults.validez),
    "IVA incluido",
    hasActiveQuoteCommercialDefaults(profile)
      ? "Condiciones predeterminadas activas"
      : "Sin condiciones predeterminadas",
  ];

  return parts.join(" · ");
}

export function quoteUsesOrganizationCommercialDefaults(
  draft: QuoteCommercialConditionsSource,
  profile?: Partial<OrganizationProfile> | null
) {
  const defaults = buildQuoteCommercialDefaultsFromProfile(profile);

  return (
    normalizeDocumentOptionalText(draft.condicionesDePago) ===
      defaults.condicionesDePago &&
    normalizeDocumentOptionalText(draft.condicionesVenta) ===
      defaults.condicionesVenta &&
    normalizeDocumentOptionalText(draft.terminosCondiciones) ===
      defaults.terminosCondiciones
  );
}

export function hasPersistedStructuredCommercialConditions(
  source: QuoteCommercialConditionsSource
) {
  return (
    source.condicionesDePago !== null &&
    source.condicionesDePago !== undefined ||
    source.condicionesVenta !== null &&
    source.condicionesVenta !== undefined ||
    source.terminosCondiciones !== null &&
    source.terminosCondiciones !== undefined
  );
}

export function resolveQuotePaymentTerms(
  source: QuoteCommercialConditionsSource,
  organization?: QuoteCommercialOrganizationFallback | null
) {
  const payment =
    normalizeDocumentOptionalText(source.condicionesDePago) ||
    normalizeDocumentOptionalText(organization?.formaPago);

  return normalizeDocumentText(payment, "Por definir con la empresa");
}

export function buildQuoteDocumentCommercialSections(
  source: QuoteCommercialConditionsSource,
  organization?: QuoteCommercialOrganizationFallback | null
): QuoteDocumentCommercialSection[] {
  const payment =
    normalizeDocumentOptionalText(source.condicionesDePago) ||
    normalizeDocumentOptionalText(organization?.formaPago);
  const condicionesVenta =
    normalizeDocumentOptionalText(source.condicionesVenta) ||
    normalizeDocumentOptionalText(organization?.condicionesVentaPredeterminadas);
  const terminos =
    normalizeDocumentOptionalText(source.terminosCondiciones) ||
    normalizeDocumentOptionalText(organization?.terminosCondicionesPredeterminados);
  const notas = normalizeDocumentOptionalText(source.observaciones);
  const hasStructuredConditions = hasPersistedStructuredCommercialConditions(source);

  const sections: QuoteDocumentCommercialSection[] = [];

  if (payment) {
    sections.push({ title: "Forma de pago", body: payment });
  }

  if (condicionesVenta) {
    sections.push({ title: "Condiciones de venta", body: condicionesVenta });
  }

  if (terminos) {
    sections.push({
      title: "Términos y condiciones adicionales",
      body: terminos,
    });
  }

  if (!hasStructuredConditions && notas) {
    sections.push({ title: "Condiciones", body: notas });
    return sections;
  }

  if (notas) {
    sections.push({ title: "Notas", body: notas });
  }

  return sections;
}
