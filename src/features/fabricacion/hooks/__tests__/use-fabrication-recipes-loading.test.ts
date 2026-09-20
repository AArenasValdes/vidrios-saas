/** @jest-environment jsdom */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useFabricationRecipes } from "../use-fabrication-recipes";
import { ensureStructuralDraftsClient } from "@/features/cotizaciones/line-templates/services/seed-structural-draft-client";

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
  ensureStructuralDraftsClient: jest.fn(),
}));
const mockRepair = jest.mocked(ensureStructuralDraftsClient);

describe("carga del editor después de reparar AL-32/AL-42", () => {
  beforeEach(() => jest.clearAllMocks());

  it("espera la reparación antes de listar recetas de la línea", async () => {
    let finish!: (count: number) => void;
    mockRepair.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    mockListRecipes.mockResolvedValue([{ id: "r1" }]);
    const { result } = renderHook(() => useFabricationRecipes({ lineTemplateId: 42 }));
    await waitFor(() => expect(mockRepair).toHaveBeenCalledWith(8));
    expect(mockListRecipes).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    await act(async () => { finish(1); });
    await waitFor(() =>
      expect(mockListRecipes).toHaveBeenCalledWith({ organizationId: 8, lineTemplateId: 42 })
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("espera la reparación antes de listar cuando no hay línea filtrada", async () => {
    let finish!: (count: number) => void;
    mockRepair.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useFabricationRecipes());
    await waitFor(() => expect(mockRepair).toHaveBeenCalledWith(8));
    expect(mockListRecipes).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
    await act(async () => { finish(1); });
    await waitFor(() => expect(mockListRecipes).toHaveBeenCalledWith({ organizationId: 8, lineTemplateId: undefined }));
    expect(result.current.isLoading).toBe(false);
  });

  it("muestra el error y no abre la base antigua si falla la reparación", async () => {
    mockRepair.mockRejectedValue(new Error("No se pudo preparar la línea"));
    const { result } = renderHook(() => useFabricationRecipes());
    await waitFor(() => expect(result.current.error).toBe("No se pudo preparar la línea"));
    expect(mockListRecipes).not.toHaveBeenCalled();
  });

  it("formatea errores Zod de carga sin mostrar JSON crudo", async () => {
    mockRepair.mockResolvedValue(false);
    mockListRecipes.mockRejectedValue(
      new Error(
        JSON.stringify([
          {
            expected: "int",
            code: "invalid_type",
            path: ["perfiles", 3, "reglaMedida", "ajusteMm"],
            message: "Invalid input: expected int, received number",
          },
        ])
      )
    );
    const { result } = renderHook(() => useFabricationRecipes({ lineTemplateId: 35 }));
    await waitFor(() => expect(result.current.error).toContain("perfiles.3.reglaMedida.ajusteMm"));
    expect(result.current.error).not.toMatch(/^\[/);
  });
});
