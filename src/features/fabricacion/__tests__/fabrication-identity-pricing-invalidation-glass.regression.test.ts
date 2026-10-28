import {
  applyLineTemplateToComponentForm,
  applyQuotePricingToItems,
  buildItemFromForm,
  createEmptyComponentForm,
  hydrateComponentFormFromLineTemplate,
  mapItemToForm,
  type ComponentFormState,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";
import { createDefaultGuidedVisualConfig } from "@/features/cotizaciones/visual-composer/types/guided-visual-config";
import { createEmptyQuickCompositionAdjustment } from "@/features/cotizaciones/visual-composer/types/quick-composition-adjustment";
import { setQuickPaneDecoration } from "@/features/cotizaciones/visual-composer/services/quick-composition-adjustment.service";
import { prepareFabricacionSnapshotsForQuoteSave } from "@/features/cotizaciones/services/fabricacion-trabajo-snapshot-lifecycle.service";
import {
  decodeCotizacionItemPresentationMeta,
  encodeCotizacionItemCubicationOverride,
  encodeCotizacionItemPresentationMeta,
} from "@/utils/cotizacion-item-presentation";
import { buildCatalogGlassTechnicalSpec } from "@/features/cotizaciones/line-templates/types/glass-technical-spec";
import { getCatalogGlassTechnicalFingerprint } from "@/features/cotizaciones/services/manual-glass-pane-measurements.service";
import { resolveManualGlassPaneSlots } from "@/features/cotizaciones/services/manual-glass-pane-slots.service";
import { buildGlassDistributionCoverage } from "@/features/fabricacion/services/glass-distribution-coverage.service";
import { extractNormalizedGlassPanes } from "@/features/fabricacion/services/glass-pane-normalization.service";
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
  WINHOUSE_NEW_S75_VARIANTS,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import {
  buildAllSodalL25Recipes,
  SODAL_L25_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/sodal-l25-zeta-recipes";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";
import type { FabricacionCotizacionSnapshot } from "@/features/fabricacion/types/fabricacion-snapshot";

type TechnicalIdentityProjection = {
  catalogLineKey: string;
  lineTemplateId: string;
  sistema: string;
  configuracion: string;
  hojasBase: 1 | 2 | null;
  sheetScheme: string;
  sheetVariant: string;
  fabricacionTipologia: string;
  fabricacionHojas: number | null;
  fabricacionModulos: number | null;
  fabricacionApertura: string;
  fabricacionHerraje: string;
  fabricacionVariante: string;
  fabricacionGlazing: string;
  fabricacionLeg: string;
  fabricacionReinforcement: string;
  fabricacionConfiguracionId: string;
  fabricacionComposicionId: string;
  fabricacionAnchoHojaAMm: number | null;
  fabricationRecipeId: string;
  supplierProviderKey: string;
  guidedVisualConfig: ComponentFormState["guidedVisualConfig"];
  quickCompositionAdjustment: ComponentFormState["quickCompositionAdjustment"];
};

function projectFormTechnicalIdentity(
  form: ComponentFormState
): TechnicalIdentityProjection {
  return {
    catalogLineKey: form.catalogLineKey ?? "",
    lineTemplateId: form.lineTemplateId ?? "",
    sistema: form.sistema ?? "",
    configuracion: form.configuracion ?? "",
    hojasBase: form.hojasBase ?? null,
    sheetScheme: form.sheetScheme ?? "",
    sheetVariant: form.sheetVariant ?? "",
    fabricacionTipologia: form.fabricacionTipologia ?? "",
    fabricacionHojas: form.fabricacionHojas ?? null,
    fabricacionModulos: form.fabricacionModulos ?? null,
    fabricacionApertura: form.fabricacionApertura ?? "",
    fabricacionHerraje: form.fabricacionHerraje ?? "",
    fabricacionVariante: form.fabricacionVariante ?? "",
    fabricacionGlazing: form.fabricacionGlazing ?? "",
    fabricacionLeg: form.fabricacionLeg ?? "",
    fabricacionReinforcement: form.fabricacionReinforcement ?? "",
    fabricacionConfiguracionId: form.fabricacionConfiguracionId ?? "",
    fabricacionComposicionId: form.fabricacionComposicionId ?? "",
    fabricacionAnchoHojaAMm: form.fabricacionAnchoHojaAMm ?? null,
    fabricationRecipeId: form.fabricationRecipeId ?? "",
    supplierProviderKey: form.supplierProviderKey ?? "",
    guidedVisualConfig: form.guidedVisualConfig ?? null,
    quickCompositionAdjustment: form.quickCompositionAdjustment ?? null,
  };
}

function buildVisualAndNonStructuralAdjustment(widthMm = 1200, heightMm = 1500) {
  const guidedVisualConfig = createDefaultGuidedVisualConfig({
    widthMm,
    heightMm,
    leafCount: 2,
    openingType: "sliding",
  });
  const quickCompositionAdjustment = setQuickPaneDecoration(
    createEmptyQuickCompositionAdjustment(),
    0,
    "vertical"
  );
  return { guidedVisualConfig, quickCompositionAdjustment };
}

function createVeratecTemplate(): CotizacionLineTemplate {
  return {
    id: 1396,
    nombre: "Veratec 7400 — Corredera 2 hojas",
    categoria: "pvc",
    material: "PVC",
    catalogKey: VERATEC_7400_CATALOG_KEY,
    catalogMetadata: {},
    vidrioPrincipalRecomendado: "Incoloro monolítico 4mm",
    precioM2Sugerido: 144000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
  };
}

function createVeratecRecipeRecord(): FabricationRecipeRecord {
  let idCounter = 0;
  const baseDefinition = crearRecetaVeratec7400Corredera({
    lineName: "Veratec 7400",
    variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    createId: () => `veratec-reg-${idCounter++}`,
  });
  const definition = {
    ...baseDefinition,
    identidad: {
      ...baseDefinition.identidad,
      configurationId: "cfg-veratec-7400-2h",
      compositionId: "cmp-veratec-7400-2m",
    },
  };
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId: 1,
    lineTemplateId: 1396,
    scope: "organization",
    providerName: "VERATEC",
    lineName: "Veratec 7400",
    typology: "corredera",
    leavesCount: 2,
    variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    version: 1,
    status: "draft",
    definition,
    sourceType: "manufacturer",
    sourceName: "VERATEC",
    sourceReference: VERATEC_7400_SOURCE_REFERENCE_MONOLITICO_4MM,
    sourceRevision: VERATEC_7400_SOURCE_REVISION,
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function createWinHouseS75Template(): CotizacionLineTemplate {
  return {
    id: 2401,
    nombre: "WinHouse New S75 — Corredera Doble Riel",
    categoria: "pvc",
    material: "PVC",
    catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    catalogMetadata: {},
    vidrioPrincipalRecomendado: "Incoloro monolítico 4mm",
    precioM2Sugerido: 158000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
  };
}

function createWinHouseS75RecipeRecord(): FabricationRecipeRecord {
  const variant = WINHOUSE_NEW_S75_VARIANTS[0]!;
  let idCounter = 0;
  const baseDefinition = crearRecetaWinHouseNewS75({
    lineName: "WinHouse New S75",
    variant: variant.slug,
    createId: () => `s75-reg-${idCounter++}`,
  });
  const definition = {
    ...baseDefinition,
    identidad: {
      ...baseDefinition.identidad,
      configurationId: "cfg-winhouse-s75-2h",
      compositionId: "cmp-winhouse-s75-2m",
    },
  };
  return {
    id: "22222222-2222-4222-8222-222222222222",
    organizationId: 1,
    lineTemplateId: 2401,
    scope: "organization",
    providerName: "WinHouse",
    lineName: "WinHouse New S75",
    typology: "corredera",
    leavesCount: variant.leaves,
    variant: variant.slug,
    version: 1,
    status: "draft",
    definition,
    sourceType: "manufacturer",
    sourceName: "WinHouse",
    sourceReference: variant.slug,
    sourceRevision: "2026-10",
    parentRecipeId: null,
    validatedAt: null,
    validatedBy: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    eliminadoEn: null,
  };
}

function createSodalL25Template(): CotizacionLineTemplate {
  return {
    id: 3501,
    nombre: "Línea 25 Corredera",
    categoria: "aluminio",
    material: "Aluminio",
    catalogKey: SODAL_L25_CATALOG_KEY,
    catalogMetadata: { familyKey: "sodal_l25" },
    vidrioPrincipalRecomendado: "Termopanel 18mm",
    precioM2Sugerido: 125000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
  };
}

function createSodalL25RecipeRecords(): FabricationRecipeRecord[] {
  return buildAllSodalL25Recipes().map((entry, idx) => ({
    id: `33333333-3333-4333-8333-${String(idx + 1).padStart(12, "0")}`,
    organizationId: 1,
    lineTemplateId: 3501,
    scope: "organization",
    providerName: "SODAL",
    lineName: "L25",
    typology: "corredera",
    leavesCount: entry.identity.leaves,
    variant: entry.identity.variantSlug,
    version: 1,
    status: "validated",
    definition: entry.definition,
    sourceType: "manufacturer",
    sourceName: "Sistema Zeta",
    sourceReference: entry.sourceReference,
    sourceRevision: "sodal-l25-formula-v2",
    parentRecipeId: null,
    validatedAt: "2026-09-01T00:00:00.000Z",
    validatedBy: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    eliminadoEn: null,
  }));
}

function buildScenarioOneFixtures() {
  const { guidedVisualConfig, quickCompositionAdjustment } =
    buildVisualAndNonStructuralAdjustment(1200, 1500);

  const veratecTemplate = createVeratecTemplate();
  const veratecRecipe = createVeratecRecipeRecord();
  const veratecBase = applyLineTemplateToComponentForm(
    {
      ...createEmptyComponentForm([], "", "precio_directo", 0),
      codigo: "V1",
      tipo: "Ventana",
      sistema: "Corredera",
      configuracion: "Corredera",
      hojasBase: 2,
      sheetScheme: "2 hojas",
      sheetVariant: "2 móviles",
      ancho: "1200",
      alto: "1500",
      cantidad: "1",
    },
    veratecTemplate,
    { fabricationRecipes: [veratecRecipe], organizationId: 1 }
  );
  const veratecForm: ComponentFormState = {
    ...veratecBase,
    catalogLineKey: VERATEC_7400_CATALOG_KEY,
    fabricacionTipologia: "corredera",
    fabricacionHojas: 2,
    fabricacionModulos: 2,
    fabricacionApertura: "corredera",
    fabricacionHerraje: "cremona_veratec",
    fabricacionVariante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
    fabricacionGlazing: "monolitico",
    fabricacionLeg: "normal",
    fabricacionReinforcement: "con_refuerzo",
    fabricacionConfiguracionId: "cfg-veratec-7400-2h",
    fabricacionComposicionId: "cmp-veratec-7400-2m",
    fabricacionAnchoHojaAMm: 600,
    fabricationRecipeId: veratecRecipe.id,
    supplierProviderKey: "veratec",
    guidedVisualConfig,
    quickCompositionAdjustment,
  };

  const s75Template = createWinHouseS75Template();
  const s75Recipe = createWinHouseS75RecipeRecord();
  const s75Variant = WINHOUSE_NEW_S75_VARIANTS[0]!;
  const s75Base = applyLineTemplateToComponentForm(
    {
      ...createEmptyComponentForm([], "", "precio_directo", 0),
      codigo: "V2",
      tipo: "Ventana",
      sistema: "Corredera",
      configuracion: "Corredera",
      hojasBase: 2,
      sheetScheme: "2 hojas",
      sheetVariant: "2 móviles",
      ancho: "1400",
      alto: "1200",
      cantidad: "1",
    },
    s75Template,
    { fabricationRecipes: [s75Recipe], organizationId: 1 }
  );
  const s75Form: ComponentFormState = {
    ...s75Base,
    catalogLineKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
    fabricacionTipologia: "corredera",
    fabricacionHojas: 2,
    fabricacionModulos: 2,
    fabricacionApertura: "corredera",
    fabricacionHerraje: "cierre_s75",
    fabricacionVariante: s75Variant.slug,
    fabricacionGlazing: "monolitico",
    fabricacionLeg: "normal",
    fabricacionReinforcement: "con_refuerzo",
    fabricacionConfiguracionId: "cfg-winhouse-s75-2h",
    fabricacionComposicionId: "cmp-winhouse-s75-2m",
    fabricacionAnchoHojaAMm: 700,
    fabricationRecipeId: s75Recipe.id,
    supplierProviderKey: "winhouse",
    guidedVisualConfig,
    quickCompositionAdjustment,
  };

  const sodalTemplate = createSodalL25Template();
  const sodalRecipes = createSodalL25RecipeRecords();
  const sodalRecipe = sodalRecipes.find(
    (recipe) => recipe.leavesCount === 2 && recipe.variant === "dvh_open_reinforced"
  )!;
  const sodalBase = applyLineTemplateToComponentForm(
    {
      ...createEmptyComponentForm([], "", "precio_directo", 0),
      codigo: "V3",
      tipo: "Ventana",
      sistema: "Corredera",
      configuracion: "Corredera",
      hojasBase: 2,
      sheetScheme: "2 hojas",
      sheetVariant: "2 móviles",
      ancho: "1800",
      alto: "1500",
      cantidad: "1",
      fabricacionGlazing: "dvh",
      fabricacionLeg: "open",
      fabricacionReinforcement: "reinforced",
    },
    sodalTemplate,
    { fabricationRecipes: sodalRecipes, organizationId: 1 }
  );
  const sodalForm: ComponentFormState = {
    ...sodalBase,
    catalogLineKey: SODAL_L25_CATALOG_KEY,
    fabricacionTipologia: "corredera",
    fabricacionHojas: 2,
    fabricacionModulos: 2,
    fabricacionApertura: "corredera",
    fabricacionHerraje: "pestillo_l25",
    fabricacionVariante: "dvh_open_reinforced",
    fabricacionGlazing: "dvh",
    fabricacionLeg: "open",
    fabricacionReinforcement: "reinforced",
    fabricacionConfiguracionId: "cfg-sodal-l25-2h",
    fabricacionComposicionId: "cmp-sodal-l25-tp-ref",
    fabricacionAnchoHojaAMm: 750,
    fabricationRecipeId: sodalRecipe.id,
    supplierProviderKey: "sodal",
    guidedVisualConfig,
    quickCompositionAdjustment,
  };

  const customTemplate: CotizacionLineTemplate = {
    id: 4999,
    nombre: "Línea Especial Arquitectónica",
    categoria: "aluminio",
    material: "Aluminio",
    catalogKey: "ventora:custom-arquitectonica",
    catalogMetadata: {},
    vidrioPrincipalRecomendado: "Laminado 6mm",
    precioM2Sugerido: 180000,
    minimoCobrable: 0,
    redondeoPrecio: 1000,
  };
  const customForm: ComponentFormState = {
    ...createEmptyComponentForm([], "", "precio_directo", 0),
    codigo: "V4",
    tipo: "Ventana",
    material: "Aluminio",
    catalogCategoria: "aluminio",
    referencia: customTemplate.nombre,
    lineTemplateId: String(customTemplate.id),
    catalogLineKey: customTemplate.catalogKey ?? "",
    sistema: "Personalizado",
    configuracion: "Personalizado",
    hojasBase: 2,
    sheetScheme: "",
    sheetVariant: "",
    customSchemeDescription: "1 fijo central + 2 proyectantes laterales",
    isCustomScheme: true,
    vidrio: "Laminado 6mm",
    ancho: "2100",
    alto: "1400",
    cantidad: "1",
    costoProveedorUnitario: "529000",
    precioPorM2: "180000",
    minimoCobrable: "0",
    redondeoPrecio: "1000",
    precioPlantillaSugerido: "529000",
    origenPrecio: "plantilla",
    fabricacionTipologia: "compuesta",
    fabricacionHojas: 3,
    fabricacionModulos: 3,
    fabricacionApertura: "proyectante",
    fabricacionHerraje: "brazo_proyectante_pesado",
    fabricacionVariante: "custom_3m_fijo_proy",
    fabricacionGlazing: "laminado",
    fabricacionLeg: "reforzada",
    fabricacionReinforcement: "con_refuerzo",
    fabricacionConfiguracionId: "cfg-custom-3m",
    fabricacionComposicionId: "cmp-custom-fijo-proy",
    fabricacionAnchoHojaAMm: 700,
    fabricationRecipeId: "44444444-4444-4444-8444-444444444444",
    supplierProviderKey: "alumetrica",
    guidedVisualConfig,
    quickCompositionAdjustment,
  };

  return {
    veratec: {
      label: "Veratec 7400 2H",
      form: veratecForm,
      templates: [veratecTemplate],
      recipes: [veratecRecipe],
    },
    winhouseS75: {
      label: "WinHouse New S75 2H",
      form: s75Form,
      templates: [s75Template],
      recipes: [s75Recipe],
    },
    sodalL25: {
      label: "Sodal L25 Corredera",
      form: sodalForm,
      templates: [sodalTemplate],
      recipes: sodalRecipes,
    },
    custom: {
      label: "Configuración personalizada",
      form: customForm,
      templates: [customTemplate],
      recipes: [] as FabricationRecipeRecord[],
    },
  };
}

describe("Escenario 1: identidad técnica completa tras cambios de precio y reconstrucción de formulario", () => {
  const fixtures = buildScenarioOneFixtures();

  it.each([
    ["Veratec 7400 2H", fixtures.veratec],
    ["WinHouse New S75 2H", fixtures.winhouseS75],
    ["Sodal L25 Corredera", fixtures.sodalL25],
    ["Configuración personalizada", fixtures.custom],
  ])(
    "1A: %s conserva todos los discriminadores técnicos al construir el ítem y reconstruir el formulario con mapItemToForm",
    (_label, entry) => {
      const builtItem = buildItemFromForm(entry.form, [], "item-test", {
        lineTemplates: entry.templates,
        fabricationRecipes: entry.recipes,
        organizationId: 1,
      });
      const expected = projectFormTechnicalIdentity({
        ...entry.form,
        fabricacionVariante:
          decodeCotizacionItemPresentationMeta(builtItem.observaciones).fabricacionVariante ||
          entry.form.fabricacionVariante,
        guidedVisualConfig: decodeCotizacionItemPresentationMeta(builtItem.observaciones)
          .guidedVisualConfig,
      });

      const reconstructedForm = mapItemToForm(builtItem);
      const actual = projectFormTechnicalIdentity(reconstructedForm);

      expect(actual).toEqual(expected);
    }
  );

  it.each([
    ["Veratec 7400 2H", fixtures.veratec],
    ["WinHouse New S75 2H", fixtures.winhouseS75],
    ["Sodal L25 Corredera", fixtures.sodalL25],
    ["Configuración personalizada", fixtures.custom],
  ])(
    "1B: %s conserva todos los discriminadores técnicos al cambiar el margen con applyQuotePricingToItems('margen', '35') y reconstruir con mapItemToForm",
    (_label, entry) => {
      const builtItem = buildItemFromForm(entry.form, [], "item-test", {
        lineTemplates: entry.templates,
        fabricationRecipes: entry.recipes,
        organizationId: 1,
      });
      const originalIdentity = projectFormTechnicalIdentity({
        ...entry.form,
        fabricacionVariante:
          decodeCotizacionItemPresentationMeta(builtItem.observaciones).fabricacionVariante ||
          entry.form.fabricacionVariante,
        guidedVisualConfig: decodeCotizacionItemPresentationMeta(builtItem.observaciones)
          .guidedVisualConfig,
      });

      const [repricedItem] = applyQuotePricingToItems([builtItem], "margen", "35");
      const reconstructedForm = mapItemToForm(repricedItem!);
      const repricedIdentity = projectFormTechnicalIdentity(reconstructedForm);

      expect(repricedIdentity).toEqual(originalIdentity);
    }
  );

  it.each([
    ["Veratec 7400 2H", fixtures.veratec],
    ["WinHouse New S75 2H", fixtures.winhouseS75],
    ["Sodal L25 Corredera", fixtures.sodalL25],
    ["Configuración personalizada", fixtures.custom],
  ])(
    "1C: %s conserva todos los discriminadores técnicos al cambiar modo de precio con applyQuotePricingToItems('precio_directo', '0') y reconstruir con mapItemToForm",
    (_label, entry) => {
      const builtItem = buildItemFromForm(entry.form, [], "item-test", {
        lineTemplates: entry.templates,
        fabricationRecipes: entry.recipes,
        organizationId: 1,
      });
      const originalIdentity = projectFormTechnicalIdentity({
        ...entry.form,
        fabricacionVariante:
          decodeCotizacionItemPresentationMeta(builtItem.observaciones).fabricacionVariante ||
          entry.form.fabricacionVariante,
        guidedVisualConfig: decodeCotizacionItemPresentationMeta(builtItem.observaciones)
          .guidedVisualConfig,
      });

      const [marginItem] = applyQuotePricingToItems([builtItem], "margen", "35");
      const [directItem] = applyQuotePricingToItems([marginItem!], "precio_directo", "0");
      const reconstructedForm = mapItemToForm(directItem!);
      const finalIdentity = projectFormTechnicalIdentity(reconstructedForm);

      expect(finalIdentity).toEqual(originalIdentity);
    }
  );
});

describe("Escenario 2: invalidación segura de snapshots vs. preservación histórica", () => {
  const fixtures = buildScenarioOneFixtures();

  function buildVeratecItemWithSnapshot(): {
    item: CotizacionWorkflowItem;
    snapshot: FabricacionCotizacionSnapshot;
    template: CotizacionLineTemplate;
    recipe: FabricationRecipeRecord;
  } {
    const { form, templates, recipes } = fixtures.veratec;
    const baseItem = buildItemFromForm(form, [], "item-veratec-1", {
      lineTemplates: templates,
      fabricationRecipes: recipes,
      organizationId: 1,
    });
    const resolution = resolveFabricacionDespieceForQuoteItem({
      item: baseItem,
      recipes,
      organizationId: 1,
    });
    if (!resolution.formal) {
      throw new Error("Se esperaba snapshot formal para Veratec 7400 2H");
    }
    const itemWithSnapshot: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: resolution.formal,
    };
    return {
      item: itemWithSnapshot,
      snapshot: resolution.formal,
      template: templates[0]!,
      recipe: recipes[0]!,
    };
  }

  it("2A: cambiar solo margen o modo de precio NO debe invalidar fabricacionSnapshot ni marcar el ítem para recálculo al guardar", () => {
    const { item, snapshot } = buildVeratecItemWithSnapshot();

    const [repricedItem] = applyQuotePricingToItems([item], "margen", "40");
    const savePreparation = prepareFabricacionSnapshotsForQuoteSave({
      existingId: 500,
      finalizingDraft: false,
      existingItems: [item],
      items: [repricedItem!],
    });

    expect(savePreparation.itemIdsToResolve.has(item.id)).toBe(false);
    expect(savePreparation.items[0]?.fabricacionSnapshot).toEqual(snapshot);
  });

  it("2B.1: invalida fabricacionSnapshot cuando cambia realmente una dimensión (ancho o alto)", () => {
    const { item, template, recipe } = buildVeratecItemWithSnapshot();

    const editedForm: ComponentFormState = {
      ...mapItemToForm(item),
      ancho: "1450",
    };
    const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(rebuilt.fabricacionSnapshot).toBeNull();

    const savePreparation = prepareFabricacionSnapshotsForQuoteSave({
      existingId: 500,
      finalizingDraft: false,
      existingItems: [item],
      items: [rebuilt],
    });
    expect(savePreparation.itemIdsToResolve.has(item.id)).toBe(true);
    expect(savePreparation.items[0]?.fabricacionSnapshot).toBeNull();
  });

  it("2B.2: invalida fabricacionSnapshot cuando cambia realmente la composición estructural (quickCompositionAdjustment)", () => {
    const { item, template, recipe } = buildVeratecItemWithSnapshot();

    const editedForm: ComponentFormState = {
      ...mapItemToForm(item),
      quickCompositionAdjustment: {
        ...createEmptyQuickCompositionAdjustment(),
        fixedTopMm: 300,
      },
    };
    const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(rebuilt.fabricacionSnapshot).toBeNull();
  });

  it("2B.3: invalida fabricacionSnapshot cuando cambia realmente el vidrio (p. ej. 4mm -> 5mm)", () => {
    const { item, template, recipe } = buildVeratecItemWithSnapshot();

    const editedForm: ComponentFormState = {
      ...mapItemToForm(item),
      vidrio: "Incoloro monolítico 5mm",
    };
    const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(rebuilt.fabricacionSnapshot).toBeNull();
  });

  it("2B.4: invalida fabricacionSnapshot cuando cambian discriminadores de variante (glazing, leg, reinforcement o configuración)", () => {
    const { item, template, recipe } = buildVeratecItemWithSnapshot();

    const editedForm: ComponentFormState = {
      ...mapItemToForm(item),
      fabricacionGlazing: "termopanel",
      fabricacionLeg: "reforzada",
      fabricacionReinforcement: "sin_refuerzo",
      fabricacionConfiguracionId: "cfg-veratec-7400-tp",
    };
    const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(rebuilt.fabricacionSnapshot).toBeNull();
  });

  const singleDiscriminatorChanges: Array<
    [string, (form: ComponentFormState) => ComponentFormState]
  > = [
    ["tipología", (form) => ({ ...form, fabricacionTipologia: "fijo" })],
    ["hojas", (form) => ({ ...form, fabricacionHojas: 3 })],
    ["módulos", (form) => ({ ...form, fabricacionModulos: 3 })],
    ["apertura", (form) => ({ ...form, fabricacionApertura: "abatible" })],
    ["herraje", (form) => ({ ...form, fabricacionHerraje: "otro-herraje" })],
    ["variante", (form) => ({ ...form, fabricacionVariante: "otra-variante" })],
    ["receta", (form) => ({ ...form, fabricationRecipeId: "otra-receta" })],
    ["configuración", (form) => ({ ...form, fabricacionConfiguracionId: "otra-config" })],
    ["composición", (form) => ({ ...form, fabricacionComposicionId: "otra-composicion" })],
    ["vidrio técnico", (form) => ({ ...form, fabricacionGlazing: "termopanel" })],
    ["pierna", (form) => ({ ...form, fabricacionLeg: "reforzada" })],
    ["refuerzo", (form) => ({ ...form, fabricacionReinforcement: "sin_refuerzo" })],
    ["ancho hoja A", (form) => ({ ...form, fabricacionAnchoHojaAMm: 700 })],
    ["esquema de hojas", (form) => ({ ...form, sheetScheme: "3 hojas" })],
    ["variante de hojas", (form) => ({ ...form, sheetVariant: "1 fija + 1 móvil" })],
    ["sistema", (form) => ({ ...form, sistema: "Abatible" })],
    ["configuración comercial", (form) => ({ ...form, configuracion: "Proyectante" })],
    ["línea de catálogo", (form) => ({ ...form, catalogLineKey: "ventora:otra-linea" })],
  ];

  it.each(singleDiscriminatorChanges)(
    "2B.4.x: invalida el snapshot al cambiar solo el discriminador %s",
    (_label, changeForm) => {
      const { item, template, recipe } = buildVeratecItemWithSnapshot();
      const editedForm = changeForm(mapItemToForm(item));
      const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
        lineTemplates: [template],
        fabricationRecipes: [recipe],
        organizationId: 1,
      });

      expect(rebuilt.fabricacionSnapshot).toBeNull();
    }
  );

  it.each([
    ["receta", { fabricationRecipeId: "" }],
    ["variante", { fabricacionVariante: "" }],
    ["configuración", { fabricacionConfiguracionId: "" }],
  ] as const)(
    "2B.4.y: permite borrar intencionalmente solo la %s sin retener el snapshot anterior",
    (_label, clearedField) => {
      const { item, template, recipe } = buildVeratecItemWithSnapshot();
      const editedForm: ComponentFormState = {
        ...mapItemToForm(item),
        ...clearedField,
      };
      const rebuilt = buildItemFromForm(editedForm, [item], item.id, {
        lineTemplates: [template],
        fabricationRecipes: [recipe],
        organizationId: 1,
      });

      expect(rebuilt.fabricacionSnapshot).toBeNull();
      const reopenedForm = mapItemToForm(rebuilt);
      const rehydratedForm = hydrateComponentFormFromLineTemplate(reopenedForm, {
        lineTemplates: [template],
        fabricationRecipes: [recipe],
        organizationId: 1,
      });
      const field = Object.keys(clearedField)[0] as keyof ComponentFormState;
      expect(rehydratedForm[field]).toBe("");
    }
  );

  it("2B.5: invalida fabricacionSnapshot y limpia discriminadores residuales al cambiar de línea (Sodal L25 -> Veratec 7400)", () => {
    const sodalItem = buildItemFromForm(fixtures.sodalL25.form, [], "item-sodal-1", {
      lineTemplates: fixtures.sodalL25.templates,
      fabricationRecipes: fixtures.sodalL25.recipes,
      organizationId: 1,
    });
    expect(sodalItem.fabricacionSnapshot).not.toBeNull();

    const veratecTemplate = fixtures.veratec.templates[0]!;
    const veratecRecipe = fixtures.veratec.recipes[0]!;
    const switchedForm = applyLineTemplateToComponentForm(
      mapItemToForm(sodalItem),
      veratecTemplate,
      {
        fabricationRecipes: [veratecRecipe],
        organizationId: 1,
      }
    );
    const switchedItem = buildItemFromForm(switchedForm, [sodalItem], sodalItem.id, {
      lineTemplates: [veratecTemplate],
      fabricationRecipes: [veratecRecipe],
      organizationId: 1,
    });
    const switchedMeta = decodeCotizacionItemPresentationMeta(switchedItem.observaciones);

    expect({
      fabricacionSnapshot: switchedItem.fabricacionSnapshot,
      catalogLineKey: switchedMeta.catalogLineKey,
      fabricacionGlazing: switchedMeta.fabricacionGlazing,
      fabricacionLeg: switchedMeta.fabricacionLeg,
      fabricacionReinforcement: switchedMeta.fabricacionReinforcement,
      fabricacionAnchoHojaAMm: switchedMeta.fabricacionAnchoHojaAMm,
      supplierProviderKey: switchedMeta.supplierProviderKey,
    }).toEqual({
      fabricacionSnapshot: null,
      catalogLineKey: VERATEC_7400_CATALOG_KEY,
      fabricacionGlazing: "",
      fabricacionLeg: "",
      fabricacionReinforcement: "",
      fabricacionAnchoHojaAMm: null,
      supplierProviderKey: "",
    });
  });

  it("2B.6: respeta la política de snapshots históricos (no recalcula NULL históricos intactos ni destruye snapshots guardados sin cambios)", () => {
    const { item: savedWithSnapshot, snapshot } = buildVeratecItemWithSnapshot();
    const historicalNullItem: CotizacionWorkflowItem = {
      ...savedWithSnapshot,
      id: "item-historical-null",
      codigo: "V9",
      fabricacionSnapshot: null,
    };

    const savePreparation = prepareFabricacionSnapshotsForQuoteSave({
      existingId: 900,
      finalizingDraft: false,
      existingItems: [savedWithSnapshot, historicalNullItem],
      items: [savedWithSnapshot, historicalNullItem],
    });

    expect(savePreparation.itemIdsToResolve.size).toBe(0);
    expect(savePreparation.items[0]?.fabricacionSnapshot).toEqual(snapshot);
    expect(savePreparation.items[1]?.fabricacionSnapshot).toBeNull();
  });

  it.each([
    ["sin tags", "Nota histórica sin tags de identidad", false],
    ["metadata parcial", "[frid:11111111-1111-4111-8111-111111111111]", true],
  ] as const)(
    "2B.6.1: conserva snapshot histórico con %s",
    (_label, observaciones, hasPersistedMetadata) => {
    const { item, snapshot, template, recipe } = buildVeratecItemWithSnapshot();
    const historicalItem: CotizacionWorkflowItem = {
      ...item,
      observaciones,
    };
    const reopenedForm = mapItemToForm(historicalItem);
    const rehydratedForm = hydrateComponentFormFromLineTemplate(reopenedForm, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });
    const rebuilt = buildItemFromForm(rehydratedForm, [historicalItem], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(reopenedForm.fabricacionIdentidadPersistida).toBe(hasPersistedMetadata);
    expect(reopenedForm.fabricationRecipeId).toBe(snapshot.recipeId);
    expect(rebuilt.fabricacionSnapshot).toEqual(snapshot);
    }
  );

  it("2B.7: rehidratar o reasignar la misma línea no limpia atributos válidos ni destruye el snapshot vigente", () => {
    const { item, snapshot, template, recipe } = buildVeratecItemWithSnapshot();
    const reopenedForm = mapItemToForm(item);
    const expectedIdentity = projectFormTechnicalIdentity(reopenedForm);

    const rehydratedForm = hydrateComponentFormFromLineTemplate(reopenedForm, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });
    const reassignedSameLineForm = applyLineTemplateToComponentForm(
      rehydratedForm,
      template,
      {
        fabricationRecipes: [recipe],
        organizationId: 1,
      }
    );
    const rebuiltSameLine = buildItemFromForm(reassignedSameLineForm, [item], item.id, {
      lineTemplates: [template],
      fabricationRecipes: [recipe],
      organizationId: 1,
    });

    expect(projectFormTechnicalIdentity(rehydratedForm)).toEqual(expectedIdentity);
    expect(projectFormTechnicalIdentity(reassignedSameLineForm)).toEqual(expectedIdentity);
    expect(rebuiltSameLine.fabricacionSnapshot).toEqual(snapshot);
  });
});

