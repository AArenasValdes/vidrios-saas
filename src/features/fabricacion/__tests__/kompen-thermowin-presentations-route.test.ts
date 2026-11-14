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

import { GET, PATCH, POST } from "@/app/api/proveedor-catalogos/taller-presentaciones/route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWorkshopPresentation,
  listOfficialTechnicalInputsForFamily,
  listWorkshopPresentations,
  updateWorkshopPresentationPurchase,
} from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";

const lines = [
  ["ventora:kompen-prime-line-700", "thermowin:kom-700"],
  ["ventora:kompen-form-line-800", "thermowin:kom-800"],
  ["ventora:kompen-star-line-500", "thermowin:kom-500"],
  ["ventora:thermowin-americana-s70", "thermowin:americana-s70"],
  ["ventora:l25", "universal:aluminio:l25"],
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
    (createWorkshopPresentation as jest.Mock).mockResolvedValue({ id: "private-presentation", sku_taller: "ventora-internal:generated" });
  });

  it.each(lines)("expone referencias privadas de %s dentro de su familia", async (key, familyKey) => {
    catalogKey = key;
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(requestedLineId).toBe(72);
    expect(requestedOrganizationId).toBe(941);
    expect(body.familyKey).toBe(familyKey);
    if (key === "ventora:l25") expect(body.catalogProfiles).toEqual([]);
    else expect(body.catalogProfiles.length).toBeGreaterThan(0);
    expect(listWorkshopPresentations).toHaveBeenCalledWith(941, familyKey);
  });

  it("permite crear el costo privado exacto de L25 sin pedir un SKU de proveedor", async () => {
    catalogKey = "ventora:l25";
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([{ codigo_tecnico: "2511", acabado_nombre: "Blanco", configuration_key: null }]);
    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 75, officialInputId: null, technicalCode: "2511R", recipeCode: null,
        profileName: "Refuerzo pierna abierta", workshopSku: null, description: "Perfil 2511R · Blanco",
        finishName: "Blanco", purchaseUnit: "UN", commercialLengthMm: 6000,
        netPrice: 45000, currency: "CLP", preferred: false,
      }),
    }));
    expect(response.status).toBe(201);
    expect((await response.json()).row.sku_taller).toBeNull();
    expect(createWorkshopPresentation).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 941, familyKey: "universal:aluminio:l25", technicalCode: "2511R",
      workshopSku: expect.stringMatching(/^ventora-internal:/), finishName: "Blanco",
      purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 45000, preferred: false,
    }));
  });

  it("rechaza duplicar el mismo código L25 y acabado, pero no los aproxima por prefijo", async () => {
    catalogKey = "ventora:l25";
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([{ codigo_tecnico: "2511R", acabado_nombre: "Blanco", configuration_key: null }]);
    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 75, officialInputId: null, technicalCode: "2511R", recipeCode: null,
        profileName: "Refuerzo pierna abierta", workshopSku: null, description: "Perfil 2511R · Blanco",
        finishName: "blanco", purchaseUnit: "UN", commercialLengthMm: 6000,
        netPrice: 45000, currency: "CLP", preferred: false,
      }),
    }));
    expect(response.status).toBe(409);
    expect(createWorkshopPresentation).not.toHaveBeenCalled();
  });

  it("no expone la clave interna generada como SKU en Mis precios", async () => {
    catalogKey = "ventora:l25";
    (listWorkshopPresentations as jest.Mock).mockResolvedValue([{
      id: "internal-row", revision: 1, codigo_tecnico: "2511R", nombre_perfil: "Refuerzo",
      sku_taller: "ventora-internal:123", acabado_nombre: "Blanco",
    }]);
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    const body = await response.json();
    expect(body.ownPresentations[0].sku_taller).toBeNull();
  });

  it("no habilita familias de aluminio distintas de L25 por prefijo", async () => {
    catalogKey = "ventora:l20";
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    expect(response.status).toBe(404);
    expect(listWorkshopPresentations).not.toHaveBeenCalled();
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

  it("deriva la organización desde sesión y no expone referencias de otra organización", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "otra-organizacion" }, profile: { rol: "tecnico", organizationId: 942 },
    });
    const response = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=72"));
    expect(response.status).toBe(404);
    expect(requestedOrganizationId).toBe(942);
    expect(listWorkshopPresentations).not.toHaveBeenCalled();
  });

  it("no permite modificar una referencia si la línea no pertenece a la organización actual", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "otra-organizacion" }, profile: { rol: "tecnico", organizationId: 942 },
    });
    const response = await PATCH(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 72, presentationId: "cf9bb8d0-b8d1-45d7-b9d5-2069c82c42c0",
        expectedRevision: 1, purchaseUnit: "UN", commercialLengthMm: 6000,
        netPrice: 45000, currency: "CLP", preferred: false,
      }),
    }));
    expect(response.status).toBe(404);
    expect(updateWorkshopPresentationPurchase).not.toHaveBeenCalled();
  });

  it("actualiza un costo L25 sin cambiar la presentación preferida de la organización", async () => {
    catalogKey = "ventora:l25";
    const response = await PATCH(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 75, presentationId: "cf9bb8d0-b8d1-45d7-b9d5-2069c82c42c0",
        expectedRevision: 3, purchaseUnit: "UN", commercialLengthMm: null,
        netPrice: 28000, currency: "CLP",
      }),
    }));
    expect(response.status).toBe(200);
    expect(updateWorkshopPresentationPurchase).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 941, familyKey: "universal:aluminio:l25", presentationId: "cf9bb8d0-b8d1-45d7-b9d5-2069c82c42c0",
    }));
    expect(updateWorkshopPresentationPurchase).not.toHaveBeenCalledWith(expect.objectContaining({ preferred: false }));
  });

  it("rechaza guardar costos a un usuario sin permiso", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "visor-id" }, profile: { rol: "viewer", organizationId: 941 },
    });
    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineTemplateId: 72, officialInputId: null, technicalCode: "2511R", recipeCode: null,
        profileName: "Refuerzo", workshopSku: null, description: "Refuerzo Blanco", finishName: "Blanco",
        purchaseUnit: "UN", commercialLengthMm: 6000, netPrice: 45000, currency: "CLP", preferred: false,
      }),
    }));
    expect(response.status).toBe(403);
    expect(createWorkshopPresentation).not.toHaveBeenCalled();
  });
});
