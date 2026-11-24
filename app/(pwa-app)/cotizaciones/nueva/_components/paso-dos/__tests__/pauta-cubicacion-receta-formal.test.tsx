/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PautaCubicacionPanel } from "@/app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/pauta-cubicacion-panel";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
import {
  crearRecetaVeratec7400Corredera,
  VERATEC_7400_CATALOG_KEY,
  VERATEC_7400_VARIANT_MONOLITICO_4MM,
} from "@/features/fabricacion/fixtures/veratec-7400-corredera-recipe";
import {
  VERATEC_7400_4H_CATALOG_KEY,
  VERATEC_7400_4H_VARIANTS,
} from "@/features/fabricacion/fixtures/veratec-preliminary-recipes";
import {
  applyLineTemplateToComponentForm,
  buildItemFromForm,
  createEmptyComponentForm,
  isCubicationPersonalizadoAssistMode,
  mapItemToForm,
} from "@/features/cotizaciones/new-quote/workflow-ui";
import { createQuoteConstructorPresetConfig } from "@/features/cotizaciones/visual-composer/services/quote-constructor-workspace.service";
import { resolveFabricacionDespieceForQuoteItem } from "@/features/fabricacion/services/fabricacion-despiece-cotizacion.service";
import { resolveUniversalPricedLineFallback } from "@/features/fabricacion/services/fabricacion-receta-universal-fallback.service";
import type { FabricationRecipeRecord } from "@/features/fabricacion/types/fabricacion-persistence";

const mockUseFabricationRecipes = jest.fn();

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: (...args: unknown[]) => mockUseFabricationRecipes(...args),
}));

function recipe(
  id: string,
  variant: string,
  hardware: string
): FabricationRecipeRecord {
  return {
    id,
    organizationId: 10,
    lineTemplateId: 50,
    scope: "organization",
    providerName: "Proveedor",
    lineName: "L5000",
    typology: "corredera",
    leavesCount: 2,
    variant,
    version: 1,
    status: "validated",
    definition: {
      ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO,
      estado: "validada",
      identidad: {
        ...RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO.identidad,
        recetaId: id,
        variante: variant,
        herraje: hardware,
      },
    },
    sourceType: "manual",
    sourceReference: null,
    parentRecipeId: null,
    validatedAt: "2026-07-29T12:00:00.000Z",
    validatedBy: "user-1",
    createdAt: "2026-07-29T12:00:00.000Z",
    updatedAt: "2026-07-29T12:00:00.000Z",
    eliminadoEn: null,
  };
}

const selectedTemplate = {
  id: 50,
  nombre: "L5000",
  catalogMetadata: {},
} as CotizacionLineTemplate;

