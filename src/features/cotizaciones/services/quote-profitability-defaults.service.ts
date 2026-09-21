import type { OrganizationProfile } from "@/features/organization-profile/types/organization-profile";
import {
  createQuoteStudioFinancialDraft,
  type CotizacionWorkflowDraft,
  type QuoteProfitabilityDefaultsSnapshot,
  type QuoteStudioFinancialDraft,
} from "@/features/cotizaciones/types/cotizacion-workflow";

const APP_DEFAULT_TARGET_MARGIN_PCT = 30;

export type ProfitabilityParametersOrigin = "organization_defaults" | "customized";

export type OrganizationProfitabilityDefaults = {
  margenObjetivoDefecto: number | null;
  mermaMaterialesDefecto: number | null;
  costoManoObraDefecto: number | null;
  costoTrasladoDefecto: number | null;
  costoOtrosDefecto: number | null;
};

function normalizeNullableNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Number(value);
}

export function resolveOrganizationProfitabilityDefaults(
  profile?: Partial<OrganizationProfile> | null
): OrganizationProfitabilityDefaults {
  return {
    margenObjetivoDefecto: normalizeNullableNumber(profile?.margenObjetivoDefecto),
    mermaMaterialesDefecto: normalizeNullableNumber(profile?.mermaMaterialesDefecto),
    costoManoObraDefecto: normalizeNullableNumber(profile?.costoManoObraDefecto),
    costoTrasladoDefecto: normalizeNullableNumber(profile?.costoTrasladoDefecto),
    costoOtrosDefecto: normalizeNullableNumber(profile?.costoOtrosDefecto),
  };
}

export function buildQuoteProfitabilityDefaultsSnapshot(
  profile?: Partial<OrganizationProfile> | null
): QuoteProfitabilityDefaultsSnapshot {
  const orgDefaults = resolveOrganizationProfitabilityDefaults(profile);

  return {
    manoObra: orgDefaults.costoManoObraDefecto ?? 0,
    traslado: orgDefaults.costoTrasladoDefecto ?? 0,
    otrosCostos: orgDefaults.costoOtrosDefecto ?? 0,
    mermaPct: orgDefaults.mermaMaterialesDefecto ?? 0,
    margenObjetivoRealPct: orgDefaults.margenObjetivoDefecto ?? APP_DEFAULT_TARGET_MARGIN_PCT,
  };
}

export function buildQuoteProfitabilityDefaultsFromProfile(
  profile?: Partial<OrganizationProfile> | null
): QuoteStudioFinancialDraft {
  const inheritedDefaultsSnapshot = buildQuoteProfitabilityDefaultsSnapshot(profile);

  return {
    ...inheritedDefaultsSnapshot,
    costoMaterialesManual: null,
    inheritedDefaultsSnapshot,
  };
}

export function isFactoryQuoteStudioFinancial(
  financial?: Partial<QuoteStudioFinancialDraft> | null
) {
  const current = createQuoteStudioFinancialDraft(financial ?? undefined);
  const factory = createQuoteStudioFinancialDraft();

  return (
    current.manoObra === factory.manoObra &&
    current.traslado === factory.traslado &&
    current.otrosCostos === factory.otrosCostos &&
    current.mermaPct === factory.mermaPct &&
    current.margenObjetivoRealPct === factory.margenObjetivoRealPct &&
    current.costoMaterialesManual === factory.costoMaterialesManual
  );
}

export function isPristineQuoteStudioFinancial(
  financial?: Partial<QuoteStudioFinancialDraft> | null
) {
  return isFactoryQuoteStudioFinancial(financial);
}

export function hasPendingAutomaticProfitabilityInheritance(
  financial?: Partial<QuoteStudioFinancialDraft> | null,
  profitabilityDefaults?: QuoteStudioFinancialDraft | null
) {
  if (!profitabilityDefaults) {
    return false;
  }

  const current = createQuoteStudioFinancialDraft(financial ?? undefined);
  const expected = createQuoteStudioFinancialDraft(profitabilityDefaults);

  if (current.costoMaterialesManual !== null) {
    return false;
  }

  const visibleMatchesExpected =
    current.manoObra === expected.manoObra &&
    current.traslado === expected.traslado &&
    current.otrosCostos === expected.otrosCostos &&
    current.mermaPct === expected.mermaPct &&
    current.margenObjetivoRealPct === expected.margenObjetivoRealPct;

  if (visibleMatchesExpected) {
    return current.inheritedDefaultsSnapshot === undefined;
  }

  return isFactoryQuoteStudioFinancial(current);
}