describe("Escenario 3: conteo y reconciliación de vidrios con recipe_trace, slots manuales y casos históricos", () => {
  const fixtures = buildScenarioOneFixtures();
  const catalogGlass4mmMeta = {
    espesor: "4mm",
    categoriaTecnica: "monolitico",
    revisionTecnicaExplicita: true,
    corteManualEstado: "confirmed",
    planchaAnchoMm: 2500,
    planchaAltoMm: 1800,
  };
  const catalogGlassLam6mmMeta = {
    espesor: "6mm",
    categoriaTecnica: "laminado",
    revisionTecnicaExplicita: true,
    corteManualEstado: "confirmed",
    planchaAnchoMm: 3210,
    planchaAltoMm: 2250,
  };

  function buildVeratecDraft2HItem(overrides?: Partial<ComponentFormState>) {
    const { form, templates, recipes } = fixtures.veratec;
    const effectiveForm: ComponentFormState = { ...form, ...overrides };
    const baseItem = buildItemFromForm(effectiveForm, [], "item-glass-2h", {
      lineTemplates: templates,
      fabricationRecipes: recipes,
      organizationId: 1,
    });
    const resolution = resolveFabricacionDespieceForQuoteItem({
      item: baseItem,
      recipes,
      organizationId: 1,
    });
    const snapshot = resolution.formal!;
    const itemWithLogicalId: CotizacionWorkflowItem = {
      ...baseItem,
      observaciones: encodeCotizacionItemPresentationMeta({
        ...decodeCotizacionItemPresentationMeta(baseItem.observaciones),
        logicalComponentId: "logical-veratec-2h",
      }),
      fabricacionSnapshot: snapshot,
    };
    return { item: itemWithLogicalId, snapshot, templates, recipes };
  }

  it("3A.1: receta preliminar 2H con dos paños agrupados (recipe_trace) no duplica referencias pendientes contra los 2 slots esperados", () => {
    const { item: itemWithDraftSnapshot } = buildVeratecDraft2HItem();
    const presentation = decodeCotizacionItemPresentationMeta(
      itemWithDraftSnapshot.observaciones
    );
    const expectedSlots = resolveManualGlassPaneSlots({
      componentType: presentation.fabricacionTipologia || itemWithDraftSnapshot.tipo,
      system: presentation.sistema,
      configuration: presentation.configuracion,
      sheetScheme: presentation.sheetScheme,
      fabricacionHojas: presentation.fabricacionHojas,
      guidedVisualConfig: presentation.guidedVisualConfig,
      quickCompositionAdjustment: presentation.quickCompositionAdjustment,
    });
    expect(expectedSlots.countIsKnown).toBe(true);
    expect(expectedSlots.slots).toHaveLength(2);

    const extractedPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 700,
      item: itemWithDraftSnapshot,
    });
    expect(extractedPanes).toHaveLength(1);
    expect(extractedPanes[0]).toMatchObject({
      dimensionProvenance: "recipe_trace",
      recipeStatus: "draft",
      quantity: 2,
      validationStatus: "requires_review",
    });

    const coverage = buildGlassDistributionCoverage({
      items: [itemWithDraftSnapshot],
      panes: extractedPanes,
    });

    expect(coverage.status).toBe("unavailable");
    expect(coverage.completeReferenceCount).toBe(0);
    expect(coverage.pendingReferenceCount).toBe(1);
    expect(coverage.pendingReferenceCount).toBeLessThanOrEqual(expectedSlots.slots.length);
  });

  it("3A.2: receta preliminar 2H con dos paños separados (Hoja A y Hoja B) reporta exactamente 2 referencias pendientes y no 4", () => {
    const { item: baseItem, snapshot: baseSnapshot } = buildVeratecDraft2HItem();
    const firstGlass = baseSnapshot.result.vidrios[0]!;
    const twoRowDraftSnapshot: FabricacionCotizacionSnapshot = {
      ...baseSnapshot,
      recipeStatus: "draft",
      result: {
        ...baseSnapshot.result,
        vidrios: [
          { ...firstGlass, vidrioId: "vidrio-hoja-a", nombre: "Vidrio Hoja A", cantidadPiezas: 1 },
          { ...firstGlass, vidrioId: "vidrio-hoja-b", nombre: "Vidrio Hoja B", cantidadPiezas: 1 },
        ],
      },
    };
    const itemWithTwoRowDraft: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: twoRowDraftSnapshot,
    };

    const extractedPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 701,
      item: itemWithTwoRowDraft,
    });
    expect(extractedPanes).toHaveLength(2);
    expect(extractedPanes.every((pane) => pane.dimensionProvenance === "recipe_trace")).toBe(true);

    const coverage = buildGlassDistributionCoverage({
      items: [itemWithTwoRowDraft],
      panes: extractedPanes,
    });

    expect(coverage.status).toBe("unavailable");
    expect(coverage.completeReferenceCount).toBe(0);
    expect(coverage.pendingReferenceCount).toBe(2);
  });

  it("3B: un paño manual confirmado (pane-1) y otro preliminar (recipe_trace) sin correspondencia explícita reportan 1 completo y 1 pendiente sin duplicar ni ocultar el slot faltante", () => {
    const { item: baseItem, snapshot: baseSnapshot } = buildVeratecDraft2HItem();
    const firstGlass = baseSnapshot.result.vidrios[0]!;
    const expectedTechSpec = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-4mm",
      metadata: catalogGlass4mmMeta,
    });

    for (const draftVidrios of [
      [{ ...firstGlass, vidrioId: "vidrio-parcial-sin-slot", cantidadPiezas: 1 }],
      [
        { ...firstGlass, vidrioId: "vidrio-hoja-a", nombre: "Vidrio Hoja A", cantidadPiezas: 1 },
        { ...firstGlass, vidrioId: "vidrio-hoja-b", nombre: "Vidrio Hoja B", cantidadPiezas: 1 },
      ],
    ]) {
      const itemWithManualSlot1AndUnboundTrace: CotizacionWorkflowItem = {
        ...baseItem,
        manualGlassMeasurements: {
          version: 2,
          expectedPaneCount: 2,
          entries: [
            {
              id: "manual-slot-1",
              source: "manual",
              version: 2,
              productId: "glass-prod-4mm",
              technicalFingerprint: getCatalogGlassTechnicalFingerprint(expectedTechSpec),
              widthMm: 442,
              heightMm: 1323,
              quantity: 1,
              quantityBasis: "per_component",
              paneSlotId: "pane-1",
              sourcePosition: "Paño 1",
              rectangularVerified: true,
              recordedAt: "2026-10-27T12:00:00.000Z",
            },
          ],
        },
        fabricacionSnapshot: {
          ...baseSnapshot,
          recipeStatus: "draft",
          result: { ...baseSnapshot.result, vidrios: draftVidrios },
        },
      };

      const extractedPanes = extractNormalizedGlassPanes({
        organizationId: 1,
        quoteId: 702,
        item: itemWithManualSlot1AndUnboundTrace,
        catalogGlassProducts: new Map([
          ["glass-prod-4mm", { name: "Incoloro monolítico 4mm", catalogMetadata: catalogGlass4mmMeta }],
        ]),
      });

      const coverage = buildGlassDistributionCoverage({
        items: [itemWithManualSlot1AndUnboundTrace],
        panes: extractedPanes,
      });

      expect(coverage.status).toBe("partial");
      expect(coverage.completeReferenceCount).toBe(1);
      expect(coverage.pendingReferenceCount).toBe(1);
    }
  });

  it("3C: dos vidrios distintos en una misma composición 2H reconcilian cada slot por su paneSlotId sin duplicar pendientes", () => {
    const { item: baseItem } = buildVeratecDraft2HItem();
    const spec4mm = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-4mm",
      metadata: catalogGlass4mmMeta,
    });
    const specLam6mm = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-lam6mm",
      metadata: catalogGlassLam6mmMeta,
    });
    const catalogMap = new Map([
      ["glass-prod-4mm", { name: "Incoloro monolítico 4mm", catalogMetadata: catalogGlass4mmMeta }],
      ["glass-prod-lam6mm", { name: "Laminado 6mm", catalogMetadata: catalogGlassLam6mmMeta }],
    ]);

    const itemTwoValidDistinctGlasses: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
      manualGlassMeasurements: {
        version: 2,
        expectedPaneCount: 2,
        entries: [
          {
            id: "manual-pane-1-4mm",
            source: "manual",
            version: 2,
            productId: "glass-prod-4mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
            widthMm: 550,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            paneSlotId: "pane-1",
            sourcePosition: "Paño 1",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
          {
            id: "manual-pane-2-lam6mm",
            source: "manual",
            version: 2,
            productId: "glass-prod-lam6mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(specLam6mm),
            widthMm: 550,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            paneSlotId: "pane-2",
            sourcePosition: "Paño 2",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
        ],
      },
    };

    const completePanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 703,
      item: itemTwoValidDistinctGlasses,
      catalogGlassProducts: catalogMap,
    });
    const completeCoverage = buildGlassDistributionCoverage({
      items: [itemTwoValidDistinctGlasses],
      panes: completePanes,
    });
    expect(completeCoverage).toMatchObject({
      status: "complete",
      completeReferenceCount: 2,
      pendingReferenceCount: 0,
    });

    // Si el segundo vidrio en pane-2 tiene ficha desactualizada o requiere revisión, pane-1 queda completo y pane-2 pendiente (sin agregar un 3er pendiente).
    const partialPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 703,
      item: itemTwoValidDistinctGlasses,
      catalogGlassProducts: new Map([
        ["glass-prod-4mm", { name: "Incoloro monolítico 4mm", catalogMetadata: catalogGlass4mmMeta }],
      ]),
    });
    const partialCoverage = buildGlassDistributionCoverage({
      items: [itemTwoValidDistinctGlasses],
      panes: partialPanes,
    });
    expect(partialCoverage.status).toBe("partial");
    expect(partialCoverage.completeReferenceCount).toBe(1);
    expect(partialCoverage.pendingReferenceCount).toBe(1);
  });

  it("3D: cantidad comercial mayor que uno (cantidad = 3) cuenta cada paño físico una sola vez por componente y por unidad", () => {
    const { item: draftItem3x, snapshot: draftSnapshot3x } = buildVeratecDraft2HItem({
      cantidad: "3",
    });
    expect(draftItem3x.cantidad).toBe(3);
    expect(draftSnapshot3x.result.vidrios[0]?.cantidadPiezas).toBe(6);

    const draftPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 704,
      item: draftItem3x,
    });
    expect(draftPanes).toHaveLength(1);
    expect(draftPanes[0]?.quantity).toBe(6);

    const draftCoverage = buildGlassDistributionCoverage({
      items: [draftItem3x],
      panes: draftPanes,
    });
    expect(draftCoverage.status).toBe("unavailable");
    expect(draftCoverage.completeReferenceCount).toBe(0);
    expect(draftCoverage.pendingReferenceCount).toBe(1);

    // Receta preliminar 2H con 2 filas separadas y cantidad comercial = 3 (3 unidades por hoja = 6 piezas totales)
    const firstGlass = draftSnapshot3x.result.vidrios[0]!;
    const itemTwoRows3x: CotizacionWorkflowItem = {
      ...draftItem3x,
      fabricacionSnapshot: {
        ...draftSnapshot3x,
        result: {
          ...draftSnapshot3x.result,
          vidrios: [
            { ...firstGlass, vidrioId: "hoja-a", nombre: "Hoja A", cantidadPiezas: 3 },
            { ...firstGlass, vidrioId: "hoja-b", nombre: "Hoja B", cantidadPiezas: 3 },
          ],
        },
      },
    };
    const twoRowPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 704,
      item: itemTwoRows3x,
    });
    const twoRowCoverage = buildGlassDistributionCoverage({
      items: [itemTwoRows3x],
      panes: twoRowPanes,
    });
    expect(twoRowCoverage.pendingReferenceCount).toBe(2);
  });

  it("3E: ausencia de snapshot reporta exactamente los slots esperados pendientes sin inflar ni ocultar referencias", () => {
    const { item: baseItem } = buildVeratecDraft2HItem();
    const itemWithoutSnapshot: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
    };

    const extractedPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 705,
      item: itemWithoutSnapshot,
    });
    expect(extractedPanes).toEqual([]);

    const coverage = buildGlassDistributionCoverage({
      items: [itemWithoutSnapshot],
      panes: extractedPanes,
    });
    expect(coverage.status).toBe("unavailable");
    expect(coverage.completeReferenceCount).toBe(0);
    expect(coverage.pendingReferenceCount).toBe(2);
  });

  it("3F: snapshot histórico válido conserva cobertura completa y snapshot legacy [cub:] permanece pendiente sin duplicarse contra slots", () => {
    const { item: baseItem, snapshot: baseSnapshot } = buildVeratecDraft2HItem();
    const spec4mm = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-4mm",
      metadata: catalogGlass4mmMeta,
    });
    const firstGlass = baseSnapshot.result.vidrios[0]!;
    const glassWithoutTrace = { ...firstGlass };
    delete (glassWithoutTrace as { trazabilidad?: unknown }).trazabilidad;

    const historicalValidItem: CotizacionWorkflowItem = {
      ...baseItem,
      observaciones: encodeCotizacionItemPresentationMeta({
        ...decodeCotizacionItemPresentationMeta(baseItem.observaciones),
        logicalComponentId: "logical-hist-valid",
        vidrioLineTemplateId: "glass-prod-4mm",
        glassTechnicalSpec: spec4mm,
      }),
      fabricacionSnapshot: {
        ...baseSnapshot,
        recipeStatus: "validated",
        glassSelection: {
          productId: "glass-prod-4mm",
          displayName: "Incoloro monolítico 4mm",
          technicalSpec: spec4mm,
        },
        result: {
          ...baseSnapshot.result,
          vidrios: [glassWithoutTrace],
        },
      },
    };

    const validPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 706,
      item: historicalValidItem,
    });
    const validCoverage = buildGlassDistributionCoverage({
      items: [historicalValidItem],
      panes: validPanes,
    });
    expect(validCoverage).toMatchObject({
      status: "complete",
      completeReferenceCount: 1,
      pendingReferenceCount: 0,
    });

    // Legacy [cub:] snapshot en corredera 2H con quantity = 2 no debe duplicarse a 3 pendientes
    const legacyCubItem: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
      observaciones: encodeCotizacionItemCubicationOverride(
        encodeCotizacionItemPresentationMeta({
          ...decodeCotizacionItemPresentationMeta(baseItem.observaciones),
          logicalComponentId: "logical-hist-cub",
        }),
        {
          v: 1,
          source: "auto",
          lineTemplateId: "1396",
          system: "corredera",
          status: "validada",
          capturedAt: "2026-08-01T00:00:00.000Z",
          widthMm: 1200,
          heightMm: 1500,
          quantity: 1,
          cuts: [
            {
              label: "Marco",
              functionLabel: "Riel superior",
              quantity: 1,
              lengthMm: 1200,
              totalLinealMm: 1200,
            },
          ],
          bars: [],
          totalUsedMm: 0,
          totalWasteMm: 0,
          wastePct: 0,
          totalProfilesLinealMm: 0,
          accessoryUnits: 0,
          glass: {
            widthMm: 550,
            heightMm: 1320,
            quantity: 2,
            areaEachM2: 0.726,
            totalM2: 1.452,
          },
        }
      ),
    };
    const legacyPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 706,
      item: legacyCubItem,
    });
    const legacyCoverage = buildGlassDistributionCoverage({
      items: [legacyCubItem],
      panes: legacyPanes,
    });
    expect(legacyCoverage.status).toBe("unavailable");
    expect(legacyCoverage.completeReferenceCount).toBe(0);
    expect(legacyCoverage.pendingReferenceCount).toBe(1);
    expect(legacyCoverage.pendingReferences[0]?.reason).toMatch(/snapshot legacy/i);
  });

  it("3G: paños validados (agrupados o separados) y mediciones manuales completas sobre un componente preliminar no duplican unidades ni referencias", () => {
    const { item: baseItem, snapshot: baseSnapshot } = buildVeratecDraft2HItem();
    const spec4mm = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-4mm",
      metadata: catalogGlass4mmMeta,
    });
    const firstGlass = baseSnapshot.result.vidrios[0]!;

    // Caso 1: Receta validada con 2 filas separadas (Hoja A y Hoja B)
    const validatedTwoRowItem: CotizacionWorkflowItem = {
      ...baseItem,
      observaciones: encodeCotizacionItemPresentationMeta({
        ...decodeCotizacionItemPresentationMeta(baseItem.observaciones),
        logicalComponentId: "logical-val-2row",
        vidrioLineTemplateId: "glass-prod-4mm",
        glassTechnicalSpec: spec4mm,
      }),
      fabricacionSnapshot: {
        ...baseSnapshot,
        recipeStatus: "validated",
        glassSelection: {
          productId: "glass-prod-4mm",
          displayName: "Incoloro monolítico 4mm",
          technicalSpec: spec4mm,
        },
        result: {
          ...baseSnapshot.result,
          vidrios: [
            { ...firstGlass, vidrioId: "hoja-a", nombre: "Hoja A", cantidadPiezas: 1 },
            { ...firstGlass, vidrioId: "hoja-b", nombre: "Hoja B", cantidadPiezas: 1 },
          ],
        },
      },
    };
    const validatedPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 707,
      item: validatedTwoRowItem,
    });
    expect(validatedPanes).toHaveLength(2);
    expect(validatedPanes.reduce((sum, p) => sum + p.quantity, 0)).toBe(2);
    const validatedCoverage = buildGlassDistributionCoverage({
      items: [validatedTwoRowItem],
      panes: validatedPanes,
    });
    expect(validatedCoverage).toMatchObject({
      status: "complete",
      completeReferenceCount: 2,
      pendingReferenceCount: 0,
    });

    // Caso 2: Componente con snapshot preliminar (productId null) donde el taller completó manualmente ambos slots (pane-1 y pane-2)
    const itemWithBothManualSlotsAndDraftSnapshot: CotizacionWorkflowItem = {
      ...baseItem,
      manualGlassMeasurements: {
        version: 2,
        expectedPaneCount: 2,
        entries: [1, 2].map((idx) => ({
          id: `manual-slot-${idx}`,
          source: "manual" as const,
          version: 2 as const,
          productId: "glass-prod-4mm",
          technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
          widthMm: 550,
          heightMm: 1320,
          quantity: 1,
          quantityBasis: "per_component" as const,
          paneSlotId: `pane-${idx}`,
          sourcePosition: `Paño ${idx}`,
          rectangularVerified: true,
          recordedAt: "2026-10-27T12:00:00.000Z",
        })),
      },
    };
    const manualOverDraftPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 707,
      item: itemWithBothManualSlotsAndDraftSnapshot,
      catalogGlassProducts: new Map([
        ["glass-prod-4mm", { name: "Incoloro monolítico 4mm", catalogMetadata: catalogGlass4mmMeta }],
      ]),
    });
    expect(manualOverDraftPanes).toHaveLength(2);
    expect(manualOverDraftPanes.every((pane) => pane.dimensionProvenance === "manual")).toBe(true);
    const manualOverDraftCoverage = buildGlassDistributionCoverage({
      items: [itemWithBothManualSlotsAndDraftSnapshot],
      panes: manualOverDraftPanes,
    });
    expect(manualOverDraftCoverage).toMatchObject({
      status: "complete",
      completeReferenceCount: 2,
      pendingReferenceCount: 0,
    });
  });

  it("3H: slots ambiguos, duplicados, sin paneSlotId en multi-hoja o con huella vencida no se marcan completos ni se asignan por índice", () => {
    const { item: baseItem } = buildVeratecDraft2HItem();
    const spec4mm = buildCatalogGlassTechnicalSpec({
      productId: "glass-prod-4mm",
      metadata: catalogGlass4mmMeta,
    });
    const catalogMap = new Map([
      ["glass-prod-4mm", { name: "Incoloro monolítico 4mm", catalogMetadata: catalogGlass4mmMeta }],
    ]);

    // 1) Dos entradas manuales que reclaman el mismo slot "pane-1" dejando "pane-2" vacío
    const duplicateSlotItem: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
      manualGlassMeasurements: {
        version: 2,
        expectedPaneCount: 2,
        entries: [
          {
            id: "dup-slot-1a",
            source: "manual",
            version: 2,
            productId: "glass-prod-4mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
            widthMm: 550,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            paneSlotId: "pane-1",
            sourcePosition: "Paño 1",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
          {
            id: "dup-slot-1b",
            source: "manual",
            version: 2,
            productId: "glass-prod-4mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
            widthMm: 560,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            paneSlotId: "pane-1",
            sourcePosition: "Paño 1",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
        ],
      },
    };
    const dupPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 708,
      item: duplicateSlotItem,
      catalogGlassProducts: catalogMap,
    });
    const dupCoverage = buildGlassDistributionCoverage({
      items: [duplicateSlotItem],
      panes: dupPanes,
    });
    expect(dupPanes.every((pane) => pane.validationStatus === "requires_review")).toBe(true);
    expect(dupCoverage.status).toBe("unavailable");
    expect(dupCoverage.completeReferenceCount).toBe(0);
    expect(dupCoverage.pendingReferenceCount).toBe(2);

    // 2) Una entrada manual con pane-1 y otra entrada manual SIN paneSlotId en ventana 2H: no se asigna por índice a pane-2
    const unslottedSecondManualItem: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
      manualGlassMeasurements: {
        version: 2,
        expectedPaneCount: 2,
        entries: [
          {
            id: "manual-slot-1",
            source: "manual",
            version: 2,
            productId: "glass-prod-4mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
            widthMm: 550,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            paneSlotId: "pane-1",
            sourcePosition: "Paño 1",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
          {
            id: "manual-unslotted",
            source: "manual",
            version: 2,
            productId: "glass-prod-4mm",
            technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
            widthMm: 550,
            heightMm: 1320,
            quantity: 1,
            quantityBasis: "per_component",
            rectangularVerified: true,
            recordedAt: "2026-10-27T12:00:00.000Z",
          },
        ],
      },
    };
    const unslottedPanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 708,
      item: unslottedSecondManualItem,
      catalogGlassProducts: catalogMap,
    });
    const unslottedCoverage = buildGlassDistributionCoverage({
      items: [unslottedSecondManualItem],
      panes: unslottedPanes,
    });
    expect(unslottedPanes[0]?.validationStatus).toBe("eligible_for_manual_planning");
    expect(unslottedPanes[1]?.validationStatus).toBe("requires_review");
    expect(unslottedCoverage.status).toBe("partial");
    expect(unslottedCoverage.completeReferenceCount).toBe(1);
    expect(unslottedCoverage.pendingReferenceCount).toBe(1);

    // 3) Huella de configuración vencida en ventana 2H invalida la completitud de los paños manuales sin inflar a 4 referencias
    const staleManualItem: CotizacionWorkflowItem = {
      ...baseItem,
      fabricacionSnapshot: null,
      manualGlassMeasurements: {
        version: 2,
        expectedPaneCount: 2,
        configurationFingerprint: "pane-config-obsoleto",
        entries: [1, 2].map((idx) => ({
          id: `stale-slot-${idx}`,
          source: "manual" as const,
          version: 2 as const,
          productId: "glass-prod-4mm",
          technicalFingerprint: getCatalogGlassTechnicalFingerprint(spec4mm),
          widthMm: 550,
          heightMm: 1320,
          quantity: 1,
          quantityBasis: "per_component" as const,
          paneSlotId: `pane-${idx}`,
          sourcePosition: `Paño ${idx}`,
          rectangularVerified: true,
          recordedAt: "2026-10-27T12:00:00.000Z",
        })),
      },
    };
    const stalePanes = extractNormalizedGlassPanes({
      organizationId: 1,
      quoteId: 708,
      item: staleManualItem,
      catalogGlassProducts: catalogMap,
    });
    const staleCoverage = buildGlassDistributionCoverage({
      items: [staleManualItem],
      panes: stalePanes,
    });
    expect(stalePanes.every((pane) => pane.validationStatus === "requires_review")).toBe(true);
    expect(staleCoverage.status).toBe("unavailable");
    expect(staleCoverage.completeReferenceCount).toBe(0);
    expect(staleCoverage.pendingReferenceCount).toBe(2);
  });
});