describe("PautaCubicacionPanel con recetas persistidas", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockUseFabricationRecipes.mockReset();
  });

  afterEach(() => {
    Reflect.deleteProperty(global, "fetch");
  });

  it("iguala la pauta L42 Normal de Constructor cuando no hay receta persistida", async () => {
    const template = { ...selectedTemplate, id: 210, nombre: "Serie 42", catalogKey: "ventora:l42" } as CotizacionLineTemplate;
    const form = {
      ...createEmptyComponentForm([], "", "precio_directo"), codigo: "V1",
      nombre: "Ventana proyectante", ancho: "1200", alto: "1000", cantidad: "1",
      lineTemplateId: "210", catalogLineKey: "ventora:l42", tipo: "Ventana proyectante",
      sistema: "Proyectante", fabricacionTipologia: "proyectante",
      fabricacionHojas: 1, fabricacionVariante: "normal",
    };
    const item = buildItemFromForm(form, [], "item-l42", {
      lineTemplates: [template], fabricationRecipes: [], organizationId: 3,
    });
    const constructor = resolveFabricacionDespieceForQuoteItem({
      item, recipes: [], organizationId: 3, lineTemplateId: 210, lineCatalogKey: "ventora:l42",
    });
    expect(constructor.estado).toBe("calculado");
    expect(constructor.formal?.pauta.length).toBeGreaterThan(0);
    mockUseFabricationRecipes.mockReturnValue({ organizationId: 3, recipes: [], isLoading: false });
    const onFormalSnapshot = jest.fn();
    const { rerender } = render(
      <PautaCubicacionPanel componentForm={form} selectedTemplate={template}
        onCubicationSnapshotChange={jest.fn()} onFabricacionSnapshotChange={onFormalSnapshot} />
    );
    await waitFor(() => expect(onFormalSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      recipeId: constructor.formal?.recipeId, selectedVariant: "normal", pauta: constructor.formal?.pauta,
    })));
    const frozen = { ...constructor.formal!, recipeId: "historica" };
    onFormalSnapshot.mockClear();
    rerender(
      <PautaCubicacionPanel componentForm={{ ...form, fabricacionSnapshot: frozen }}
        selectedTemplate={template} onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot} />
    );
    expect(onFormalSnapshot).not.toHaveBeenCalled();
  });

  it("prioriza la receta privada L42 sin aceptar una geometría de dos hojas", async () => {
    const base = resolveUniversalPricedLineFallback({
      catalogKey: "ventora:l42", lineTemplateId: 210, organizationId: 3,
      lineName: "Serie 42", variant: "normal", leavesCount: 1, recipes: [],
    })!;
    const own = { ...base, id: "propia", sourceType: "manual" as const,
      sourceReference: "blank-start", organizationId: 3, scope: "organization" as const };
    mockUseFabricationRecipes.mockReturnValue({ organizationId: 3, recipes: [own], isLoading: false });
    const onFormalSnapshot = jest.fn();
    const form = { ancho: "1200", alto: "1000", cantidad: "1", lineTemplateId: "210",
      catalogLineKey: "ventora:l42", tipo: "Ventana proyectante", sistema: "Proyectante",
      fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionVariante: "normal" };
    const template = { ...selectedTemplate, id: 210, catalogKey: "ventora:l42" };
    const { rerender } = render(<PautaCubicacionPanel componentForm={form} selectedTemplate={template}
      onCubicationSnapshotChange={jest.fn()} onFabricacionSnapshotChange={onFormalSnapshot} />);
    await waitFor(() => expect(onFormalSnapshot).toHaveBeenCalledWith(expect.objectContaining({ recipeId: "propia" })));
    onFormalSnapshot.mockClear();
    rerender(<PautaCubicacionPanel componentForm={{ ...form, fabricacionHojas: 2 }}
      selectedTemplate={template} onCubicationSnapshotChange={jest.fn()} onFabricacionSnapshotChange={onFormalSnapshot} />);
    expect(onFormalSnapshot.mock.calls.every(([snapshot]) => snapshot == null)).toBe(true);
  });

  it.each([
    { organizationId: null, error: null, isLoading: false },
    { organizationId: 3, error: "error de carga", isLoading: false },
    { organizationId: 3, error: null, isLoading: true },
  ])("no genera fallback L42 sin datos de recetas confiables: %p", async (state) => {
    mockUseFabricationRecipes.mockReturnValue({ ...state, recipes: [] });
    const onFormalSnapshot = jest.fn();
    render(<PautaCubicacionPanel
      componentForm={{ ancho: "1200", alto: "1500", cantidad: "1", lineTemplateId: "210",
        catalogLineKey: "ventora:l42", tipo: "Ventana proyectante", sistema: "Proyectante",
        fabricacionTipologia: "proyectante", fabricacionHojas: 1, fabricacionVariante: "normal" }}
      selectedTemplate={{ ...selectedTemplate, id: 210, catalogKey: "ventora:l42" }}
      onCubicationSnapshotChange={jest.fn()} onFabricacionSnapshotChange={onFormalSnapshot} />);
    await waitFor(() => expect(onFormalSnapshot).not.toHaveBeenCalled());
  });

  it("selecciona automaticamente una receta validada unica", async () => {
    const onlyRecipe = recipe("recipe-one", "estandar", "caracol");
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 10,
      recipes: [onlyRecipe],
      isLoading: false,
    });
    const onFormalSnapshot = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={{
          ancho: "1200",
          alto: "1000",
          cantidad: "1",
          lineTemplateId: "50",
          tipo: "Ventana corredera",
          sistema: "Corredera",
        }}
        selectedTemplate={selectedTemplate}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(onFormalSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ recipeId: "recipe-one", recipeVersion: 1 })
      )
    );
    expect(screen.getByText("Validada por tu taller")).toBeInTheDocument();
  });

  it("solo con autorización QA genera un snapshot preliminar de Veratec draft sin promover la receta", async () => {
    let id = 0;
    const definition = crearRecetaVeratec7400Corredera({
      lineName: "Veratec 7400",
      variant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      createId: () => `veratec-definition-qa-${++id}`,
    });
    const draft: FabricationRecipeRecord = {
      id: "veratec-recipe-qa",
      organizationId: 3,
      lineTemplateId: 1135,
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
      sourceReference: "alumetrica:veratec-7400:2h:monolitico-4mm:v1",
      parentRecipeId: null,
      validatedAt: null,
      validatedBy: null,
      createdAt: "2026-09-21T00:00:00.000Z",
      updatedAt: "2026-09-21T00:00:00.000Z",
      eliminadoEn: null,
    };
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 3,
      recipes: [draft],
      isLoading: false,
    });
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/qa-context")) {
        return { ok: true, json: async () => ({ enabled: true, allowPreliminaryRecipeSnapshots: true }) };
      }
      if (url.includes("/resolve-presentations")) {
        const body = JSON.parse(String(init?.body)) as {
          items: Array<{ itemId: string; technicalCodes: string[] }>;
        };
        const selections = Object.fromEntries(body.items.map((item) => [item.itemId,
          item.technicalCodes.map((technicalCode) => ({
            technicalCode,
            status: "resolved",
            presentationId: `presentation-${technicalCode}`,
            providerKey: "taller:3",
            supplierSku: `QA-${technicalCode}-6000`,
            finishCode: null,
            finishName: "Blanco",
            commercialLengthMm: 6000,
          })),
        ]));
        return { ok: true, json: async () => ({
          enabled: true,
          selections,
          providerOptions: {
            "pauta-preview": [
              { providerKey: "arquetipo", label: "Arquetipo", pricedProfileCount: 7, totalProfileCount: 7, isReference: true },
              { providerKey: "xelena", label: "Xelena", pricedProfileCount: 5, totalProfileCount: 7, isReference: false },
            ],
          },
        }) };
      }
      return { ok: false, json: async () => ({}) };
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });
    const onFormalSnapshot = jest.fn();
    const onSupplierProviderChange = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={{
          ancho: "1200",
          alto: "1500",
          cantidad: "1",
          lineTemplateId: "1135",
          catalogLineKey: VERATEC_7400_CATALOG_KEY,
          colorHex: "#f0eeeb",
          tipo: "Ventana corredera",
          sistema: "PVC",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionVariante: VERATEC_7400_VARIANT_MONOLITICO_4MM,
          vidrio: "Monolítico 4 mm",
        }}
        selectedTemplate={{
          ...selectedTemplate,
          id: 1135,
          nombre: "Veratec 7400",
          catalogKey: VERATEC_7400_CATALOG_KEY,
          catalogMetadata: { familyKey: "veratec:sliding-7400" },
        }}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={jest.fn()}
        onSupplierProviderKeyChange={onSupplierProviderChange}
      />
    );

    await waitFor(() => expect(onFormalSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      recipeId: draft.id,
      recipeStatus: "draft",
      selectedVariant: VERATEC_7400_VARIANT_MONOLITICO_4MM,
      qaPreliminary: {
        mode: "supplier_catalog_v1_qa_preliminary",
        readiness: "lista_para_validar",
        provenance: {
          sourceType: "manufacturer",
          sourceReference: draft.sourceReference,
        },
      },
    })));
    expect(fetchMock).toHaveBeenCalledWith("/api/proveedor-catalogos/qa-context", { cache: "no-store" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/proveedor-catalogos/resolve-presentations",
      expect.objectContaining({ method: "POST", cache: "no-store" })
    ));
    fireEvent.click(screen.getByRole("button", { name: /Ver pauta de cortes/ }));
    await waitFor(() => expect(document.body.textContent).toContain("6.000 mm"));
    expect(document.body.textContent).not.toContain("5.800 mm");
    expect(draft.status).toBe("draft");
    expect(draft.definition.estado).toBe("lista_para_validar");
    const supplierSelect = await screen.findByRole("combobox", { name: "Proveedor de compra para esta pieza" });
    expect(supplierSelect).toHaveValue("");
    fireEvent.change(supplierSelect, { target: { value: "xelena" } });
    expect(onSupplierProviderChange).toHaveBeenCalledWith("xelena");
  });

  it("pide solo variante o herraje y guarda la receta elegida", async () => {
    const standard = recipe("recipe-standard", "estandar", "caracol");
    const premium = recipe("recipe-premium", "termopanel", "multipunto");
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 10,
      recipes: [standard, premium],
      isLoading: false,
    });
    const onFormalSnapshot = jest.fn();
    const onContext = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={{
          ancho: "1500",
          alto: "1100",
          cantidad: "2",
          lineTemplateId: "50",
          tipo: "Ventana corredera",
          sistema: "Corredera",
        }}
        selectedTemplate={selectedTemplate}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={onContext}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Termopanel/ }));

    expect(onFormalSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        recipeId: "recipe-premium",
        selectedVariant: "termopanel",
      })
    );
    expect(onContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tipologia: "corredera",
        herraje: "multipunto",
        variante: "termopanel",
      })
    );
  });

  it("captura y propaga el ancho A de una corredera S75 asimétrica", async () => {
    const variant = "doble_riel_2h_asimetrica_80_mono_4_6";
    const definition = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75",
      variant,
      createId: (() => {
        let id = 0;
        return () => `s75-panel-${++id}`;
      })(),
    });
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 10,
      recipes: [
        {
          id: "recipe-s75-asymmetric",
          organizationId: 10,
          lineTemplateId: 226,
          scope: "organization",
          providerName: "WinHouse",
          lineName: "WinHouse New S75",
          typology: "corredera",
          leavesCount: 2,
          variant,
          version: 1,
          status: "draft",
          definition,
          sourceType: "manufacturer",
          sourceReference: "manufacturer:winhouse:new-s75:test",
          parentRecipeId: null,
          validatedAt: null,
          validatedBy: null,
          createdAt: "2026-09-27T00:00:00.000Z",
          updatedAt: "2026-09-27T00:00:00.000Z",
          eliminadoEn: null,
        },
      ],
      isLoading: false,
    });
    const onContext = jest.fn();
    const componentForm = {
      ancho: "1200",
      alto: "1000",
      cantidad: "1",
      lineTemplateId: "226",
      catalogLineKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
      tipo: "Ventana corredera",
      sistema: "PVC",
      fabricacionTipologia: "corredera",
      fabricacionHojas: 2,
      fabricacionModulos: 2,
      fabricacionApertura: "corredera",
      fabricacionVariante: variant,
      vidrio: "Monolítico 4 mm",
      fabricacionAnchoHojaAMm: null,
    };
    const panel = (form: typeof componentForm) => (
      <PautaCubicacionPanel
        componentForm={form}
        selectedTemplate={{
          ...selectedTemplate,
          id: 226,
          nombre: "WinHouse New S75",
          catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
        }}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={jest.fn()}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={onContext}
      />
    );

    const { rerender } = render(panel(componentForm));

    expect(screen.getByLabelText("Ancho de la hoja A en milímetros")).toBeInTheDocument();
    expect(screen.getByText("La hoja A debe ser menor que el ancho total.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ancho de la hoja A en milímetros"), {
      target: { value: "700" },
    });

    await waitFor(() =>
      expect(onContext).toHaveBeenCalledWith(
        expect.objectContaining({ variante: variant, anchoHojaAMm: 700 })
      )
    );
    rerender(panel({ ...componentForm, fabricacionAnchoHojaAMm: 700 }));
    expect(screen.getByText("Hoja B: 500 mm")).toBeInTheDocument();
  });

  it("permite elegir otra geometría de las pestañas WinHouse para S75", () => {
    const currentVariant = "doble_riel_2h_simetrica_80_mono_4_6";
    const definition = crearRecetaWinHouseNewS75({
      lineName: "WinHouse New S75",
      variant: currentVariant,
      createId: (() => {
        let id = 0;
        return () => `s75-geometry-${++id}`;
      })(),
    });
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 10,
      recipes: [
        {
          id: "recipe-s75-geometry",
          organizationId: 10,
          lineTemplateId: 226,
          scope: "organization",
          providerName: "WinHouse",
          lineName: "WinHouse New S75",
          typology: "corredera",
          leavesCount: 2,
          variant: currentVariant,
          version: 1,
          status: "draft",
          definition,
          sourceType: "manufacturer",
          sourceReference: "manufacturer:winhouse:new-s75:test",
          parentRecipeId: null,
          validatedAt: null,
          validatedBy: null,
          createdAt: "2026-09-27T00:00:00.000Z",
          updatedAt: "2026-09-27T00:00:00.000Z",
          eliminadoEn: null,
        },
      ],
      isLoading: false,
    });
    const onContext = jest.fn();
    const onRecipeIdChange = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={{
          ancho: "1200",
          alto: "1000",
          cantidad: "1",
          lineTemplateId: "226",
          catalogLineKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
          tipo: "Ventana corredera",
          sistema: "PVC",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 2,
          fabricacionModulos: 2,
          fabricacionApertura: "corredera",
          fabricacionVariante: currentVariant,
          vidrio: "Monolítico 4 mm",
        }}
        selectedTemplate={{
          ...selectedTemplate,
          id: 226,
          nombre: "WinHouse New S75",
          catalogKey: WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
        }}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={jest.fn()}
        onFabricationRecipeIdChange={onRecipeIdChange}
        onFabricacionContextoChange={onContext}
      />
    );

    const geometrySelect = screen.getByLabelText("Configuración de corte WinHouse New S75");
    expect(geometrySelect.querySelectorAll("option")).toHaveLength(10);
    fireEvent.change(geometrySelect, {
      target: { value: "doble_riel_2h_asimetrica_98" },
    });

    expect(onContext).toHaveBeenCalledWith(
      expect.objectContaining({
        tipologia: "corredera",
        hojas: 2,
        modulos: 2,
        apertura: "corredera",
        variante: "doble_riel_2h_asimetrica_98_mono_4_6",
        anchoHojaAMm: null,
      })
    );
    expect(onRecipeIdChange).toHaveBeenCalledWith("");
  });

  it("genera el despiece preliminar Veratec 7400 4H desde la base común sin receta persistida", async () => {
    const variant = VERATEC_7400_4H_VARIANTS[0];
    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 10,
      recipes: [],
      isLoading: false,
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(async () => ({ ok: false, json: async () => ({}) })),
    });
    const onFormalSnapshot = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={{
          ancho: "1222",
          alto: "1222",
          cantidad: "1",
          lineTemplateId: "1523",
          catalogLineKey: VERATEC_7400_4H_CATALOG_KEY,
          tipo: "Ventana",
          sistema: "Corredera",
          vidrio: "Incoloro monolítico 4 mm",
          fabricacionTipologia: "corredera",
          fabricacionHojas: 4,
          fabricacionModulos: 4,
          fabricacionVariante: "estandar",
          sheetScheme: "4 hojas",
          sheetVariant: "4 móviles",
        }}
        selectedTemplate={{
          ...selectedTemplate,
          id: 1523,
          nombre: "Veratec 7400 — Corredera 4 hojas chicas",
          catalogKey: VERATEC_7400_4H_CATALOG_KEY,
          catalogMetadata: { familyKey: "veratec:sliding-7400" },
        }}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(onFormalSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeId: `veratec:workbook:${variant.slug}`,
          recipeStatus: "testing",
          selectedVariant: variant.slug,
        })
      )
    );
    expect(onFormalSnapshot.mock.calls[0]?.[0]).not.toHaveProperty("qaPreliminary");
  });

  it("mantiene paridad Veratec 7400 entre Constructor desktop y Cotización guiada (PautaCubicacionPanel)", async () => {
    const l42Template = {
      id: 210,
      nombre: "Serie 42 — Proyectante / paño fijo",
      categoria: "aluminio",
      material: "Aluminio",
      catalogKey: "ventora:l42",
      catalogMetadata: {
        familyKey: "universal:aluminio:l42",
        lineConfiguration: "AL-42 normal · Proyectante / paño fijo",
      },
      vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
      precioM2Sugerido: 80000,
      minimoCobrable: 35000,
      redondeoPrecio: 1000,
    } as unknown as CotizacionLineTemplate;
    const veratecTemplate = {
      id: 1135,
      nombre: "Veratec 7400 — Corredera 2 hojas",
      categoria: "pvc",
      material: "PVC",
      catalogKey: VERATEC_7400_CATALOG_KEY,
      catalogMetadata: {
        familyKey: "veratec:sliding-7400",
        lineConfiguration: "Corredera Sliding 7400 · 2 hojas",
      },
      vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
      precioM2Sugerido: 80000,
      minimoCobrable: 35000,
      redondeoPrecio: 1000,
    } as unknown as CotizacionLineTemplate;

    const baseForm = createEmptyComponentForm([], "", "precio_directo");
    const presetForm = applyLineTemplateToComponentForm(
      {
        ...baseForm,
        codigo: "V2",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1200",
        alto: "1500",
        cantidad: "1",
        hojasBase: 1,
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "Personalizado",
        isCustomScheme: true,
        guidedVisualConfig: createQuoteConstructorPresetConfig("corredera", {
          widthMm: 1200,
          heightMm: 1500,
        }),
      },
      l42Template,
      { fabricationRecipes: [], organizationId: 3 }
    );
    const initialV2 = buildItemFromForm(presetForm, [], "item-v2", {
      lineTemplates: [l42Template, veratecTemplate],
      fabricationRecipes: [],
      organizationId: 3,
    });
    const updatedV2Form = applyLineTemplateToComponentForm(
      mapItemToForm(initialV2),
      veratecTemplate,
      { fabricationRecipes: [], organizationId: 3 }
    );
    const rebuiltV2 = buildItemFromForm(updatedV2Form, [initialV2], "item-v2", {
      lineTemplates: [l42Template, veratecTemplate],
      fabricationRecipes: [],
      organizationId: 3,
    });

    const constructorDespiece = resolveFabricacionDespieceForQuoteItem({
      item: rebuiltV2,
      recipes: [],
      organizationId: 3,
      lineTemplateId: veratecTemplate.id,
      lineCatalogKey: veratecTemplate.catalogKey,
      supplierFamilyKey: "veratec:sliding-7400",
    });
    expect(constructorDespiece.estado).toBe("calculado");
    expect(constructorDespiece.formal?.pauta.length).toBeGreaterThan(0);

    const syncedV2 = {
      ...rebuiltV2,
      fabricacionSnapshot: constructorDespiece.formal,
      cubicationSnapshot: constructorDespiece.cubication,
    };
    const guidedForm = mapItemToForm(syncedV2);
    const personalizadoAssistMode = isCubicationPersonalizadoAssistMode({
      tipo: guidedForm.tipo,
      sistema: guidedForm.sistema,
      sheetScheme: guidedForm.sheetScheme,
      configuracion: guidedForm.configuracion,
      isCustomScheme: guidedForm.isCustomScheme,
    });

    mockUseFabricationRecipes.mockReturnValue({
      organizationId: 3,
      recipes: [],
      isLoading: false,
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(async () => ({ ok: false, json: async () => ({}) })),
    });
    const onFormalSnapshot = jest.fn();

    render(
      <PautaCubicacionPanel
        componentForm={guidedForm}
        selectedTemplate={veratecTemplate}
        personalizadoAssistMode={personalizadoAssistMode}
        onCubicationSnapshotChange={jest.fn()}
        onFabricacionSnapshotChange={onFormalSnapshot}
        onFabricationRecipeIdChange={jest.fn()}
        onFabricacionContextoChange={jest.fn()}
      />
    );

    expect(guidedForm.sistema).toBe("Corredera");
    expect(guidedForm.sheetScheme).toBe("2 hojas");
    expect(guidedForm.sheetVariant).toBe("2 móviles");
    expect(personalizadoAssistMode).toBe(false);
    expect(document.body.textContent).not.toContain("Sin despiece de perfiles para esta configuración.");
    expect(document.body.textContent).not.toContain("Composición Personalizado: la pauta se arma a mano.");
    expect(document.body.textContent).toContain("Veratec 7400 — Corredera 2 hojas");
    expect(document.body.textContent).toContain("41.22 ml");
    expect(document.body.textContent).toContain("40 cortes");
  });

  it("conserva modo Personalizado para composiciones Veratec 7400 modificadas en Constructor", () => {
    const veratecTemplate = {
      id: 1135,
      nombre: "Veratec 7400 — Corredera 2 hojas",
      categoria: "pvc",
      material: "PVC",
      catalogKey: VERATEC_7400_CATALOG_KEY,
      catalogMetadata: {
        familyKey: "veratec:sliding-7400",
        lineConfiguration: "Corredera Sliding 7400 · 2 hojas",
      },
      vidrioPrincipalRecomendado: "Incoloro monolítico 5mm",
      precioM2Sugerido: 80000,
      minimoCobrable: 35000,
      redondeoPrecio: 1000,
    } as unknown as CotizacionLineTemplate;

    const baseForm = createEmptyComponentForm([], "", "precio_directo");
    const customConfig = {
      ...createQuoteConstructorPresetConfig("corredera", { widthMm: 1800, heightMm: 1500 }),
      quickCompositionStructural: true,
    };
    const customForm = applyLineTemplateToComponentForm(
      {
        ...baseForm,
        codigo: "V3",
        tipo: "Ventana",
        nombre: "Ventana corredera",
        ancho: "1800",
        alto: "1500",
        cantidad: "1",
        hojasBase: 1,
        sistema: "Personalizado",
        configuracion: "Personalizado",
        sheetScheme: "",
        isCustomScheme: true,
        guidedVisualConfig: customConfig,
      },
      veratecTemplate,
      { fabricationRecipes: [], organizationId: 3 }
    );
    const rebuiltCustom = buildItemFromForm(customForm, [], "item-v3", {
      lineTemplates: [veratecTemplate],
      fabricationRecipes: [],
      organizationId: 3,
    });
    const roundTripped = mapItemToForm(rebuiltCustom);
    expect(roundTripped.sistema).toBe("Personalizado");
    expect(
      isCubicationPersonalizadoAssistMode({
        tipo: roundTripped.tipo,
        sistema: roundTripped.sistema,
        sheetScheme: roundTripped.sheetScheme,
        configuracion: roundTripped.configuracion,
        isCustomScheme: roundTripped.isCustomScheme,
      })
    ).toBe(true);
  });
});
