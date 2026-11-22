import { buildAllSodalL25Recipes } from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { parseSodalL25VariantSlug } from "@/features/fabricacion/fixtures/sodal-l25-zeta-catalog";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { SERIE_45_CATALOG_KEY } from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import {
  SERIE_4800_CATALOG_KEY,
  SERIE_4800_VARIANT_NORMAL,
} from "@/features/fabricacion/fixtures/serie-4800-corredera-recipe";
import { buildFabricationQuoteSummary } from "@/features/cotizaciones/line-templates/types/fabrication-quote-summary";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import { resolveMobileComponentFabricacionSummary } from "@/features/fabricacion/services/mobile-component-fabricacion-summary.service";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";

function buildWorkflowItem(input: {
  id?: string;
  lineTemplateId?: string;
  catalogKey: string;
  lineName: string;
  componentType?: string;
  system: string;
  typology: string;
  leaves: number;
  modules?: number;
  variant?: string | null;
  configurationId?: string | null;
  glass?: string;
  widthMm?: number;
  heightMm?: number;
  fabricacionSnapshot?: CotizacionWorkflowItem["fabricacionSnapshot"];
  extraMeta?: Partial<Parameters<typeof encodeCotizacionItemPresentationMeta>[0]>;
}): CotizacionWorkflowItem {
  const widthMm = input.widthMm ?? 1200;
  const heightMm = input.heightMm ?? 1000;
  return {
    id: input.id ?? `item-${input.catalogKey}`,
    codigo: "V1",
    tipo: input.componentType ?? "Ventana",
    lineaComercial: input.lineName,
    vidrio: input.glass ?? "Incoloro monolítico 4 mm",
    nombre: input.componentType ?? "Ventana",
    descripcion: `${input.lineName} de prueba`,
    ancho: widthMm,
    alto: heightMm,
    cantidad: 1,
    unidad: "unidad",
    precioUnitario: 120000,
    precioTotal: 120000,
    subtotal: 120000,
    areaM2: (widthMm * heightMm) / 1_000_000,
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: input.lineTemplateId ?? "101",
      catalogLineKey: input.catalogKey,
      sistema: input.system,
      fabricacionTipologia: input.typology,
      fabricacionHojas: input.leaves,
      fabricacionModulos: input.modules ?? input.leaves,
      fabricacionVariante: input.variant ?? undefined,
      fabricacionConfiguracionId: input.configurationId ?? undefined,
      ...input.extraMeta,
    }),
    tipoItem: "componente",
    fabricacionSnapshot: input.fabricacionSnapshot ?? null,
  };
}

