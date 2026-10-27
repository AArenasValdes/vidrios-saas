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
import { decodeCotizacionItemPresentationMeta } from "@/utils/cotizacion-item-presentation";
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
