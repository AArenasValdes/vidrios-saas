jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
jest.mock("@/features/proveedor-catalogos/services/supplier-catalog-access.service", () => ({ canManageSupplierCatalog: jest.fn() }));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/features/proveedor-catalogos/repositories/workshop-presentations.repository", () => ({
  listWorkshopPresentations: jest.fn(), createWorkshopPresentation: jest.fn(),
  updateWorkshopPresentationPurchase: jest.fn(), listOfficialTechnicalInputsForFamily: jest.fn(),
  WorkshopPresentationsSchemaMissingError: class extends Error {},
  WorkshopPresentationConflictError: class extends Error {
    constructor() { super("Ya existe una presentación privada para este perfil y acabado. Recarga y edita la referencia existente."); }
  },
}));

import { GET, PATCH, POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { canManageSupplierCatalog } from "@/features/proveedor-catalogos/services/supplier-catalog-access.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWorkshopPresentation, listOfficialTechnicalInputsForFamily, listWorkshopPresentations, updateWorkshopPresentationPurchase, WorkshopPresentationConflictError } from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";

const endpoint = "http://localhost/api/proveedor-catalogos/taller-presentaciones";
const request = (method: string, body: unknown) => new Request(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const input = { lineTemplateId: 42, officialInputId: null, technicalCode: "4201", recipeCode: null, profileName: "Marco", description: "Marco blanco", finishName: "Blanco", purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 12000, currency: "CLP", preferred: false };
const id = "d840dc04-2ca6-4bb9-a0af-426e6a296388";

describe("costos privados L42", () => {
  let catalogKey: string;
  beforeEach(() => {
    jest.clearAllMocks();
    catalogKey = "ventora:l42";
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({ user: { id: "user" }, profile: { rol: "admin", organizationId: 3 } });
    (canManageSupplierCatalog as jest.Mock).mockReturnValue(true);
    const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), is: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockImplementation(() => ({ data: { id: 42, catalog_key: catalogKey }, error: null })) };
    (createAdminClient as jest.Mock).mockReturnValue({ from: () => query });
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([]);
    (listOfficialTechnicalInputsForFamily as jest.Mock).mockResolvedValue([]);
    (createWorkshopPresentation as jest.Mock).mockImplementation(async (row) => ({ id, ...row }));
    (updateWorkshopPresentationPurchase as jest.Mock).mockResolvedValue({ id, revision: 2, precio_neto: 13000 });
  });

  it("guarda y recupera 4201 en la organización y familia exactas", async () => {
    expect((await POST(request("POST", input))).status).toBe(201);
    expect(createWorkshopPresentation).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 3, familyKey: "universal:aluminio:l42", technicalCode: "4201", finishName: "Blanco", commercialLengthMm: 6000, netPrice: 12000 }));
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([{ id, sku_taller: "test", codigo_tecnico: "4201", acabado_nombre: "Blanco", largo_comercial_mm: 6000, precio_neto: 12000 }]);
    const result = await GET(new Request(`${endpoint}?lineTemplateId=42`));
    expect(listWorkshopPresentations).toHaveBeenCalledWith(3, "universal:aluminio:l42");
    expect((await result.json()).ownPresentations[0]).toEqual(expect.objectContaining({ codigo_tecnico: "4201", precio_neto: 12000 }));
  });

  it("edita con revisión y filtros de organización", async () => {
    const response = await PATCH(request("PATCH", { lineTemplateId: 42, presentationId: id, expectedRevision: 1, purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 13000, currency: "CLP" }));
    expect(response.status).toBe(200);
    expect(updateWorkshopPresentationPurchase).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 3, familyKey: "universal:aluminio:l42", presentationId: id, expectedRevision: 1, netPrice: 13000 }));
  });

  it("rechaza duplicados y usuarios sin permiso", async () => {
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([{ configuration_key: null, codigo_tecnico: "4201", acabado_nombre: "blanco" }]);
    expect((await POST(request("POST", input))).status).toBe(409);
    expect(createWorkshopPresentation).not.toHaveBeenCalled();
    (canManageSupplierCatalog as jest.Mock).mockReturnValue(false);
    expect((await POST(request("POST", input))).status).toBe(403);
  });

  it("devuelve conflicto recuperable si la restricción única detecta una inserción simultánea", async () => {
    (createWorkshopPresentation as jest.Mock).mockRejectedValueOnce(new WorkshopPresentationConflictError());

    const response = await POST(request("POST", input));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Ya existe una presentación privada para este perfil y acabado. Recarga y edita la referencia existente.",
    });
  });

  it("mantiene habilitada L25 y rechaza otras familias universales", async () => {
    catalogKey = "ventora:l25";
    expect((await POST(request("POST", { ...input, technicalCode: "2503" }))).status).toBe(201);
    expect(createWorkshopPresentation).toHaveBeenCalledWith(expect.objectContaining({ familyKey: "universal:aluminio:l25" }));
    catalogKey = "ventora:l32";
    expect((await POST(request("POST", input))).status).toBe(404);
  });
});