describe("B-06 — estados preliminares reales vs validación de taller", () => {
  const testingCatalogCases = [
    {
      label: "L15",
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
      glass: "Incoloro monolítico 4 mm",
      expectedRecipeIdPrefix: "ventora:universal:l15:",
    },
    {
      label: "L4000",
      catalogKey: "ventora:serie-4000-corredera-2h",
      lineName: "Línea 4000",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
      glass: "Incoloro monolítico 4 mm",
      expectedRecipeIdPrefix: "ventora:universal:l4000:",
    },
    {
      label: "S28",
      catalogKey: "ventora:optima-s28-corredera-2h",
      lineName: "Óptima S-28",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 1,
      glass: "Termopanel 4+12+4",
      expectedRecipeIdPrefix: "ventora:universal:optima-s28-corredera-2h:",
    },
    {
      label: "S33",
      catalogKey: "ventora:s33-corredera-2h",
      lineName: "S33",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 1,
      glass: "Incoloro monolítico 4 mm",
      expectedRecipeIdPrefix: "ventora:universal:s33:",
    },
    {
      label: "L45",
      catalogKey: SERIE_45_CATALOG_KEY,
      lineName: "Línea 45 — Puerta",
      componentType: "Puerta",
      system: "Abatible",
      typology: "puerta_abatible",
      leaves: 1,
      modules: 1,
      glass: "Incoloro monolítico 5 mm",
      expectedRecipeIdPrefix: "ventora:universal:l45:",
    },
    {
      label: "L4800",
      catalogKey: SERIE_4800_CATALOG_KEY,
      lineName: "Serie 4800 — Corredera 2 hojas",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
      variant: SERIE_4800_VARIANT_NORMAL,
      glass: "Float incoloro 5 mm",
      expectedRecipeIdPrefix: "ventora:documental:serie-4800:",
    },
  ] as const;

  it.each(testingCatalogCases)(
    "$label en testing conserva despiece disponible para revisión pero permanece preliminary: true",
    (testCase) => {
      const item = buildWorkflowItem(testCase);

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.barsAvailable).toBe(true);
      expect(resolved.preliminary).toBe(true);
      expect(resolved.recipe?.id.startsWith(testCase.expectedRecipeIdPrefix)).toBe(true);
      expect(resolved.recipe?.status).toBe("testing");
      expect(resolved.formal?.recipeStatus).toBe("testing");
      expect(resolved.formal?.pauta.length).toBeGreaterThan(0);
      expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
      expect(resolved.message).toBeTruthy();

      const mobileSummary = resolveMobileComponentFabricacionSummary(item, {
        recipes: [],
        organizationId: 1,
      });
      expect(mobileSummary.status).toBe("preliminary");
      expect(mobileSummary.statusLabel).toBe("Despiece disponible");
      expect(mobileSummary.canOpenDespiece).toBe(true);
      expect(mobileSummary.canOpenPauta).toBe(true);

      const quoteSummary = buildFabricationQuoteSummary([item], {
        recipes: [],
        organizationId: 1,
      });
      expect(quoteSummary.items).toHaveLength(1);
      expect(quoteSummary.items[0]?.operationalStatus).toBe("unvalidated");
      expect(quoteSummary.items[0]?.statusLabel).not.toBe("Validada");
    }
  );

  it("mantiene preliminary: true para recetas universales en estado draft", () => {
    const universalTesting = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Línea 15",
      variant: null,
      leavesCount: 2,
      recipes: [],
    })!;

    const universalDraft: FabricationRecipeRecord = {
      ...universalTesting,
      status: "draft",
      definition: {
        ...universalTesting.definition,
        estado: "lista_para_validar",
        permitirCalculoPreliminarConPendientes: true,
      },
    };

    const item = buildWorkflowItem({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [universalDraft],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.preliminary).toBe(true);
    expect(resolved.recipe?.id).toBe(universalDraft.id);
    expect(resolved.recipe?.status).toBe("draft");
  });

  it("receta privada taller:personalizada:* en testing/draft es preliminary: true y en validated pasa a preliminary: false con precedencia sobre el fallback universal", () => {
    const canonicalL20 = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l20",
      lineTemplateId: 101,
      organizationId: 1,
      lineName: "Serie 20",
      variant: "pierna_abierta_jamba_2009",
      leavesCount: 2,
      recipes: [],
    })!;

    const item = buildWorkflowItem({
      catalogKey: "ventora:l20",
      lineName: "L20",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
      variant: "pierna_abierta_jamba_2009",
    });

    const customizedDefinition = {
      ...canonicalL20.definition,
      perfiles: canonicalL20.definition.perfiles.map((profile, index) =>
        index === 0
          ? {
              ...profile,
              reglaMedida: {
                ...profile.reglaMedida,
                ajusteMm: (profile.reglaMedida.ajusteMm ?? 0) - 12,
              },
            }
          : profile
      ),
    };

    const customTesting: FabricationRecipeRecord = {
      ...canonicalL20,
      id: "org-1-l20-custom-testing",
      scope: "organization",
      organizationId: 1,
      status: "testing",
      sourceType: "manual",
      sourceReference: "taller:personalizada:l20-custom",
      validatedAt: null,
      validatedBy: null,
      definition: {
        ...customizedDefinition,
        estado: "lista_para_validar",
      },
    };

    const resolvedTesting = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [customTesting],
      organizationId: 1,
    });
    expect(resolvedTesting.estado).toBe("calculado");
    expect(resolvedTesting.barsAvailable).toBe(true);
    expect(resolvedTesting.preliminary).toBe(true);
    expect(resolvedTesting.recipe?.id).toBe("org-1-l20-custom-testing");
    expect(resolvedTesting.message).toBe(
      "Despiece disponible. La receta aún requiere validación del taller."
    );
    expect(
      resolveMobileComponentFabricacionSummary(item, {
        recipes: [customTesting],
        organizationId: 1,
      })
    ).toMatchObject({
      status: "preliminary",
      statusLabel: "Despiece disponible",
    });

    const customDraft: FabricationRecipeRecord = {
      ...customTesting,
      id: "org-1-l20-custom-draft",
      status: "draft",
      definition: {
        ...customizedDefinition,
        estado: "lista_para_validar",
        permitirCalculoPreliminarConPendientes: true,
      },
    };

    const resolvedDraft = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [customDraft],
      organizationId: 1,
    });
    expect(resolvedDraft.estado).toBe("calculado");
    expect(resolvedDraft.barsAvailable).toBe(true);
    expect(resolvedDraft.preliminary).toBe(true);
    expect(resolvedDraft.recipe?.id).toBe("org-1-l20-custom-draft");

    const customValidated: FabricationRecipeRecord = {
      ...customTesting,
      id: "org-1-l20-custom-validated",
      status: "validated",
      validatedAt: "2026-10-20T00:00:00.000Z",
      validatedBy: "taller@ventora.cl",
      definition: {
        ...customizedDefinition,
        estado: "validada",
      },
    };

    const resolvedValidated = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [customValidated],
      organizationId: 1,
    });
    expect(resolvedValidated.estado).toBe("calculado");
    expect(resolvedValidated.barsAvailable).toBe(true);
    expect(resolvedValidated.preliminary).toBe(false);
    expect(resolvedValidated.recipe?.id).toBe("org-1-l20-custom-validated");
    expect(resolvedValidated.message).toBeNull();

    const validatedItem = {
      ...item,
      fabricacionSnapshot: resolvedValidated.formal,
    };
    expect(
      resolveMobileComponentFabricacionSummary(validatedItem, {
        recipes: [customValidated],
        organizationId: 1,
      })
    ).toMatchObject({
      status: "ready",
      statusLabel: "Fabricación lista",
    });
    expect(
      buildFabricationQuoteSummary([validatedItem], {
        recipes: [customValidated],
        organizationId: 1,
      }).items[0]
    ).toMatchObject({
      operationalStatus: "ready",
      statusLabel: "Validada",
    });
  });

  it("preserva preliminary: false en recetas confirmadas por el titular (L5000, L20, L12, L32, L42)", () => {
    const confirmedCases = [
      {
        catalogKey: "ventora:l5000",
        lineName: "L5000",
        system: "Corredera",
        typology: "corredera",
        leaves: 2,
        modules: 2,
        variant: "caracol",
      },
      {
        catalogKey: "ventora:l20",
        lineName: "L20",
        system: "Corredera",
        typology: "corredera",
        leaves: 2,
        modules: 2,
        variant: "pierna_abierta_jamba_2009",
      },
      {
        catalogKey: "ventora:serie-12-shower-corredera",
        lineName: "L12",
        componentType: "Puerta",
        system: "Shower",
        typology: "shower",
        leaves: 2,
        modules: 1,
        variant: null,
      },
      {
        catalogKey: "ventora:l32",
        lineName: "L32",
        system: "Proyectante",
        typology: "proyectante",
        leaves: 1,
        modules: 1,
        variant: "normal",
        configurationId: "ventora:l32:proyectante",
      },
      {
        catalogKey: "ventora:l42",
        lineName: "L42",
        system: "Proyectante",
        typology: "proyectante",
        leaves: 1,
        modules: 1,
        variant: "normal",
        configurationId: "ventora:l42:proyectante",
      },
    ];

    for (const confirmed of confirmedCases) {
      const resolved = resolveFabricacionDespieceForQuoteItem({
        item: buildWorkflowItem(confirmed),
        recipes: [],
        organizationId: 1,
      });
      expect(resolved.estado).toBe("calculado");
      expect(resolved.barsAvailable).toBe(true);
      expect(resolved.preliminary).toBe(false);
      expect(resolved.recipe?.status).toBe("validated");
      expect(resolved.formal?.recipeStatus).toBe("validated");
    }
  });

  it("restringe la excepción L25 exclusivamente a recetas Zeta reconocidas (privada testing/draft vs privada validated vs Zeta)", () => {
    const bundles = buildAllSodalL25Recipes();
    const zeta2h = bundles.find(
      (candidate) => candidate.recipeId === "monolitico_pierna_abierta_2h_1800x1500"
    )!;
    const zeta3h = bundles.find(
      (candidate) => candidate.recipeId === "dvh_pierna_abierta_3h_3000x1500"
    )!;

    const buildL25Item = (bundle: typeof zeta2h) => {
      const config = parseSodalL25VariantSlug(bundle.identity.variantSlug);
      return buildWorkflowItem({
        catalogKey: "ventora:l25",
        lineName: "L25",
        system: "Corredera",
        typology: "corredera",
        leaves: bundle.identity.leaves,
        modules: bundle.identity.leaves,
        variant: bundle.identity.variantSlug,
        glass:
          config?.glazing === "dvh"
            ? "Termopanel 4+12+4"
            : "Incoloro monolítico 4 mm",
        widthMm: bundle.confirmed.testDimensions.widthMm,
        heightMm: bundle.confirmed.testDimensions.heightMm,
        extraMeta: {
          fabricacionGlazing: config?.glazing,
          fabricacionLeg: config?.leg,
          fabricacionReinforcement: config?.reinforcement,
        },
      });
    };

    const baseL25Record = (
      bundle: typeof zeta2h,
      overrides: Partial<FabricationRecipeRecord> = {}
    ): FabricationRecipeRecord => ({
      id: bundle.recipeId,
      organizationId: 1,
      lineTemplateId: 101,
      scope: "organization",
      providerName: "SODAL",
      lineName: "L25",
      typology: bundle.definition.identidad.tipologia,
      leavesCount: bundle.identity.leaves,
      variant: bundle.identity.variantSlug,
      version: 1,
      status: "testing",
      definition: bundle.definition,
      sourceType: "manufacturer",
      sourceReference: bundle.sourceReference,
      sourceName: "SODAL",
      sourceRevision: SODAL_L25_FORMULA_VERSION,
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-10-07T00:00:00.000Z",
      updatedAt: "2026-10-07T00:00:00.000Z",
      eliminadoEn: null,
      ...overrides,
    });

    const l25Item2h = buildL25Item(zeta2h);

    const completeWorkshopL25Definition = {
      ...zeta2h.definition,
      estado: "lista_para_validar" as const,
      datosPendientes: undefined,
      perfiles: zeta2h.definition.perfiles.map((profile) => ({
        ...profile,
        datosPendientes: undefined,
      })),
    };

    // 1. L25 privada en testing -> calcula, pero NO aparece validada (preliminary: true)
    const privateTesting = baseL25Record(zeta2h, {
      id: "org-1-l25-custom-testing",
      scope: "organization",
      organizationId: 1,
      status: "testing",
      sourceType: "manual",
      sourceReference: "taller:personalizada:l25-custom",
      sourceRevision: null,
      definition: completeWorkshopL25Definition,
    });
    const resolvedPrivateTesting = resolveFabricacionDespieceForQuoteItem({
      item: l25Item2h,
      recipes: [privateTesting],
      organizationId: 1,
    });
    expect(resolvedPrivateTesting.estado).toBe("calculado");
    expect(resolvedPrivateTesting.barsAvailable).toBe(true);
    expect(resolvedPrivateTesting.preliminary).toBe(true);
    expect(resolvedPrivateTesting.recipe?.id).toBe("org-1-l25-custom-testing");
    expect(resolvedPrivateTesting.message).toBe(
      "Despiece disponible. La receta aún requiere validación del taller."
    );

    // 2. L25 en draft (slot genérico o borrador) -> NO aparece validada (preliminary: true)
    const genericDraft = baseL25Record(zeta2h, {
      id: "org-1-l25-generic-draft",
      scope: "organization",
      organizationId: 1,
      status: "draft",
      sourceType: "manual",
      sourceReference: "base-ventora:corredera:2",
      sourceRevision: null,
      definition: {
        ...completeWorkshopL25Definition,
        permitirCalculoPreliminarConPendientes: true,
      },
    });
    const resolvedGenericDraft = resolveFabricacionDespieceForQuoteItem({
      item: l25Item2h,
      recipes: [genericDraft],
      organizationId: 1,
    });
    expect(resolvedGenericDraft.estado).toBe("calculado");
    expect(resolvedGenericDraft.preliminary).toBe(true);
    expect(resolvedGenericDraft.recipe?.id).toBe("org-1-l25-generic-draft");

    const zetaDraft = baseL25Record(zeta2h, {
      id: "org-1-l25-zeta-draft",
      status: "draft",
      definition: {
        ...zeta2h.definition,
        estado: "lista_para_validar",
        permitirCalculoPreliminarConPendientes: true,
      },
    });
    const resolvedZetaDraft = resolveFabricacionDespieceForQuoteItem({
      item: l25Item2h,
      recipes: [zetaDraft],
      organizationId: 1,
    });
    expect(resolvedZetaDraft.estado).toBe("calculado");
    expect(resolvedZetaDraft.preliminary).toBe(true);

    // 3. L25 privada validated -> preliminary: false
    const privateValidated = baseL25Record(zeta2h, {
      id: "org-1-l25-custom-validated",
      scope: "organization",
      organizationId: 1,
      status: "validated",
      sourceType: "manual",
      sourceReference: "taller:personalizada:l25-custom",
      sourceRevision: null,
      validatedAt: "2026-10-20T00:00:00.000Z",
      validatedBy: "taller@ventora.cl",
      definition: {
        ...completeWorkshopL25Definition,
        estado: "validada",
      },
    });
    const resolvedPrivateValidated = resolveFabricacionDespieceForQuoteItem({
      item: l25Item2h,
      recipes: [privateValidated],
      organizationId: 1,
    });
    expect(resolvedPrivateValidated.estado).toBe("calculado");
    expect(resolvedPrivateValidated.barsAvailable).toBe(true);
    expect(resolvedPrivateValidated.preliminary).toBe(false);
    expect(resolvedPrivateValidated.recipe?.id).toBe("org-1-l25-custom-validated");
    expect(resolvedPrivateValidated.message).toBeNull();

    // 4. L25 Zeta confirmada (zeta:confirmed:sodal/l25/...) -> conserva semántica operativa vigente
    for (const bundle of [zeta2h, zeta3h]) {
      const zetaRecord = baseL25Record(bundle, {
        scope: "ventora",
        organizationId: null,
      });
      const resolvedZeta = resolveFabricacionDespieceForQuoteItem({
        item: buildL25Item(bundle),
        recipes: [zetaRecord],
        organizationId: 1,
      });
      expect(resolvedZeta.estado).toBe("calculado");
      expect(resolvedZeta.barsAvailable).toBe(true);
      expect(resolvedZeta.preliminary).toBe(false);
      expect(resolvedZeta.recipe?.id).toBe(bundle.recipeId);
      expect(resolvedZeta.recipe?.status).toBe("testing");
      expect(resolvedZeta.recipe?.sourceReference).toBe(bundle.sourceReference);
    }
  });

  it("preserva snapshots históricos congelados sin recalcular ni sobreescribir su recipeStatus", () => {
    const l15Item = buildWorkflowItem({
      catalogKey: "ventora:serie-15-corredera-2h",
      lineName: "Línea 15",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
    });
    const testingResolved = resolveFabricacionDespieceForQuoteItem({
      item: l15Item,
      recipes: [],
      organizationId: 1,
    });
    expect(testingResolved.formal?.recipeStatus).toBe("testing");

    const frozenTestingItem: CotizacionWorkflowItem = {
      ...l15Item,
      fabricacionSnapshot: testingResolved.formal,
    };
    const rehydratedTesting = resolveFabricacionDespieceForQuoteItem({
      item: frozenTestingItem,
      recipes: [],
      organizationId: 1,
    });
    expect(rehydratedTesting.formal?.recipeId).toBe(testingResolved.formal?.recipeId);
    expect(rehydratedTesting.formal?.recipeStatus).toBe("testing");
    expect(rehydratedTesting.cubication?.cuts.length).toBeGreaterThan(0);
    expect(rehydratedTesting.barsAvailable).toBe(true);

    const summary = buildFabricationQuoteSummary([frozenTestingItem], {
      recipes: [],
      organizationId: 1,
      allowLiveFormal: false,
    });
    expect(summary.items[0]?.operationalStatus).toBe("unvalidated");
    expect(summary.items[0]?.statusLabel).toBe("En prueba");

    const l20Validated = resolveFabricacionDespieceForQuoteItem({
      item: buildWorkflowItem({
        catalogKey: "ventora:l20",
        lineName: "L20",
        system: "Corredera",
        typology: "corredera",
        leaves: 2,
        modules: 2,
        variant: "pierna_abierta_jamba_2009",
      }),
      recipes: [],
      organizationId: 1,
    });
    const frozenValidatedItem = buildWorkflowItem({
      id: "item-frozen-validated",
      catalogKey: "ventora:linea-historica",
      lineName: "Línea histórica",
      system: "Corredera",
      typology: "corredera",
      leaves: 2,
      modules: 2,
      fabricacionSnapshot: l20Validated.formal,
    });
    const rehydratedValidated = resolveFabricacionDespieceForQuoteItem({
      item: frozenValidatedItem,
      recipes: [],
      organizationId: 1,
    });
    expect(rehydratedValidated.formal).toBe(l20Validated.formal);
    expect(rehydratedValidated.formal?.recipeStatus).toBe("validated");
    expect(rehydratedValidated.barsAvailable).toBe(true);
    expect(
      buildFabricationQuoteSummary([frozenValidatedItem], {
        recipes: [],
        organizationId: 1,
        allowLiveFormal: false,
      }).items[0]
    ).toMatchObject({
      operationalStatus: "ready",
      statusLabel: "Validada",
    });
  });
});
