import {
  LINE_15_VARIANT_3H_3RIELES,
  crearRecetaLine15Corredera,
} from "@/features/fabricacion/fixtures/line-15-corredera-recipe";
import { fabricacionRecetaSchema } from "@/features/fabricacion/schemas/fabricacion-schemas";
import { encodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import {
  crearRecetaPlantillaVentoraCorredera2H,
  crearRecetaReferenciaL5000Corredera2H,
  type PlantillaVentoraCorrederaId,
} from "@/features/fabricacion/fixtures/bases-tipologicas-ventora";
import { crearRecetaPlantillaVentoraProyectante } from "@/features/fabricacion/fixtures/plantillas-ventora-proyectante";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  anyQuoteItemCanOpenDespiecePreview,
  anyQuoteItemHasFabricationReview,
  buildQuoteDespiecePreviewEligibility,
  buildQuoteFabricationReviewEligibility,
  canOpenDespiecePreviewForQuoteItem,
  findFirstQuoteItemWithDespiecePreview,
  isQuoteItemFabricationReviewEligible,
  resolveAperturaForRecipeMatch,
  resolveFabricacionDespieceForQuoteItem,
} from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import {
  SERIE_45_FIXTURE_1500X2000,
  crearRecetaSerie45Practicable,
} from "@/features/fabricacion/fixtures/serie-45-practicable-recipe";
import {
  buildAllSodalL25Recipes,
  resetSodalL25RecipeCacheForTests,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { resetZetaConfirmedCacheForTests } from "@/features/fabricacion/zeta/zeta-confirmed-loader";
import { resetEvidenceSidecarCacheForTests } from "@/features/fabricacion/zeta/zeta-evidence-sidecar-loader";
import { SODAL_L25_FORMULA_VERSION } from "@/features/fabricacion/zeta/sodal-l25-profile-roles";
import { construirSnapshotFabricacionCotizacion } from "@/features/fabricacion/services/fabricacion-cotizacion-snapshot.service";
import {
  crearRecetaWinHouseS60Candidata,
  WINHOUSE_S60_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-s60-recipes";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_20MM,
  VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_24MM,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
  VERATEC_7400_VARIANT_TERMOPANEL_20MM,
  VERATEC_7400_VARIANT_TERMOPANEL_24MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import { resolveMobileComponentFabricacionSummary } from "@/features/fabricacion/services/mobile-component-fabricacion-summary.service";
import { construirFabricacionTrabajoSnapshot } from "@/features/fabricacion/services/fabricacion-trabajo-snapshot.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

function recipeRecord(
  overrides: Partial<FabricationRecipeRecord> = {},
  plantillaId?: PlantillaVentoraCorrederaId
): FabricationRecipeRecord {
  let nextId = 0;
  const definition =
    overrides.definition ??
    (plantillaId
      ? crearRecetaPlantillaVentoraCorredera2H(plantillaId, {
          createId: () => `${plantillaId.toLowerCase()}-quote-${nextId++}`,
        })
      : crearRecetaReferenciaL5000Corredera2H({
          createId: () => `l5000-quote-${nextId++}`,
        }));
  return {
    id: overrides.id ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: overrides.organizationId ?? 1,
    lineTemplateId: overrides.lineTemplateId ?? 135,
    scope: overrides.scope ?? "organization",
    providerName: overrides.providerName ?? "Ventora",
    lineName: overrides.lineName ?? plantillaId ?? "L5000",
    typology: overrides.typology ?? "corredera",
    leavesCount: overrides.leavesCount ?? 2,
    variant: overrides.variant ?? "estandar",
    version: overrides.version ?? 1,
    status: overrides.status ?? "validated",
    definition,
    sourceType: overrides.sourceType ?? "manual",
    sourceReference: overrides.sourceReference ?? null,
    sourceName: overrides.sourceName ?? null,
    sourceRevision: overrides.sourceRevision ?? null,
    parentRecipeId: overrides.parentRecipeId ?? null,
    validatedAt: overrides.validatedAt ?? null,
    validatedBy: overrides.validatedBy ?? null,
    createdAt: overrides.createdAt ?? "2026-08-10T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-10T00:00:00.000Z",
    eliminadoEn: overrides.eliminadoEn ?? null,
  };
}

function quoteItem(input: {
  lineTemplateId?: string;
  cantidad?: number;
  withLine?: boolean;
  id?: string;
  codigo?: string;
  ancho?: number;
  alto?: number;
}): CotizacionWorkflowItem {
  return {
    id: input.id ?? "item-1",
    codigo: input.codigo ?? "V1",
    tipo: "Ventana",
    lineaComercial: "L5000",
    vidrio: "4mm",
    nombre: "Ventana corredera",
    descripcion: "2 hojas",
    ancho: input.ancho ?? 1200,
    alto: input.alto ?? 1000,
    cantidad: input.cantidad ?? 1,
    unidad: "unidad",
    areaM2: 1.2,
    costoProveedorUnitario: 0,
    costoProveedorTotal: 0,
    margenPct: 0,
    precioUnitario: 100000,
    precioTotal: 100000,
    precioPorM2: null,
    minimoCobrable: null,
    redondeoPrecio: null,
    precioPlantillaSugerido: null,
    precioAjustadoManual: false,
    origenPrecio: "manual",
    observaciones: encodeCotizacionItemPresentationMeta({
      lineTemplateId: input.withLine === false ? "" : input.lineTemplateId ?? "135",
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricacionVariante: "estandar",
    }),
  };
}

describe("despiece cotización ← motor fabricación (fuente única)", () => {
  it("CASO 1: L5000 1200×1000 ×1 → 10.714 mm y 12 cortes", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
    expect(
      resolved.formal?.result.perfiles.map((row) => [
        row.funcion,
        row.medidaMm,
        row.cantidadPiezas,
      ])
    ).toEqual([
      ["Riel superior", 1200, 1],
      ["Riel inferior", 1200, 1],
      ["Jamba", 997, 2],
      ["Zócalo", 598, 2],
      ["Cabezal", 598, 2],
      ["Pierna", 982, 2],
      ["Traslapo", 982, 2],
    ]);
    expect(
      resolved.cubication?.cuts.some((cut) =>
        /Hoja vertical|Hoja horizontal|Junquillo/i.test(cut.functionLabel)
      )
    ).toBe(false);
  });

  it("CASO 2: dos piezas → consolidado 21.428 mm", () => {
    const one = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ cantidad: 1 }),
      recipes: [recipeRecord()],
      organizationId: 1,
    });
    const two = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ cantidad: 2 }),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(one.formal?.result.totalLinealMm).toBe(10714);
    expect(two.formal?.result.totalLinealMm).toBe(21428);
    expect(
      two.formal?.result.perfiles.find((row) => row.funcion === "Jamba")
    ).toMatchObject({ medidaMm: 997, cantidadPiezas: 4, totalLinealMm: 3988 });
  });

  it("CASO 3: línea sin receta → sin despiece inventado", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "999" }),
      recipes: [recipeRecord({ lineTemplateId: 135 })],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("sin_receta");
    expect(resolved.formal).toBeNull();
    expect(resolved.cubication).toBeNull();
    expect(resolved.message).toMatch(/no configurada/i);
  });

  it("resuelve Veratec mono 4 mm por vidrio elegido y congela recipeId explícito", () => {
    const variants = [
      [
        VERATEC_7400_VARIANT_MONOLITICO_4MM,
        VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      ],
      [
        VERATEC_7400_VARIANT_TERMOPANEL_20MM,
        VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_20MM,
      ],
      [
        VERATEC_7400_VARIANT_TERMOPANEL_24MM,
        VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_24MM,
      ],
    ] as const;
    let componentSequence = 0;
    const recipes = variants.map(([variant, sourceReference]) => {
      const definition = crearRecetaVeratec7400Corredera({
        lineName: "Veratec 7400",
        variant,
        createId: () => `definition-${variant}-${componentSequence++}`,
      });
      return recipeRecord({
        id: `recipe-${variant}`,
        organizationId: 1,
        lineTemplateId: 1396,
        providerName: "VERATEC",
        lineName: "Veratec 7400",
        typology: "corredera",
        leavesCount: 2,
        variant,
        status: "draft",
        definition,
        sourceType: "manufacturer",
        sourceName: "VERATEC",
        sourceReference,
        sourceRevision: VERATEC_7400_SOURCE_REVISION,
      });
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "1396" }),
      lineaComercial: "Veratec 7400",
      vidrio: "Incoloro monolítico 4 mm",
      ancho: 1200,
      alto: 1500,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "2 móviles",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes,
      organizationId: 1,
      supplierFamilyKey: "veratec:sliding-7400",
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.recipe?.id).toBe(`recipe-${VERATEC_7400_VARIANT_MONOLITICO_4MM}`);
    expect(resolved.formal?.recipeId).toBe(`recipe-${VERATEC_7400_VARIANT_MONOLITICO_4MM}`);
    expect(resolved.formal?.selectedVariant).toBe(VERATEC_7400_VARIANT_MONOLITICO_4MM);
    expect(resolved.formal?.result.calculable).toBe(true);
    expect(resolved.formal?.result.perfiles).toHaveLength(12);
    expect(resolved.formal?.result.perfiles.find((profile) => profile.codigoPerfil === "6306"))
      .toMatchObject({ medidaMm: 452, cantidadPiezas: 4 });
    expect(resolved.formal?.result.vidrios[0]).toMatchObject({
      anchoMm: 442,
      altoMm: 1323,
      cantidadPiezas: 2,
    });
    expect(resolved.formal?.pautaBarras?.barras.length).toBeGreaterThan(0);
    expect(resolved.formal?.recipeStatus).toBe("draft");
    expect(resolved.formal?.supplierFamilyKey).toBe("veratec:sliding-7400");

    const withoutExplicitGlazing = resolveFabricacionDespieceForQuoteItem({
      item: { ...item, vidrio: "" },
      recipes,
      organizationId: 1,
    });
    expect(withoutExplicitGlazing.estado).toBe("multiples_recetas");
    expect(withoutExplicitGlazing.recipe).toBeNull();
  });

  it("Veratec 7400 1000×1000: una cantidad 2 y dos partidas separadas terminan en la misma pauta conjunta", () => {
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: (() => { let id = 0; return () => `shared-packing-${id++}`; })(),
    });
    const recipe = recipeRecord({
      id: "recipe-veratec-7400-real-1000",
      organizationId: 1,
      lineTemplateId: 1396,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
    });
    const resolveItem = (input: { id: string; codigo: string; cantidad: number }) => {
      const item: CotizacionWorkflowItem = {
        ...quoteItem({ lineTemplateId: "1396", ancho: 1000, alto: 1000, ...input }),
        lineaComercial: "Veratec 7400",
        vidrio: "Incoloro monolítico 4 mm",
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "1396",
          catalogLineKey: VERATEC_7400_CATALOG_KEY,
          colorHex: "#ffffff",
          sistema: "Corredera",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
        }),
      };
      const result = resolveFabricacionDespieceForQuoteItem({ item, recipes: [recipe], organizationId: 1 });
      expect(result.estado).toBe("calculado");
      expect(result.formal?.recipeId).toBe(recipe.id);
      return { item, result };
    };
    const asWorkItem = (resolved: ReturnType<typeof resolveItem>) => ({
      id: resolved.item.id,
      codigo: resolved.item.codigo,
      nombre: resolved.item.nombre,
      lineaComercial: resolved.item.lineaComercial,
      colorHex: "#ffffff",
      catalogLineKey: VERATEC_7400_CATALOG_KEY,
      snapshot: resolved.result.formal,
    });

    const oneWindow = resolveItem({ id: "item-v1", codigo: "V1", cantidad: 1 });
    const twoWindowsOneItem = resolveItem({ id: "item-v1", codigo: "V1", cantidad: 2 });
    const twoSeparateWindows = [
      oneWindow,
      resolveItem({ id: "item-v2", codigo: "V2", cantidad: 1 }),
    ];
    const perWindowCuts = oneWindow.result.formal!.pautaBarras!.barras.flatMap((bar) => bar.cortes);
    const quantityTwoGlobal = construirFabricacionTrabajoSnapshot({ items: [asWorkItem(twoWindowsOneItem)] });
    const separateItemsGlobal = construirFabricacionTrabajoSnapshot({ items: twoSeparateWindows.map(asWorkItem) });
    const packingSignature = (bars: NonNullable<typeof separateItemsGlobal>["bars"] | undefined) => bars?.map((bar) => ({
      materialKey: bar.materialKey,
      presentationKey: bar.presentationKey,
      codigoPerfil: bar.codigoPerfil,
      acabadoKey: bar.acabadoKey,
      largoComercialMm: bar.largoComercialMm,
      indice: bar.indice,
      usadoMm: bar.usadoMm,
      sobranteMm: bar.sobranteMm,
      cortes: bar.cortes.map((cut) => `${cut.codigoPerfil}:${cut.funcion}:${cut.largoMm}`).sort(),
    })).sort((left, right) => left.materialKey.localeCompare(right.materialKey) || left.indice - right.indice);

    expect(oneWindow.result.formal?.result.perfiles.reduce((sum, row) => sum + row.cantidadPiezas, 0)).toBe(40);
    expect(oneWindow.result.formal?.result.totalLinealMm).toBe(28816);
    expect(oneWindow.result.formal?.pautaBarras?.barras).toHaveLength(7);
    expect(perWindowCuts).toHaveLength(40);
    expect(quantityTwoGlobal?.itemCountWithPauta).toBe(1);
    expect(quantityTwoGlobal).toMatchObject({ totalBars: 13, totalProfilesLinealMm: 57632, totalWasteMm: 17768 });
    expect(quantityTwoGlobal?.totalBars).toBe(separateItemsGlobal?.totalBars);
    expect(packingSignature(quantityTwoGlobal?.bars)).toEqual(packingSignature(separateItemsGlobal?.bars));
    expect(separateItemsGlobal?.bars.some((bar) => {
      const origins = new Set(bar.cortes.map((cut) => cut.codigoItem));
      return origins.has("V1") && origins.has("V2");
    })).toBe(true);
    expect(separateItemsGlobal?.bars.flatMap((bar) => bar.cortes).map((cut) => cut.itemId)).toEqual(
      expect.arrayContaining(["item-v1", "item-v2"])
    );
  });

  it.each([3, 5, 6, 8, 10, 12])(
    "mantiene geometría de perfiles para monolítico %s mm y deja vidrio/junquillo/costo pendientes",
    (thicknessMm) => {
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: (() => {
        let id = 0;
        return () => `veratec-characterization-${id++}`;
      })(),
    });
    const recipe = recipeRecord({
      id: "recipe-veratec-characterization",
      organizationId: 3,
      lineTemplateId: 1396,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "1396" }),
      lineaComercial: "Veratec 7400",
      vidrio: `Monolítico ${thicknessMm} mm`,
      ancho: 1200,
      alto: 1500,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "2 móviles",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 3,
    });

    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.formal).toBeNull();
    expect(resolved.recipe).toBeNull();
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.some((cut) => /junquillo/i.test(cut.functionLabel))).toBe(false);
    expect(resolved.cubication?.glass).toBeNull();
    expect(resolved.geometryOnly).toMatchObject({
      sourceRecipeId: "recipe-veratec-characterization",
      sourceVariant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      pendingCommercial: ["glass", "glass_bead", "price"],
      commercialMaterials: [
        { role: "glass", label: `Monolítico ${thicknessMm} mm`, status: "unmapped", netPrice: null },
        { role: "glass_bead", status: "unmapped", netPrice: null },
        { role: "price", status: "missing", netPrice: null },
      ],
    });
    expect(resolved.geometryOnly?.profiles.length).toBe(resolved.cubication?.cuts.length);
    expect(resolved.geometryOnly?.bars.barras.length).toBeGreaterThan(0);
    expect(resolved.message).toMatch(/no crea un snapshot formal/i);

    }
  );

  it.each([
    "Termopanel 20 mm",
    "DVH 24 mm",
    "DVH 4+12+4",
    "DVH 4+16+4",
    "DVH 4+10+5",
  ])(
    "calcula solo geometría preliminar para %s sin buscar ni formalizar receta",
    (glass) => {
      const definition = crearRecetaVeratec7400Corredera({
        lineName: "Veratec 7400",
        variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
        createId: (() => { let id = 0; return () => `veratec-tp-${id++}`; })(),
      });
      const recipe = recipeRecord({
        id: "recipe-veratec-tp-geometry-source",
        organizationId: 3,
        lineTemplateId: 1396,
        providerName: "VERATEC",
        lineName: "Veratec 7400",
        typology: "corredera",
        leavesCount: 2,
        variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
        status: "draft",
        definition,
        sourceType: "manufacturer",
        sourceName: "VERATEC",
        sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
        sourceRevision: VERATEC_7400_SOURCE_REVISION,
      });
      const item: CotizacionWorkflowItem = {
        ...quoteItem({ lineTemplateId: "1396", ancho: 1200, alto: 1500 }),
        lineaComercial: "Veratec 7400",
        vidrio: glass,
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "1396",
          catalogLineKey: VERATEC_7400_CATALOG_KEY,
          sistema: "Corredera",
          sheetScheme: "2 hojas",
          sheetVariant: "2 móviles",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
        }),
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [
          recipe,
          recipeRecord({
            ...recipe,
            id: "recipe-veratec-tp20-must-not-be-selected",
            variant: VERATEC_7400_VARIANT_TERMOPANEL_20MM,
            definition: crearRecetaVeratec7400Corredera({
              lineName: "Veratec 7400",
              variant: VERATEC_7400_VARIANT_TERMOPANEL_20MM,
              createId: () => "veratec-tp20-must-not-be-selected",
            }),
            sourceReference: VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_20MM,
          }),
          recipeRecord({
            ...recipe,
            id: "recipe-veratec-tp24-must-not-be-selected",
            variant: VERATEC_7400_VARIANT_TERMOPANEL_24MM,
            definition: crearRecetaVeratec7400Corredera({
              lineName: "Veratec 7400",
              variant: VERATEC_7400_VARIANT_TERMOPANEL_24MM,
              createId: () => "veratec-tp24-must-not-be-selected",
            }),
            sourceReference: VERATEC_7400_SOURCE_REFERENCE_TERMOPANEL_24MM,
          }),
        ],
        organizationId: 3,
      });

      expect(resolved.estado).toBe("receta_incompleta");
      expect(resolved.formal).toBeNull();
      expect(resolved.recipe).toBeNull();
      expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
      expect(resolved.cubication?.cuts.some((cut) => /junquillo/i.test(cut.functionLabel))).toBe(false);
      expect(resolved.cubication?.glass).toBeNull();
      expect(resolved.geometryOnly).toMatchObject({
        sourceRecipeId: recipe.id,
        sourceVariant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
        pendingCommercial: ["glass", "glass_bead", "price"],
        commercialMaterials: [
          { role: "glass", status: "unmapped", netPrice: null },
          { role: "glass_bead", status: "unmapped", netPrice: null },
          { role: "price", status: "missing", netPrice: null },
        ],
      });
      expect(resolved.geometryOnly?.bars.barras.length).toBeGreaterThan(0);
      expect(resolved.message).toMatch(/no crea un snapshot formal/i);
    }
  );

  it("resuelve TP20 como geometría preliminar cuando 2 hojas no trae variante explícita", () => {
    let nextProfileId = 0;
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: () => `veratec-tp20-unspecified-variant-source-${nextProfileId++}`,
    });
    const recipe = recipeRecord({
      id: "recipe-veratec-tp20-unspecified-variant-source",
      organizationId: 3,
      lineTemplateId: 1396,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "1396", ancho: 1200, alto: 1500 }),
      lineaComercial: "Veratec 7400",
      vidrio: "DVH 4+12+4",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 3,
    });

    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.geometryOnly).toMatchObject({
      pendingCommercial: ["glass", "glass_bead", "price"],
      commercialMaterials: [
        { role: "glass", status: "unmapped", netPrice: null },
        { role: "glass_bead", status: "unmapped", netPrice: null },
        { role: "price", status: "missing", netPrice: null },
      ],
    });
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
    expect(resolved.formal).toBeNull();
    expect(resolved.recipe).toBeNull();
  });

  it("no habilita geometría preliminar Veratec fuera de 2 hojas y 2 módulos", () => {
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: () => "veratec-geometry-source",
    });
    const recipe = recipeRecord({
      id: "recipe-veratec-2h-source",
      organizationId: 3,
      lineTemplateId: 1396,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "1396" }),
      lineaComercial: "Veratec 7400",
      vidrio: "Monolítico 5 mm",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 3,
        fabricacionModulos: 3,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 3,
    });

    expect(resolved.geometryOnly).toBeFalsy();
    expect(resolved.formal).toBeNull();
    expect(resolved.cubication).toBeNull();
  });

  it.each(["1 fija + 1 móvil"])(
    "no aplica la geometría Veratec 2 móviles cuando se elige una composición distinta (%s)",
    (sheetVariant) => {
      const definition = crearRecetaVeratec7400Corredera({
        lineName: "Veratec 7400",
        variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
        createId: () => "veratec-geometry-source-explicit-composition",
      });
      const recipe = recipeRecord({
        id: "recipe-veratec-explicit-composition-source",
        organizationId: 3,
        lineTemplateId: 1396,
        providerName: "VERATEC",
        lineName: "Veratec 7400",
        typology: "corredera",
        leavesCount: 2,
        variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
        status: "draft",
        definition,
        sourceType: "manufacturer",
        sourceName: "VERATEC",
        sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
        sourceRevision: VERATEC_7400_SOURCE_REVISION,
      });
      const item: CotizacionWorkflowItem = {
        ...quoteItem({ lineTemplateId: "1396" }),
        lineaComercial: "Veratec 7400",
        vidrio: "DVH 4+12+4",
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "1396",
          catalogLineKey: VERATEC_7400_CATALOG_KEY,
          sistema: "Corredera",
          sheetScheme: "2 hojas",
          sheetVariant,
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
        }),
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 3,
      });

      expect(resolved.geometryOnly).toBeFalsy();
      expect(resolved.formal).toBeNull();
      expect(resolved.cubication).toBeNull();
    }
  );

  it("permite abrir y resume la geometría preliminar Veratec sin formalizarla", () => {
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: (() => { let id = 0; return () => `veratec-geometry-source-preview-${id++}`; })(),
    });
    const recipe = recipeRecord({
      id: "recipe-veratec-preview-source",
      organizationId: 3,
      lineTemplateId: 1396,
      providerName: "VERATEC",
      lineName: "Veratec 7400",
      typology: "corredera",
      leavesCount: 2,
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      status: "draft",
      definition,
      sourceType: "manufacturer",
      sourceName: "VERATEC",
      sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
      sourceRevision: VERATEC_7400_SOURCE_REVISION,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "1396" }),
      lineaComercial: "Veratec 7400",
      vidrio: "DVH 4+12+4",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "1396",
        catalogLineKey: VERATEC_7400_CATALOG_KEY,
        sistema: "Corredera",
        sheetScheme: "2 hojas",
        sheetVariant: "2 móviles",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };
    const input = { item, recipes: [recipe], organizationId: 3 };

    expect(canOpenDespiecePreviewForQuoteItem(input)).toBe(true);
    expect(resolveMobileComponentFabricacionSummary(item, {
      recipes: [recipe],
      organizationId: 3,
    })).toMatchObject({
      status: "preliminary",
      statusLabel: "Geometría preliminar",
      canOpenDespiece: true,
      canOpenPauta: true,
    });
    const resolved = resolveFabricacionDespieceForQuoteItem(input);
    expect(resolved.formal).toBeNull();
  });

  it("does not reuse a compatible line recipe for a structurally changed quick composition", () => {
    const item = quoteItem({});
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "135",
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricacionVariante: "estandar",
      quickCompositionAdjustment: {
        ...createEmptyQuickCompositionAdjustment(),
        paneTypes: { "leaf-1": "fixed" },
      },
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved).toMatchObject({
      estado: "composicion_sin_receta",
      formal: null,
      cubication: null,
      recipe: null,
      barsAvailable: false,
    });
    expect(resolved.message).toMatch(/composición de hojas cambió/i);
  });

  it("mantiene la pauta al cambiar solo los palillos visuales", () => {
    const item = quoteItem({});
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "135",
      sistema: "Corredera",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricacionVariante: "estandar",
      quickCompositionAdjustment: {
        ...createEmptyQuickCompositionAdjustment(),
        paneDecorations: { "leaf-1": "vertical" },
      },
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
  });

  it("CASO 4b: con largos comerciales → despiece y tiras", () => {
    const recipe = recipeRecord();
    recipe.definition = {
      ...recipe.definition,
      perfiles: recipe.definition.perfiles.map((profile) => ({
        ...profile,
        largoComercialMm: 5950,
      })),
      configuracionCorte: {
        perdidaCorteMm: null,
        despunteInicialMm: null,
        sobranteMinimoAprovechableMm: null,
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
  });

  it("CASO 4: sin largos persistidos → despiece y barras con tira estándar resuelta", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
    expect(resolved.message).toBeNull();
  });

  it("CASO 5: código de perfil vacío no bloquea despiece", () => {
    const recipe = recipeRecord();
    recipe.definition.perfiles = recipe.definition.perfiles.map((profile) => ({
      ...profile,
      codigoPerfil: "",
    }));

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.calculable).toBe(true);
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
  });

  it("CASO 6: Constructor con sistema Personalizado no descarta L5000", () => {
    const item = quoteItem({});
    item.observaciones = encodeCotizacionItemPresentationMeta({
      lineTemplateId: "135",
      sistema: "Personalizado",
      configuracion: "Personalizado",
      sheetScheme: "Personalizado",
      isCustomScheme: true,
    });

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipeRecord({ status: "validated" })],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10714);
    expect(
      resolved.formal?.result.perfiles.some((row) => row.funcion === "Riel superior")
    ).toBe(true);
  });

  it("CASO 7: L20 en cotización usa el mismo motor → 10.660 mm", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "220" }),
      recipes: [
        recipeRecord(
          { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", lineTemplateId: 220, status: "validated" },
          "L20"
        ),
      ],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10660);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
  });

  it("CASO 8: L25 en cotización usa el mismo motor → 10.628 mm", () => {
    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({ lineTemplateId: "225" }),
      recipes: [
        recipeRecord(
          { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", lineTemplateId: 225, status: "validated" },
          "L25"
        ),
      ],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.totalLinealMm).toBe(10628);
    expect(
      resolved.formal?.result.perfiles.reduce(
        (sum, row) => sum + row.cantidadPiezas,
        0
      )
    ).toBe(12);
  });

  it("CASO 9: recalcula tiras aunque la pieza tenga un snapshot viejo sin barras", () => {
    const recipe = recipeRecord();
    recipe.definition = {
      ...recipe.definition,
      perfiles: recipe.definition.perfiles.map((profile) => ({
        ...profile,
        largoComercialMm: 5950,
      })),
    };
    const staleSnapshot = construirSnapshotFabricacionCotizacion({
      recipe: recipeRecord({
        definition: crearRecetaReferenciaL5000Corredera2H(),
      }),
      entrada: {
        anchoTotalMm: 1200,
        altoTotalMm: 1000,
        cantidad: 1,
        hojas: 2,
        modulos: 2,
        variante: "estandar",
      },
    });

    const item = quoteItem({});
    item.fabricacionSnapshot = {
      ...staleSnapshot,
      pautaBarras: {
        calculable: false,
        barras: [],
        advertencias: [],
        totalUsadoMm: 0,
        totalPerdidaCortesMm: 0,
        totalSobranteMm: 0,
      },
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.barsAvailable).toBe(true);
    expect(resolved.formal?.pautaBarras?.barras.length ?? 0).toBeGreaterThan(0);
  });

  it("canOpenDespiecePreviewForQuoteItem es true solo con línea, receta y despiece calculable", () => {
    const recipe = recipeRecord({}, "L5000");
    const item = quoteItem({});

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(true);

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item: quoteItem({ withLine: false }),
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: null,
      })
    ).toBe(false);
  });

  it("buildQuoteDespiecePreviewEligibility indexa solo piezas elegibles", () => {
    const recipe = recipeRecord({}, "L5000");
    const eligible = quoteItem({});
    const map = buildQuoteDespiecePreviewEligibility({
      items: [quoteItem({ withLine: false }), eligible],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(map.size).toBe(1);
    expect(map.get(eligible.id)).toBe(true);
  });

  it("findFirstQuoteItemWithDespiecePreview respeta el orden de la cotización", () => {
    const recipe = recipeRecord({}, "L5000");
    const first = quoteItem({ lineTemplateId: "135" });
    first.id = "item-first";
    const second = quoteItem({ lineTemplateId: "135" });
    second.id = "item-second";

    const found = findFirstQuoteItemWithDespiecePreview({
      items: [first, second],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(found?.id).toBe("item-first");
  });

  it("canOpenDespiecePreviewForQuoteItem rechaza piezas sin medidas", () => {
    const recipe = recipeRecord({}, "L5000");
    const item = quoteItem({});

    expect(
      canOpenDespiecePreviewForQuoteItem({
        item: { ...item, ancho: 0 },
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);
  });

  it("anyQuoteItemCanOpenDespiecePreview detecta al menos una pieza elegible", () => {
    const recipe = recipeRecord({}, "L5000");
    const eligibility = buildQuoteDespiecePreviewEligibility({
      items: [quoteItem({ withLine: false }), quoteItem({})],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(
      anyQuoteItemCanOpenDespiecePreview({
        items: [],
        recipes: [recipe],
        organizationId: 1,
        eligibilityByItemId: eligibility,
      })
    ).toBe(true);

    expect(
      anyQuoteItemCanOpenDespiecePreview({
        items: [quoteItem({ withLine: false })],
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(false);
  });

  it("CASO 10: L32 proyectante en constructor (hojasBase=2) no debe bloquear receta de 1 hoja", () => {
    const definition = crearRecetaPlantillaVentoraProyectante("L32");
    const recipe = recipeRecord({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      lineTemplateId: 332,
      status: "validated",
      definition,
      typology: "proyectante",
      leavesCount: 1,
    });
    const guidedVisualConfig = createQuoteConstructorPresetConfig("proyectante");
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "332", withLine: true }),
      nombre: "Ventana proyectante",
      descripcion: "",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "332",
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "Personalizado",
        isCustomScheme: true,
        hojasBase: 2,
        guidedVisualConfig,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });

  it("no marca revisión de fabricación en línea comercial sin receta (Serie 20)", () => {
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "serie-20", withLine: true }),
      lineaComercial: "Serie 20",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "serie-20",
        sistema: "Corredera",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 3,
        fabricacionModulos: 3,
        fabricacionVariante: "estandar",
      }),
    };

    expect(
      isQuoteItemFabricationReviewEligible({
        item,
        recipes: [],
        organizationId: 1,
      })
    ).toBe(false);
  });

  it("marca revisión de fabricación en L25 aunque falte configuración", () => {
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "10", withLine: true }),
      lineaComercial: "L25 SODAL",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "10",
        catalogLineKey: "ventora:l25",
        sistema: "Corredera",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionVariante: "estandar",
      }),
    };

    expect(
      isQuoteItemFabricationReviewEligible({
        item,
        recipes: [],
        organizationId: 1,
      })
    ).toBe(true);
  });

  it("marca revisión de fabricación cuando la línea tiene receta de taller", () => {
    const recipe = recipeRecord({}, "L5000");
    const item = quoteItem({});

    expect(
      isQuoteItemFabricationReviewEligible({
        item,
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(true);

    const eligibility = buildQuoteFabricationReviewEligibility({
      items: [quoteItem({ withLine: false }), item],
      recipes: [recipe],
      organizationId: 1,
    });

    expect(eligibility.get("item-1")).toBe(true);
    expect(
      anyQuoteItemHasFabricationReview({
        items: [quoteItem({ withLine: false }), item],
        recipes: [recipe],
        organizationId: 1,
        eligibilityByItemId: eligibility,
      })
    ).toBe(true);
  });

  it("muestra el despiece congelado si el recálculo en vivo no encuentra receta", () => {
    const live = resolveFabricacionDespieceForQuoteItem({
      item: quoteItem({}),
      recipes: [recipeRecord()],
      organizationId: 1,
    });
    expect(live.formal).toBeTruthy();

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item: {
        ...quoteItem({ withLine: false }),
        fabricacionSnapshot: live.formal,
      },
      recipes: [],
      organizationId: 1,
    });

    expect(resolved.estado).not.toBe("calculado");
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
    expect(resolved.formal).toEqual(live.formal);
  });

  it("no usa el sistema comercial Abatible como apertura de receta", () => {
    expect(resolveAperturaForRecipeMatch("", "Abatible")).toBeNull();
    expect(resolveAperturaForRecipeMatch("interior", "Abatible")).toBe("interior");
  });

  it("previsualiza destajes de Línea 45 en cotización guiada aunque la receta esté en borrador", () => {
    const definition = crearRecetaSerie45Practicable({
      lineName: "Línea 45 — Puerta",
      createId: (() => {
        let nextId = 0;
        return () => `l45-quote-${nextId++}`;
      })(),
    });
    const recipe = recipeRecord({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      lineTemplateId: 540,
      lineName: "Línea 45 — Puerta",
      typology: "puerta_abatible",
      leavesCount: 1,
      variant: "puerta_1h",
      status: "draft",
      definition,
      sourceReference: "sodal+indalum:serie-45-practicable:puerta:1h:v2",
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "540" }),
      tipo: "Puerta",
      lineaComercial: "Línea 45 — Puerta",
      nombre: "Puerta abatible 1 hoja",
      descripcion: "Puerta de aluminio con vidrio incoloro.",
      ancho: SERIE_45_FIXTURE_1500X2000.anchoTotalMm,
      alto: SERIE_45_FIXTURE_1500X2000.altoTotalMm,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "540",
        catalogLineKey: "ventora:serie-45-puerta",
        sistema: "Abatible",
        fabricacionTipologia: "puerta_abatible",
        fabricacionHojas: 1,
        fabricacionModulos: 1,
        fabricacionApertura: "interior",
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.formal?.result.perfiles.map((row) => row.codigoPerfil)).toEqual([
      ...SERIE_45_FIXTURE_1500X2000.codes,
    ]);
    expect(resolved.formal?.result.perfiles.map((row) => row.medidaMm)).toEqual([
      ...SERIE_45_FIXTURE_1500X2000.lengthsMm,
    ]);
    expect(resolved.formal?.result.vidrios[0]).toMatchObject({
      anchoMm: SERIE_45_FIXTURE_1500X2000.glass.widthMm,
      altoMm: SERIE_45_FIXTURE_1500X2000.glass.heightMm,
    });
    expect(
      isQuoteItemFabricationReviewEligible({
        item,
        recipes: [recipe],
        organizationId: 1,
      })
    ).toBe(true);
  });

  it("previsualiza despiece S60 calculable como sugerencia aunque falte largo comercial", () => {
    const variant = WINHOUSE_S60_VARIANTS.fijoMonolitico;
    const definition = crearRecetaWinHouseS60Candidata({
      lineName: "WinHouse S60",
      variant,
    });
    const recipe = recipeRecord({
      id: "winhouse-s60-fixed-preview",
      lineTemplateId: 560,
      lineName: "WinHouse S60",
      typology: "pano_fijo",
      leavesCount: 1,
      variant,
      status: "draft",
      definition,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "560" }),
      tipo: "Ventana",
      nombre: "Ventana fija",
      descripcion: "Paño fijo",
      lineaComercial: "WinHouse S60",
      vidrio: "Vidrio monolítico 4 mm",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "560",
        catalogLineKey: "ventora:winhouse-s60",
        sistema: "Fijo",
        fabricacionTipologia: "pano_fijo",
        fabricacionHojas: 1,
        fabricacionModulos: 1,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
  });

  it("resuelve S60 paño fijo desde la cotización aunque la etiqueta comercial diga abatible", () => {
    const variant = WINHOUSE_S60_VARIANTS.fijoMonolitico;
    const recipe = recipeRecord({
      id: "winhouse-s60-fixed-commercial-label-preview",
      lineTemplateId: 560,
      lineName: "WinHouse S60",
      typology: "pano_fijo",
      leavesCount: 1,
      variant,
      status: "draft",
      definition: crearRecetaWinHouseS60Candidata({
        lineName: "WinHouse S60",
        variant,
      }),
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "560" }),
      tipo: "Paño fijo",
      nombre: "Paño fijo con perfilería",
      descripcion: "",
      lineaComercial: "WinHouse S60",
      vidrio: "Incoloro monolítico 4mm",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "560",
        catalogLineKey: "ventora:winhouse-s60",
        sistema: "Abatible / doble contacto",
        fabricacionTipologia: "abatible",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.recipe?.definition.identidad.variante).toBe(variant);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
  });

  it("solo usa el fallback S60 de catálogo cuando llega una clave explícita", () => {
    const monoVariant = WINHOUSE_S60_VARIANTS.fijoMonolitico;
    const termopanelVariant = WINHOUSE_S60_VARIANTS.fijoTermopanel1720;
    const recipes = [
      recipeRecord({
        id: "winhouse-s60-fixed-mono-legacy",
        organizationId: 3,
        lineTemplateId: 226,
        lineName: "WinHouse S60",
        typology: "pano_fijo",
        leavesCount: 1,
        variant: monoVariant,
        status: "draft",
        definition: crearRecetaWinHouseS60Candidata({
          lineName: "WinHouse S60",
          variant: monoVariant,
        }),
      }),
      recipeRecord({
        id: "winhouse-s60-fixed-dvh-legacy",
        organizationId: 3,
        lineTemplateId: 226,
        lineName: "WinHouse S60",
        typology: "pano_fijo",
        leavesCount: 1,
        variant: termopanelVariant,
        status: "draft",
        definition: crearRecetaWinHouseS60Candidata({
          lineName: "WinHouse S60",
          variant: termopanelVariant,
        }),
      }),
    ];
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "226" }),
      tipo: "Ventana",
      nombre: "Ventana fija",
      descripcion: "",
      lineaComercial: "WinHouse S60",
      vidrio: "Incoloro monolítico 4mm",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "226",
        sistema: "Fijo",
        fabricacionHojas: 1,
        fabricacionModulos: 1,
      }),
    };

    const resolvedLegacyDraft = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes,
      organizationId: 3,
    });
    const resolvedFromSelectedLine = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes,
      organizationId: 3,
      lineCatalogKey: "ventora:winhouse-s60",
    });

    expect(resolvedLegacyDraft.estado).toBe("multiples_recetas");
    expect(resolvedLegacyDraft.recipe).toBeNull();
    expect(resolvedFromSelectedLine.estado).toBe("calculado");
    expect(resolvedFromSelectedLine.recipe?.definition.identidad.variante).toBe(monoVariant);
    expect(resolvedFromSelectedLine.cubication?.cuts.length).toBeGreaterThan(0);
  });

  it("resuelve una S75 doble riel 2H desde la línea y el vidrio aunque el draft no guardara la variante", () => {
    const recipes = WINHOUSE_NEW_S75_VARIANTS.filter((variant) => variant.railCount === 2).map(
      (variant) =>
        recipeRecord({
          id: `winhouse-new-s75-${variant.slug}`,
          organizationId: 3,
          lineTemplateId: 224,
          lineName: "WinHouse New S75 — Doble riel",
          typology: "corredera",
          leavesCount: variant.leaves,
          variant: variant.slug,
          status: "draft",
          sourceType: "supplier",
          sourceName: "WinHouse",
          sourceReference: `winhouse:new-s75:${variant.slug}`,
          definition: crearRecetaWinHouseNewS75({
            lineName: "WinHouse New S75 — Doble riel",
            variant: variant.slug,
          }),
        })
    );
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "224" }),
      tipo: "Ventana",
      nombre: "Ventana corredera 2 hojas",
      descripcion: "Corredera 2 hojas",
      lineaComercial: "WinHouse New S75 — Doble riel",
      vidrio: "DVH 4+10+5",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "224",
        catalogLineKey: "ventora:winhouse-new-s75-doble-riel",
        sistema: "Corredera",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes,
      organizationId: 3,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.recipe?.variant).toBe("doble_riel_2h_simetrica_80_dvh_17_20");
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);

    const legacyDraft = {
      ...item,
      observaciones: encodeCotizacionItemPresentationMeta({
        sistema: "Corredera",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
      }),
    };
    const resolvedLegacyDraft = resolveFabricacionDespieceForQuoteItem({
      item: legacyDraft,
      recipes,
      organizationId: 3,
      lineTemplateId: 224,
      lineCatalogKey: "ventora:winhouse-new-s75-doble-riel",
    });
    expect(resolvedLegacyDraft.estado).toBe("calculado");
    expect(resolvedLegacyDraft.cubication?.cuts.length).toBeGreaterThan(0);

    const mobileSummary = resolveMobileComponentFabricacionSummary(item, {
      recipes,
      organizationId: 3,
    });
    expect(mobileSummary.status).toBe("preliminary");
    expect(mobileSummary.statusLabel).toBe("Despiece preliminar");
    expect(mobileSummary.canOpenDespiece).toBe(true);
  });

  it("calcula S75 asimétrica oficial aunque la receta de esa variante todavía no esté sembrada", () => {
    const variant = "doble_riel_2h_asimetrica_80_dvh_17_20";
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "226" }),
      tipo: "Ventana",
      nombre: "Ventana corredera",
      descripcion: "2 hojas asimétricas",
      lineaComercial: "WinHouse New S75 — Doble riel",
      vidrio: "DVH 4+10+5",
      ancho: 1800,
      alto: 1500,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "226",
        catalogLineKey: "ventora:winhouse-new-s75-doble-riel",
        sistema: "Corredera",
        configuracion: "2 hojas asimétricas, hoja 80 mm",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionVariante: variant,
        fabricacionAnchoHojaAMm: 900,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [],
      organizationId: 3,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.recipe?.id).toBe(`ventora-preview:226:${variant}`);
    expect(resolved.formal?.input.anchoHojaAMm).toBe(900);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    expect(resolved.cubication?.cuts.length).toBeGreaterThan(0);
  });

  it("usa la base oficial S75 cuando la receta local exacta está incompleta", () => {
    const variant = "doble_riel_2h_asimetrica_80_dvh_17_20";
    const definition = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75 — Doble riel",
      variant,
    });
    definition.perfiles = [];
    const localDraft = recipeRecord({
      id: "s75-local-incomplete",
      organizationId: 3,
      lineTemplateId: 226,
      providerName: "WinHouse",
      lineName: "WinHouse New S75 — Doble riel",
      typology: "corredera",
      leavesCount: 2,
      variant,
      status: "draft",
      definition,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "226" }),
      tipo: "Ventana",
      nombre: "Ventana corredera",
      descripcion: "2 hojas asimétricas",
      lineaComercial: "WinHouse New S75 — Doble riel",
      vidrio: "DVH 4+10+5",
      ancho: 1800,
      alto: 1500,
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "226",
        catalogLineKey: "ventora:winhouse-new-s75-doble-riel",
        sistema: "Corredera",
        configuracion: "2 hojas asimétricas, hoja 80 mm",
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionVariante: variant,
        fabricacionAnchoHojaAMm: 900,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [localDraft],
      organizationId: 3,
    });

    expect(resolved.estado).toBe("calculado");
    expect(resolved.preliminary).toBe(true);
    expect(resolved.recipe?.id).toBe(`ventora-preview:226:${variant}`);
    expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
  });

  describe("precedencia segura de recetas S75", () => {
    const variant = "doble_riel_2h_simetrica_80_mono_4_6";
    const catalogKey = "ventora:winhouse-new-s75-doble-riel";
    const createItem = (): CotizacionWorkflowItem => ({
      ...quoteItem({ lineTemplateId: "226" }),
      lineaComercial: "WinHouse New S75 — Doble riel",
      vidrio: "Monolítico 4 mm",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "226", catalogLineKey: catalogKey,
        sistema: "Corredera", fabricacionTipologia: "corredera",
        fabricacionHojas: 2, fabricacionModulos: 2, fabricacionVariante: variant,
      }),
    });
    function localRecipe(overrides: Partial<FabricationRecipeRecord> = {}) {
      const definition = crearRecetaWinHouseNewS75({ lineName: "WinHouse New S75", variant });
      // Simulated workshop configuration, not a claim about physical supplier codes.
      definition.perfiles.forEach((profile, index) => { profile.codigoPerfil = `QA-${index}`; });
      definition.perfiles.find((profile) => profile.funcion === "Marco horizontal")!.reglaMedida.ajusteMm = 9;
      return recipeRecord({
        id: "workshop-s75", organizationId: 3, lineTemplateId: 226,
        providerName: "WinHouse", lineName: "WinHouse New S75", variant,
        definition, status: "draft", ...overrides,
      });
    }

    it.each(["draft", "validated"] as const)("respeta ajustes del taller en %s sin mutar la receta", (status) => {
      const recipe = localRecipe({ status });
      const before = JSON.stringify(recipe);
      const resolved = resolveFabricacionDespieceForQuoteItem({ item: createItem(), recipes: [recipe], organizationId: 3 });
      expect(resolved.estado).toBe("calculado");
      expect(resolved.recipe?.id).toBe("workshop-s75");
      expect(resolved.formal?.result.perfiles.find((row) => row.funcion === "Marco horizontal")?.medidaMm).toBe(1209);
      expect(JSON.stringify(recipe)).toBe(before);
    });

    it.each([
      { reason: "otra organización", overrides: { organizationId: 99 } },
      { reason: "otra línea", overrides: { lineTemplateId: 999 } },
      { reason: "archivada", overrides: { status: "archived" as const } },
      { reason: "eliminada", overrides: { status: "validated" as const, eliminadoEn: "2026-09-27T00:00:00Z" } },
    ])("excluye receta $reason y conserva la base preliminar", ({ overrides }) => {
      const resolved = resolveFabricacionDespieceForQuoteItem({ item: createItem(), recipes: [localRecipe(overrides)], organizationId: 3 });
      expect(resolved.estado).toBe("calculado");
      expect(resolved.preliminary).toBe(true);
      expect(resolved.recipe?.id).toBe(`ventora-preview:226:${variant}`);
      expect(resolved.formal?.result.perfiles.find((row) => row.funcion === "Marco horizontal")?.medidaMm).toBe(1205);
    });
  });

  it("no calcula despiece de un borrador que aún no está listo para probar", () => {
    const definition = crearRecetaSerie45Practicable({
      lineName: "Línea 45 — Puerta",
    });
    definition.perfiles = [];
    const recipe = recipeRecord({
      lineTemplateId: 540,
      typology: "puerta_abatible",
      leavesCount: 1,
      status: "draft",
      definition,
    });
    const item: CotizacionWorkflowItem = {
      ...quoteItem({ lineTemplateId: "540" }),
      tipo: "Puerta",
      observaciones: encodeCotizacionItemPresentationMeta({
        lineTemplateId: "540",
        sistema: "Abatible",
        fabricacionTipologia: "puerta_abatible",
        fabricacionHojas: 1,
        fabricacionModulos: 1,
      }),
    };

    const resolved = resolveFabricacionDespieceForQuoteItem({
      item,
      recipes: [recipe],
      organizationId: 1,
    });

    expect(resolved.estado).toBe("receta_incompleta");
    expect(resolved.formal).toBeNull();
  });

  describe("L25 Zeta 3H cotización", () => {
    beforeEach(() => {
      resetZetaConfirmedCacheForTests();
      resetEvidenceSidecarCacheForTests();
      resetSodalL25RecipeCacheForTests();
    });

    it("calcula despiece a 2000×1800 con receta Zeta 3H", () => {
      const bundle = buildAllSodalL25Recipes().find(
        (entry) => entry.recipeId === "monolitico_pierna_abierta_3h_3000x1500"
      );
      expect(bundle).toBeDefined();

      const recipe = recipeRecord({
        id: "l25-3h-open-test",
        lineTemplateId: 10,
        lineName: "L25 SODAL",
        status: "testing",
        scope: "organization",
        typology: "corredera",
        leavesCount: 3,
        variant: "monolithic_open_normal",
        definition: bundle!.definition,
        sourceReference: bundle!.sourceReference,
        sourceType: "manufacturer",
        sourceName: "SODAL",
        sourceRevision: SODAL_L25_FORMULA_VERSION,
      });

      expect(fabricacionRecetaSchema.safeParse(recipe.definition).success).toBe(true);
      expect(recipe.definition.identidad.variante).toBe("monolithic_open_normal");

      const item: CotizacionWorkflowItem = {
        ...quoteItem({ lineTemplateId: "10", withLine: true }),
        ancho: 2000,
        alto: 1800,
        vidrio: "4mm",
        lineaComercial: "L25 SODAL",
        descripcion: "Ventana corredera 3 hojas",
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "10",
          catalogLineKey: "ventora:l25",
          sistema: "Corredera",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 3,
          fabricacionModulos: 3,
          fabricacionVariante: "monolithic_open_normal",
          fabricacionGlazing: "monolithic",
          fabricacionLeg: "open",
          fabricacionReinforcement: "normal",
        }),
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [recipe],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
      expect(resolved.formal?.result.calculable).toBe(true);
      expect(resolved.formal?.result.perfiles.length).toBeGreaterThan(0);
    });

    it("sigue calculando L25 aunque convivan recetas con ajusteMm fraccionario (L15 3H)", () => {
      const bundle = buildAllSodalL25Recipes().find(
        (entry) => entry.recipeId === "monolitico_pierna_abierta_3h_3000x1500"
      );
      const line15 = crearRecetaLine15Corredera({
        lineName: "Línea 15",
        variant: LINE_15_VARIANT_3H_3RIELES,
      });

      expect(fabricacionRecetaSchema.safeParse(line15).success).toBe(true);
      expect(line15.perfiles[3]?.reglaMedida.ajusteMm).not.toBe(
        Math.round(line15.perfiles[3]?.reglaMedida.ajusteMm ?? 0)
      );

      const l25Recipe = recipeRecord({
        id: "l25-3h-open-test",
        lineTemplateId: 10,
        status: "testing",
        definition: bundle!.definition,
        sourceReference: bundle!.sourceReference,
        sourceType: "manufacturer",
        sourceName: "SODAL",
        sourceRevision: SODAL_L25_FORMULA_VERSION,
      });
      const line15Recipe = recipeRecord({
        id: "line-15-3h-test",
        lineTemplateId: 999,
        lineName: "Línea 15",
        status: "validated",
        definition: line15,
      });

      const item: CotizacionWorkflowItem = {
        ...quoteItem({ lineTemplateId: "10", withLine: true }),
        ancho: 2000,
        alto: 1800,
        observaciones: encodeCotizacionItemPresentationMeta({
          lineTemplateId: "10",
          catalogLineKey: "ventora:l25",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 3,
          fabricacionModulos: 3,
          fabricacionVariante: "monolithic_open_normal",
          fabricacionGlazing: "monolithic",
          fabricacionLeg: "open",
          fabricacionReinforcement: "normal",
        }),
      };

      const resolved = resolveFabricacionDespieceForQuoteItem({
        item,
        recipes: [l25Recipe, line15Recipe],
        organizationId: 1,
      });

      expect(resolved.estado).toBe("calculado");
    });
  });
});