export function applyOrganizationProfitabilityDefaultsToWorkflowDraft(
  draft: CotizacionWorkflowDraft,
  profitabilityDefaults: QuoteStudioFinancialDraft
): CotizacionWorkflowDraft {
  if (
    !hasPendingAutomaticProfitabilityInheritance(
      draft.quoteStudioFinancial,
      profitabilityDefaults
    )
  ) {
    return draft;
  }

  return {
    ...draft,
    quoteStudioFinancial: createQuoteStudioFinancialDraft(profitabilityDefaults),
  };
}

export function startFreshQuoteStudioFinancialDraft(
  profitabilityDefaults?: QuoteStudioFinancialDraft | null
): QuoteStudioFinancialDraft {
  const inherited = createQuoteStudioFinancialDraft(profitabilityDefaults ?? undefined);

  return {
    ...inherited,
    costoMaterialesManual: null,
    inheritedDefaultsSnapshot: inherited.inheritedDefaultsSnapshot,
  };
}

export function startFreshQuoteWorkflowDraft(
  draft: CotizacionWorkflowDraft,
  profitabilityDefaults?: QuoteStudioFinancialDraft | null
): CotizacionWorkflowDraft {
  return {
    ...draft,
    quoteStudioFinancial: startFreshQuoteStudioFinancialDraft(profitabilityDefaults),
  };
}

export function resolveProfitabilityParametersOrigin(
  draft: QuoteStudioFinancialDraft
): ProfitabilityParametersOrigin {
  const snapshot = draft.inheritedDefaultsSnapshot;

  if (!snapshot) {
    return "customized";
  }

  const comparableFields: Array<keyof QuoteProfitabilityDefaultsSnapshot> = [
    "manoObra",
    "traslado",
    "otrosCostos",
    "mermaPct",
    "margenObjetivoRealPct",
  ];

  for (const field of comparableFields) {
    if (draft[field] !== snapshot[field]) {
      return "customized";
    }
  }

  return "organization_defaults";
}

export function restoreQuoteProfitabilityParametersToDefaults(
  draft: QuoteStudioFinancialDraft
): QuoteStudioFinancialDraft {
  const snapshot = draft.inheritedDefaultsSnapshot;

  if (!snapshot) {
    return draft;
  }

  return {
    ...draft,
    manoObra: snapshot.manoObra,
    traslado: snapshot.traslado,
    otrosCostos: snapshot.otrosCostos,
    mermaPct: snapshot.mermaPct,
    margenObjetivoRealPct: snapshot.margenObjetivoRealPct,
  };
}

export function buildProfitabilityDefaultsSummary(
  profile?: Partial<OrganizationProfile> | null
) {
  const orgDefaults = resolveOrganizationProfitabilityDefaults(profile);
  const parts: string[] = [];

  if (orgDefaults.margenObjetivoDefecto !== null) {
    parts.push(`Margen objetivo ${orgDefaults.margenObjetivoDefecto}%`);
  }

  if (orgDefaults.mermaMaterialesDefecto !== null) {
    parts.push(`Merma ${orgDefaults.mermaMaterialesDefecto}%`);
  }

  if (orgDefaults.costoManoObraDefecto !== null) {
    parts.push("MO prellenada");
  }

  if (orgDefaults.costoTrasladoDefecto !== null) {
    parts.push("Traslado prellenado");
  }

  if (orgDefaults.costoOtrosDefecto !== null) {
    parts.push("Otros prellenados");
  }

  return parts.length > 0 ? parts.join(" · ") : "Sin defaults de rentabilidad";
}

export function hasActiveQuoteProfitabilityDefaults(
  profile?: Partial<OrganizationProfile> | null
) {
  const orgDefaults = resolveOrganizationProfitabilityDefaults(profile);

  return (
    orgDefaults.margenObjetivoDefecto !== null ||
    orgDefaults.mermaMaterialesDefecto !== null ||
    orgDefaults.costoManoObraDefecto !== null ||
    orgDefaults.costoTrasladoDefecto !== null ||
    orgDefaults.costoOtrosDefecto !== null
  );
}
