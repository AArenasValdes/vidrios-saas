import { createCotizacionWorkflowDraft } from "@/features/cotizaciones/services/cotizaciones-workflow.service";

import {
  applyOrganizationProfitabilityDefaultsToWorkflowDraft,
  buildQuoteProfitabilityDefaultsFromProfile,
  hasPendingAutomaticProfitabilityInheritance,
  isPristineQuoteStudioFinancial,
  resolveProfitabilityParametersOrigin,
  restoreQuoteProfitabilityParametersToDefaults,
  startFreshQuoteWorkflowDraft,
} from "../quote-profitability-defaults.service";

describe("quote-profitability-defaults.service", () => {
  it("resuelve defaults nullable con fallback app al crear cotización", () => {
    const draft = buildQuoteProfitabilityDefaultsFromProfile({
      margenObjetivoDefecto: null,
      mermaMaterialesDefecto: null,
      costoManoObraDefecto: null,
      costoTrasladoDefecto: null,
      costoOtrosDefecto: null,
    });

    expect(draft.margenObjetivoRealPct).toBe(30);
    expect(draft.mermaPct).toBe(0);
    expect(draft.manoObra).toBe(0);
    expect(draft.costoMaterialesManual).toBeNull();
    expect(draft.inheritedDefaultsSnapshot).toEqual({
      manoObra: 0,
      traslado: 0,
      otrosCostos: 0,
      mermaPct: 0,
      margenObjetivoRealPct: 30,
    });
  });

  it("copia defaults explícitos de organización", () => {
    const draft = buildQuoteProfitabilityDefaultsFromProfile({
      margenObjetivoDefecto: 25,
      mermaMaterialesDefecto: 5,
      costoManoObraDefecto: 120000,
      costoTrasladoDefecto: 20000,
      costoOtrosDefecto: 0,
    });

    expect(draft).toMatchObject({
      margenObjetivoRealPct: 25,
      mermaPct: 5,
      manoObra: 120000,
      traslado: 20000,
      otrosCostos: 0,
    });
    expect(resolveProfitabilityParametersOrigin(draft)).toBe("organization_defaults");
  });

  it("marca personalizado cuando cambia un parámetro editable", () => {
    const draft = buildQuoteProfitabilityDefaultsFromProfile({
      costoManoObraDefecto: 50000,
    });

    expect(resolveProfitabilityParametersOrigin(draft)).toBe("organization_defaults");

    const customized = {
      ...draft,
      manoObra: 80000,
    };

    expect(resolveProfitabilityParametersOrigin(customized)).toBe("customized");
  });

  it("hereda defaults org automáticamente en cotización nueva sin pulsar restaurar", () => {
    const organizationProfile = {
      margenObjetivoDefecto: 30,
      mermaMaterialesDefecto: 5,
      costoManoObraDefecto: 30000,
      costoTrasladoDefecto: 15000,
      costoOtrosDefecto: 5000,
    };
    const profitabilityDefaults =
      buildQuoteProfitabilityDefaultsFromProfile(organizationProfile);
    const blankDraft = createCotizacionWorkflowDraft({
      validez: "15 dias",
      condicionesDePago: "50% al iniciar el trabajo , 50% al finalizar",
    });

    expect(isPristineQuoteStudioFinancial(blankDraft.quoteStudioFinancial)).toBe(true);
    expect(
      hasPendingAutomaticProfitabilityInheritance(
        blankDraft.quoteStudioFinancial,
        profitabilityDefaults
      )
    ).toBe(true);

    const hydratedDraft = applyOrganizationProfitabilityDefaultsToWorkflowDraft(
      blankDraft,
      profitabilityDefaults
    );

    expect(hydratedDraft.quoteStudioFinancial).toMatchObject({
      margenObjetivoRealPct: 30,
      mermaPct: 5,
      manoObra: 30000,
      traslado: 15000,
      otrosCostos: 5000,
    });
    expect(hydratedDraft.quoteStudioFinancial?.inheritedDefaultsSnapshot).toEqual({
      margenObjetivoRealPct: 30,
      mermaPct: 5,
      manoObra: 30000,
      traslado: 15000,
      otrosCostos: 5000,
    });
    expect(resolveProfitabilityParametersOrigin(hydratedDraft.quoteStudioFinancial!)).toBe(
      "organization_defaults"
    );
    expect(
      applyOrganizationProfitabilityDefaultsToWorkflowDraft(
        hydratedDraft,
        profitabilityDefaults
      )
    ).toBe(hydratedDraft);
  });

  it("completa snapshot en un draft persistido de fábrica sin pisar un override manual", () => {
    const profitabilityDefaults = buildQuoteProfitabilityDefaultsFromProfile({
      margenObjetivoDefecto: 30,
      mermaMaterialesDefecto: 5,
      costoManoObraDefecto: 30000,
      costoTrasladoDefecto: 15000,
      costoOtrosDefecto: 5000,
    });
    const persistedFactoryDraft = {
      ...createCotizacionWorkflowDraft(),
      quoteStudioFinancial: {
        manoObra: 0,
        traslado: 0,
        otrosCostos: 0,
        mermaPct: 0,
        margenObjetivoRealPct: 30,
        costoMaterialesManual: null,
        inheritedDefaultsSnapshot: profitabilityDefaults.inheritedDefaultsSnapshot,
      },
    };

    const hydratedPersisted = applyOrganizationProfitabilityDefaultsToWorkflowDraft(
      persistedFactoryDraft,
      profitabilityDefaults
    );

    expect(hydratedPersisted.quoteStudioFinancial).toMatchObject({
      margenObjetivoRealPct: 30,
      mermaPct: 5,
      manoObra: 30000,
      traslado: 15000,
      otrosCostos: 5000,
    });

    const persistedManualDraft = {
      ...createCotizacionWorkflowDraft(),
      quoteStudioFinancial: {
        ...profitabilityDefaults,
        costoMaterialesManual: 100000,
        inheritedDefaultsSnapshot: profitabilityDefaults.inheritedDefaultsSnapshot,
      },
    };

    expect(
      applyOrganizationProfitabilityDefaultsToWorkflowDraft(
        persistedManualDraft,
        profitabilityDefaults
      )
    ).toBe(persistedManualDraft);
  });

  it("no pisa rentabilidad si el usuario ya editó mano de obra", () => {
    const profitabilityDefaults = buildQuoteProfitabilityDefaultsFromProfile({
      costoManoObraDefecto: 30000,
    });
    const customizedDraft = applyOrganizationProfitabilityDefaultsToWorkflowDraft(
      createCotizacionWorkflowDraft(),
      profitabilityDefaults
    );
    const userEditedDraft = {
      ...customizedDraft,
      quoteStudioFinancial: {
        ...customizedDraft.quoteStudioFinancial!,
        manoObra: 45000,
      },
    };

    const result = applyOrganizationProfitabilityDefaultsToWorkflowDraft(
      userEditedDraft,
      buildQuoteProfitabilityDefaultsFromProfile({
        costoManoObraDefecto: 99999,
      })
    );

    expect(result.quoteStudioFinancial?.manoObra).toBe(45000);
  });

  it("al iniciar explícitamente una nueva cotización limpia costoMaterialesManual y conserva defaults org", () => {
    const profitabilityDefaults = buildQuoteProfitabilityDefaultsFromProfile({
      margenObjetivoDefecto: 30,
      mermaMaterialesDefecto: 5,
      costoManoObraDefecto: 30000,
      costoTrasladoDefecto: 15000,
      costoOtrosDefecto: 5000,
    });
    const previousDraft = {
      ...createCotizacionWorkflowDraft(),
      quoteStudioFinancial: {
        ...profitabilityDefaults,
        costoMaterialesManual: 100000,
      },
    };

    const freshDraft = startFreshQuoteWorkflowDraft(previousDraft, profitabilityDefaults);

    expect(freshDraft.quoteStudioFinancial).toMatchObject({
      costoMaterialesManual: null,
      manoObra: 30000,
      traslado: 15000,
      otrosCostos: 5000,
      mermaPct: 5,
      margenObjetivoRealPct: 30,
    });
    expect(
      applyOrganizationProfitabilityDefaultsToWorkflowDraft(
        previousDraft,
        profitabilityDefaults
      )
    ).toBe(previousDraft);
  });

  it("restaura solo parámetros editables sin tocar materiales manual", () => {
    const draft = buildQuoteProfitabilityDefaultsFromProfile({
      costoManoObraDefecto: 50000,
      mermaMaterialesDefecto: 4,
    });
    const customized = {
      ...draft,
      manoObra: 90000,
      mermaPct: 10,
      costoMaterialesManual: 250000,
    };

    const restored = restoreQuoteProfitabilityParametersToDefaults(customized);

    expect(restored.manoObra).toBe(50000);
    expect(restored.mermaPct).toBe(4);
    expect(restored.costoMaterialesManual).toBe(250000);
    expect(resolveProfitabilityParametersOrigin(restored)).toBe("organization_defaults");
  });
});
