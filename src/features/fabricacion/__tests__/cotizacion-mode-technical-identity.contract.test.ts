import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import {
  applyLineTemplateToComponentForm,
  buildItemFromForm,
  createEmptyComponentForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import {
  buildAllSodalL25Recipes,
  resetSodalL25RecipeCacheForTests,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
  VERATEC_7400_SOURCE_REVISION,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";

function recipeRecord(input: {
  id: string;
  lineTemplateId: number;
  variant: string;
  definition: FabricationRecipeRecord["definition"];
  status?: FabricationRecipeRecord["status"];
  lineName?: string;
  sourceName?: string | null;
  sourceReference?: string | null;
  sourceRevision?: string | null;
}): FabricationRecipeRecord {
  return {
    id: input.id,
    organizationId: 1,
    lineTemplateId: input.lineTemplateId,
    scope: "organization",
    providerName: "QA fixture",
    lineName: input.lineName ?? input.definition.identidad.nombre,
    typology: input.definition.identidad.tipologia,
    leavesCount: input.definition.identidad.hojas,
    variant: input.variant,
    version: 1,
    status: input.status ?? "draft",
    definition: input.definition,
    sourceType: input.sourceReference ? "manufacturer" : "manual",
    sourceReference: input.sourceReference ?? null,
    sourceName: input.sourceName ?? null,
    sourceRevision: input.sourceRevision ?? null,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-27T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function lineTemplate(input: {
  id: number;
  catalogKey: string;
  name: string;
  material: "Aluminio" | "PVC";
  lineConfiguration: string;
  pricePerM2?: number;
}): CotizacionLineTemplate {
  const definition = VENTORA_DEFAULT_LINE_CATALOG.find(
    (candidate) => candidate.catalogKey === input.catalogKey
  );
  return {
    id: input.id,
    nombre: input.name,
    categoria: input.material === "PVC" ? "pvc" : "aluminio",
    material: input.material,
    catalogKey: input.catalogKey,
    catalogMetadata: {
      ...(definition?.catalogMetadata ?? {}),
      lineConfiguration: input.lineConfiguration,
    },
    vidrioPrincipalRecomendado: null,
    precioM2Sugerido: input.pricePerM2 ?? 80000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
  };
}

function createModeItem(input: {
  mode: "guided" | "constructor";
  template: CotizacionLineTemplate;
  recipes: FabricationRecipeRecord[];
  glass: string;
  fabrication: Partial<ReturnType<typeof decodeCotizacionItemPresentationMeta>>;
  widthMm?: number;
  heightMm?: number;
  customComposition?: boolean;
}) {
  const constructor = input.mode === "constructor";
  const form = {
    ...createEmptyComponentForm([], "", "precio_directo", 0),
    tipo: "Ventana",
    nombre: "Ventana corredera",
    descripcion: "",
    ancho: String(input.widthMm ?? 1200),
    alto: String(input.heightMm ?? 1000),
    cantidad: "2",
    sistema: constructor ? "Personalizado" : "Corredera",
    configuracion: constructor ? "Personalizado" : "Corredera 2 hojas",
    sheetScheme: constructor ? "Personalizado" : "2 hojas",
    sheetVariant: constructor ? "" : "2 móviles",
    isCustomScheme: constructor,
    guidedVisualConfig: constructor || input.customComposition
      ? {
          ...createQuoteConstructorPresetConfig("corredera", {
            widthMm: 1200,
            heightMm: 1000,
          }),
          ...(input.customComposition ? { quickCompositionStructural: true } : {}),
        }
      : null,
    quickCompositionAdjustment: input.customComposition
      ? createEmptyQuickCompositionAdjustment()
      : null,
  };
  const assigned = applyLineTemplateToComponentForm(form, input.template, {
    fabricationRecipes: input.recipes,
    organizationId: 1,
  });
  return buildItemFromForm(
    {
      ...assigned,
      vidrio: input.glass,
      ...input.fabrication,
      ...(input.customComposition
        ? {
            isCustomScheme: true,
            customSchemeDescription: "Composición visual pendiente de revisión",
            fabricacionConfiguracionId: "custom:qa-window",
            fabricacionComposicionId: "custom:qa-two-modules",
          }
        : {}),
    },
    [],
    `${input.mode}-${input.template.id}`,
    {
      lineTemplates: [input.template],
      fabricationRecipes: input.recipes,
      organizationId: 1,
    }
  );
}

function technicalIdentity(item: ReturnType<typeof buildItemFromForm>) {
  const meta = decodeCotizacionItemPresentationMeta(item.observaciones);
  return {
    lineTemplateId: meta.lineTemplateId,
    catalogKey: meta.catalogLineKey,
    typology: meta.fabricacionTipologia,
    leaves: meta.fabricacionHojas,
    modules: meta.fabricacionModulos,
    opening: meta.fabricacionApertura,
    hardware: meta.fabricacionHerraje,
    variant: meta.fabricacionVariante,
    configurationId: meta.fabricacionConfiguracionId,
    compositionId: meta.fabricacionComposicionId,
    recipeId: meta.fabricationRecipeId,
    glassProductId: meta.vidrioLineTemplateId,
    glassSpec: meta.glassTechnicalSpec,
    glazing: meta.fabricacionGlazing,
    leg: meta.fabricacionLeg,
    reinforcement: meta.fabricacionReinforcement,
  };
}

function resolutionSignature(item: ReturnType<typeof buildItemFromForm>, recipes: FabricationRecipeRecord[]) {
  const result = resolveFabricacionDespieceForQuoteItem({ item, recipes, organizationId: 1 });
  return {
    state: result.estado,
    recipeId: result.recipe?.id ?? null,
    preliminary: result.preliminary,
    calculatedProfileCuts: (result.formal?.result.perfiles ?? []).map((profile) => ({
      code: profile.codigoPerfil,
      role: profile.funcion,
      length: profile.medidaMm,
      quantity: profile.cantidadPiezas,
      cut: profile.corte,
    })),
    geometryOnlyProfileCuts: (result.geometryOnly?.profiles ?? []).map((profile) => ({
      code: profile.codigoPerfil,
      role: profile.funcion,
      length: profile.medidaMm,
      quantity: profile.cantidadPiezas,
      cut: profile.corte,
    })),
    glass: (result.formal?.result.vidrios ?? []).map((pane) => ({
      width: pane.anchoMm,
      height: pane.altoMm,
      quantity: pane.cantidadPiezas,
    })),
  };
}

describe("contrato común de identidad técnica Guiada / Constructor", () => {
  beforeEach(() => resetSodalL25RecipeCacheForTests());

  const veratec = lineTemplate({
    id: 1396,
    catalogKey: VERATEC_7400_CATALOG_KEY,
    name: "Veratec 7400 — Corredera 2 hojas",
    material: "PVC",
    lineConfiguration: "Corredera 2 hojas",
    pricePerM2: 144000,
  });
  const veratecDefinition = crearRecetaVeratec7400Corredera({
    lineName: "Veratec 7400",
    variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    createId: (() => { let id = 0; return () => `identity-veratec-${id++}`; })(),
  });
  const veratecRecipe = recipeRecord({
    id: "identity-veratec-7400-4mm",
    lineTemplateId: veratec.id,
    variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    definition: veratecDefinition,
    sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
    sourceRevision: VERATEC_7400_SOURCE_REVISION,
  });

  const s75Variant = "doble_riel_2h_simetrica_80_mono_4_6";
  const s75 = lineTemplate({
    id: 224,
    catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    name: "WinHouse New S75 — Doble riel",
    material: "PVC",
    lineConfiguration: "Doble riel · 2 hojas",
  });
  const s75Recipe = recipeRecord({
    id: "identity-winhouse-s75-2h-mono-4-6",
    lineTemplateId: s75.id,
    variant: s75Variant,
    definition: crearRecetaWinHouseNewS75({
      lineName: s75.nombre,
      variant: s75Variant,
    }),
  });

  const l25Template = lineTemplate({
    id: 10,
    catalogKey: "ventora:l25",
    name: "L25 SODAL",
    material: "Aluminio",
    lineConfiguration: "Corredera 2 hojas",
  });
  const l25Bundle = buildAllSodalL25Recipes().find(
    (bundle) => bundle.recipeId === "monolitico_pierna_abierta_2h_1800x1500"
  );
  if (!l25Bundle) throw new Error("Falta el fixture canónico SODAL L25 2H monolítico.");
  const l25Recipe = recipeRecord({
    id: "identity-sodal-l25-2h-monolithic-open-normal",
    lineTemplateId: l25Template.id,
    variant: "monolithic_open_normal",
    definition: l25Bundle.definition,
    sourceReference: l25Bundle.sourceReference,
    sourceRevision: l25Bundle.sourceRevision,
    status: "testing",
    lineName: "L25 SODAL",
    sourceName: "SODAL",
  });

  const cases = [
    {
      name: "Veratec 7400 monolítico 4 mm",
      template: veratec,
      recipes: [veratecRecipe],
      glass: "Incoloro monolítico 4mm",
      fabrication: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionApertura: "corredera",
        fabricacionVariante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      },
      expectedState: "calculado",
    },
    {
      name: "Veratec 7400 monolítico 5 mm",
      template: veratec,
      recipes: [veratecRecipe],
      glass: "Incoloro monolítico 5mm",
      fabrication: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionApertura: "corredera",
        fabricacionVariante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      },
      expectedState: "receta_incompleta",
    },
    {
      name: "WinHouse New S75 doble riel 2H monolítico 4 mm",
      template: s75,
      recipes: [s75Recipe],
      glass: "4mm",
      fabrication: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionApertura: "corredera",
        fabricacionVariante: s75Variant,
      },
      expectedState: "calculado",
    },
    {
      name: "SODAL L25 corredera 2H monolítico, pierna abierta normal",
      template: l25Template,
      recipes: [l25Recipe],
      glass: "4mm",
      widthMm: 1800,
      heightMm: 1500,
      fabrication: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 1,
        fabricacionApertura: "corredera",
        fabricacionVariante: "monolithic_open_normal",
        fabricacionGlazing: "monolithic",
        fabricacionLeg: "open",
        fabricacionReinforcement: "normal",
      },
      expectedState: "sin_receta",
    },
  ] as const;

  it.each(cases)("$name mantiene identidad y resolución equivalentes", (testCase) => {
    const common = {
      template: testCase.template,
      recipes: [...testCase.recipes],
      glass: testCase.glass,
      fabrication: testCase.fabrication,
      widthMm: testCase.widthMm,
      heightMm: testCase.heightMm,
    };
    const guidedItem = createModeItem({ ...common, mode: "guided" });
    const constructorItem = createModeItem({ ...common, mode: "constructor" });
    const guidedResolution = resolutionSignature(guidedItem, [...testCase.recipes]);
    const constructorResolution = resolutionSignature(constructorItem, [...testCase.recipes]);
    expect(technicalIdentity(constructorItem)).toEqual(technicalIdentity(guidedItem));
    expect(constructorResolution).toEqual(guidedResolution);
    expect(guidedResolution.state).toBe(testCase.expectedState);
    expect(constructorItem).toMatchObject({
      ancho: testCase.widthMm ?? 1200,
      alto: testCase.heightMm ?? 1000,
      cantidad: 2,
      precioPorM2: testCase.template.precioM2Sugerido,
      precioUnitario: guidedItem.precioUnitario,
    });
    expect(constructorItem.precioUnitario).toBe(guidedItem.precioUnitario);
  });

  it("conserva la identidad personalizada y deja ambas resoluciones pendientes", () => {
    const custom = {
      template: veratec,
      recipes: [veratecRecipe],
      glass: "Incoloro monolítico 4mm",
      fabrication: {
        fabricacionTipologia: "corredera",
        fabricacionHojas: 2,
        fabricacionModulos: 2,
        fabricacionApertura: "corredera",
        fabricacionVariante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      },
      customComposition: true,
    } as const;
    const guidedItem = createModeItem({ ...custom, mode: "guided" });
    const constructorItem = createModeItem({ ...custom, mode: "constructor" });
    const guidedResolution = resolveFabricacionDespieceForQuoteItem({
      item: guidedItem,
      recipes: [veratecRecipe],
      organizationId: 1,
    });
    const constructorResolution = resolveFabricacionDespieceForQuoteItem({
      item: constructorItem,
      recipes: [veratecRecipe],
      organizationId: 1,
    });

    expect(technicalIdentity(constructorItem)).toEqual(technicalIdentity(guidedItem));
    expect(technicalIdentity(constructorItem)).toMatchObject({
      configurationId: "custom:qa-window",
      compositionId: "custom:qa-two-modules",
      recipeId: "",
    });
    expect(constructorResolution.estado).toBe("composicion_sin_receta");
    expect(guidedResolution.estado).toBe("composicion_sin_receta");
    expect(constructorResolution.recipe).toBeNull();
    expect(guidedResolution.recipe).toBeNull();
  });
});
