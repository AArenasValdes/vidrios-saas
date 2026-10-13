jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/features/proveedor-catalogos/repositories/workshop-presentations.repository", () => ({
  createWorkshopPresentation: jest.fn(),
  listOfficialTechnicalInputsForFamily: jest.fn(),
  listWorkshopPresentations: jest.fn(),
  updateWorkshopPresentationPurchase: jest.fn(),
  WorkshopPresentationsSchemaMissingError: class WorkshopPresentationsSchemaMissingError extends Error {},
}));

import { GET, POST } from "@/app/api/proveedor-catalogos/taller-presentaciones/route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWorkshopPresentation,
  listOfficialTechnicalInputsForFamily,
  listWorkshopPresentations,
} from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";

const lines = [
  ["ventora:kompen-prime-line-700", "thermowin:kom-700"],
  ["ventora:kompen-form-line-800", "thermowin:kom-800"],
  ["ventora:kompen-star-line-500", "thermowin:kom-500"],
  ["ventora:thermowin-americana-s70", "thermowin:americana-s70"],
] as const;

describe("/api/proveedor-catalogos/taller-presentaciones · Thermowin", () => {
  let requestedLineId: number;
  let requestedOrganizationId: number;
  let catalogKey: string;

  beforeEach(() => {
    jest.clearAllMocks();
    requestedLineId = 0;
    requestedOrganizationId = 0;
    catalogKey = lines[0][0];
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "maestro-id" }, profile: { rol: "tecnico", organizationId: 941 },
    });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((column: string, value: number) => {
        if (column === "id") requestedLineId = value;
        if (column === "organization_id") requestedOrganizationId = value;
        return query;
      }),
      is: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockImplementation(async () => ({
        data: requestedOrganizationId === 941 ? { id: requestedLineId, catalog_key: catalogKey } : null,
        error: null,
      })),
    };
    (createAdminClient as jest.Mock).mockReturnValue({ from: jest.fn().mockReturnValue(query) });
    (listOfficialTechnicalInputsForFamily as jest.Mock).mockResolvedValue([]);
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([]);
    (createWorkshopPresentation as jest.Mock).mockResolvedValue({ id: "private-presentation" });
  });

  it.each(lines)("expone referencias privadas de %s dentro de su familia", async (key, familyKey) => {
    catalogKey = key;
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(requestedLineId).toBe(72);
    expect(requestedOrganizationId).toBe(941);
    expect(body.familyKey).toBe(familyKey);
    expect(body.catalogProfiles.length).toBeGreaterThan(0);
    expect(listWorkshopPresentations).toHaveBeenCalledWith(941, familyKey);
  });

  it("guarda costo privado solo con la familia canónica de la línea", async () => {
    catalogKey = lines[1][0];
    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 73, officialInputId: null, technicalCode: "KOM 801", recipeCode: null,
        profileName: "Marco doble riel", workshopSku: "TALLER-KOM-801", description: "Barra",
        finishName: "Blanco", purchaseUnit: "M", commercialLengthMm: 6000,
        netPrice: 45000, currency: "CLP", preferred: false,
      }),
    }));
    expect(response.status).toBe(201);
    expect(createWorkshopPresentation).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 941, familyKey: "thermowin:kom-800", userId: "maestro-id",
      technicalCode: "KOM 801", netPrice: 45000,
    }));
  });

  it("rechaza edición de perfil de solo lectura", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "visor-id" }, profile: { rol: "viewer", organizationId: 941 },
    });
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    expect(response.status).toBe(403);
    expect(listWorkshopPresentations).not.toHaveBeenCalled();
  });
});
