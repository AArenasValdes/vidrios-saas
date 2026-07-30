/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PautaCubicacionPanel } from "@/app/(pwa-app)/cotizaciones/nueva/_components/paso-dos/pauta-cubicacion-panel";
import type { CotizacionLineTemplate } from "@/features/cotizaciones/line-templates/types/cotizacion-line-template";
import { RECETA_CORREDERA_DOS_HOJAS_EJEMPLO_NO_VALIDADO } from "@/features/fabricacion/fixtures/receta-corredera-dos-hojas.fixture";
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

    fireEvent.change(screen.getByLabelText("Herraje / variante"), {
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
});
