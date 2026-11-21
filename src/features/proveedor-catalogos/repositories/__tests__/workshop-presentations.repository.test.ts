/** @jest-environment node */
import { createAdminClient } from "@/lib/supabase/admin";
import { createWorkshopPresentation, WorkshopPresentationConflictError } from "../workshop-presentations.repository";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;

describe("creación de presentaciones privadas del taller", () => {
  it("convierte una colisión unique de inserciones simultáneas en conflicto recuperable", async () => {
    const officialSkuQuery = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    const insertQuery = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: {
        code: "23505",
        message: "duplicate key value violates unique constraint organizacion_presentaciones_taller_l42_identity_uq",
      } }),
    };
    const from = jest.fn((table: string) => table === "catalogo_presentaciones_proveedor" ? officialSkuQuery : insertQuery);
    mockCreateAdminClient.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);

    await expect(createWorkshopPresentation({
      organizationId: 3,
      familyKey: "universal:aluminio:l42",
      configurationKey: "ventora:l42:proyectante",
      officialInputId: null,
      technicalCode: "4201",
      recipeCode: null,
      profileName: "Marco L42",
      workshopSku: "ventora-internal:test",
      description: "Marco L42 · Blanco · 6000 mm",
      finishName: "Blanco",
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      netPrice: 18000,
      currency: "CLP",
      preferred: false,
      userId: "user-qa",
    })).rejects.toBeInstanceOf(WorkshopPresentationConflictError);
    expect(from).toHaveBeenCalledWith("catalogo_presentaciones_proveedor");
    expect(from).toHaveBeenCalledWith("organizacion_presentaciones_taller");
  });
});
