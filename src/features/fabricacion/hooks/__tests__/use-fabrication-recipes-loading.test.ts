/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFabricationRecipes } from "../use-fabrication-recipes";
import { ensureCatalogDraftsClient } from "@/features/cotizaciones/line-templates/services/seed-structural-draft-client";

const mockListRecipes = jest.fn().mockResolvedValue([]);
jest.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ cargando: false, user: { id: "user-1" } }),
}));
jest.mock("@/features/fabricacion/services/fabrication-recipes.client", () => ({
  getFabricationRecipesClientService: () => ({
    getCurrentOrganizationId: async () => 8,
    listRecipes: mockListRecipes,
  }),
}));
jest.mock("@/features/cotizaciones/line-templates/services/seed-structural-draft-client", () => ({
  ensureCatalogDraftsClient: jest.fn(),
}));
const mockRepair = jest.mocked(ensureCatalogDraftsClient);

describe("carga del editor después de reparar AL-32/AL-42", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no carga las recetas antiguas mientras la reparación está pendiente", async () => {
    let finish!: (count: number) => void;
    mockRepair.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useFabricationRecipes({ lineTemplateId: 42 }));
    await waitFor(() => expect(mockRepair).toHaveBeenCalledWith(8));
    expect(mockListRecipes).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    await act(async () => { finish(1); });
    await waitFor(() => expect(mockListRecipes).toHaveBeenCalledWith({ organizationId: 8, lineTemplateId: 42 }));
    expect(result.current.isLoading).toBe(false);
  });

  it("muestra el error y no abre la base antigua si falla la reparación", async () => {
    mockRepair.mockRejectedValue(new Error("No se pudo preparar la línea"));
    const { result } = renderHook(() => useFabricationRecipes());
    await waitFor(() => expect(result.current.error).toBe("No se pudo preparar la línea"));
    expect(mockListRecipes).not.toHaveBeenCalled();
  });
});
