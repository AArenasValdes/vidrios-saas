/** @jest-environment jsdom */

import { renderHook } from "@testing-library/react";

import type { CotizacionWorkflowItem } from "@/features/cotizaciones/types/cotizacion-workflow";

import { useQuoteDespiecePreview } from "../use-quote-despiece-preview";

jest.mock("@/features/fabricacion/hooks/use-fabrication-recipes", () => ({
  useFabricationRecipes: jest.fn(),
}));

import { useFabricationRecipes } from "@/features/fabricacion/hooks/use-fabrication-recipes";

const mockUseFabricationRecipes = useFabricationRecipes as jest.MockedFunction<
  typeof useFabricationRecipes
>;

function sampleItem(id: string): CotizacionWorkflowItem {
  return {
    id,
    codigo: "V1",
    tipo: "Ventana",
    lineaComercial: "L5000",
    vidrio: "4mm",
    nombre: "Ventana",
    descripcion: "",
    ancho: 1200,
    alto: 1000,
    cantidad: 1,
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
    observaciones: "",
  };
}

describe("useQuoteDespiecePreview", () => {
  beforeEach(() => {
    mockUseFabricationRecipes.mockReturnValue({
      recipes: [],
      organizationId: 1,
      isLoading: false,
      isSaving: false,
      error: null,
      tests: {},
      reload: jest.fn(),
      createRecipe: jest.fn(),
      updateRecipe: jest.fn(),
      deleteRecipe: jest.fn(),
      createTest: jest.fn(),
    });
  });

  it("no marca listo mientras la organización no está resuelta", () => {
    mockUseFabricationRecipes.mockReturnValue({
      recipes: [],
      organizationId: null,
      isLoading: false,
      isSaving: false,
      error: null,
      tests: {},
      reload: jest.fn(),
      createRecipe: jest.fn(),
      updateRecipe: jest.fn(),
      deleteRecipe: jest.fn(),
      createTest: jest.fn(),
    });

    const { result } = renderHook(() =>
      useQuoteDespiecePreview({ items: [sampleItem("a")] })
    );

    expect(result.current.isReady).toBe(false);
    expect(result.current.hasDespiecePreviewAvailable).toBe(false);
  });

  it("precarga recetas cuando preload está activo aunque no haya piezas", () => {
    renderHook(() =>
      useQuoteDespiecePreview({ items: [], preload: true })
    );

    expect(mockUseFabricationRecipes).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
  });
});
