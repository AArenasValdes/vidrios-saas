/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PautaCubicacionPanel } from "@/app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/pauta-cubicacion-panel";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
import {
  crearRecetaWinHouseNewS75,
  WINHOUSE_NEW_S75_DOUBLE_CATALOG_KEY,
} from "@/features/fabricacion/fixtures/winhouse-new-s75-recipes";
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
    mockUseFabricationRecipes.mockReset();
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

    fireEvent.change(screen.getByLabelText("Variante de fabricación"), {
      target: { value: "recipe-premium" },
    });

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
});
