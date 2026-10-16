jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } },
}));
jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({
  readConfirmedSupplierPresentations: jest.fn(),
}));
jest.mock("@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository", () => ({
  deleteSupplierFamilyPreference: jest.fn(),
  listSupplierFamilyPreferences: jest.fn(),
  upsertSupplierFamilyPreference: jest.fn(),
  SupplierFamilyPreferencesSchemaMissingError: class SupplierFamilyPreferencesSchemaMissingError extends Error {},
}));

import { DELETE, GET, PUT } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { readConfirmedSupplierPresentations } from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import {
  deleteSupplierFamilyPreference,
  listSupplierFamilyPreferences,
  upsertSupplierFamilyPreference,
} from "@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository";

const familyKey = "universal:aluminio:l42";
const presentation = {
  presentationId: "p-4201", providerKey: "arquetipo", supplierSku: "30892001",
  technicalCode: "4201", recipeComponentCodes: [], familyKeys: [familyKey],
  finishCode: null, finishName: null, finishResolution: "finish_independent" as const,
  commercialLengthMm: 6000,
};
const req = (method: string, body?: unknown) => new Request("http://localhost/api/proveedor-catalogos/preferencias-familia", {
  method, ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
});

describe("/api/proveedor-catalogos/preferencias-familia", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "user-7", email: "admin@example.com" },
      profile: { organizationId: 7, rol: "admin" },
    });
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([presentation]);
    (listSupplierFamilyPreferences as jest.Mock).mockResolvedValue([]);
    (upsertSupplierFamilyPreference as jest.Mock).mockResolvedValue({ organizationId: 7, familyKey, providerKey: "arquetipo", updatedAt: "now" });
  });

  it("lee preferencias exclusivamente para la organización autenticada", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(listSupplierFamilyPreferences).toHaveBeenCalledWith(7);
  });

  it("guarda o actualiza el proveedor validado usando la organización de sesión", async () => {
    const response = await PUT(req("PUT", { familyKey, providerKey: "arquetipo" }));
    expect(response.status).toBe(200);
    expect(readConfirmedSupplierPresentations).toHaveBeenCalledWith(7);
    expect(upsertSupplierFamilyPreference).toHaveBeenCalledWith({ organizationId: 7, familyKey, providerKey: "arquetipo" });
  });

  it("rechaza organización enviada por el cliente y nunca acepta cambiar de tenant desde el body", async () => {
    const response = await PUT(req("PUT", { organizationId: 99, familyKey, providerKey: "arquetipo" }));
    expect(response.status).toBe(400);
    expect(upsertSupplierFamilyPreference).not.toHaveBeenCalled();
  });

  it("rechaza proveedores no compatibles y no los persiste", async () => {
    const response = await PUT(req("PUT", { familyKey, providerKey: "sodal" }));
    expect(response.status).toBe(422);
    expect(upsertSupplierFamilyPreference).not.toHaveBeenCalled();
  });

  it("impide cambios a usuarios sin permiso de catálogo", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "viewer", email: "viewer@example.com" }, profile: { organizationId: 7, rol: "vendedor" },
    });
    expect((await PUT(req("PUT", { familyKey, providerKey: "arquetipo" }))).status).toBe(403);
    expect((await DELETE(req("DELETE", { familyKey }))).status).toBe(403);
    expect(upsertSupplierFamilyPreference).not.toHaveBeenCalled();
    expect(deleteSupplierFamilyPreference).not.toHaveBeenCalled();
  });

  it("elimina solo la preferencia de la familia y organización autenticadas", async () => {
    const response = await DELETE(req("DELETE", { familyKey }));
    expect(response.status).toBe(200);
    expect(deleteSupplierFamilyPreference).toHaveBeenCalledWith({ organizationId: 7, familyKey });
  });

  it("mantiene separado el acceso de otra empresa", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "user-8", email: "other@example.com" }, profile: { organizationId: 8, rol: "admin" },
    });
    await GET();
    await DELETE(req("DELETE", { familyKey }));
    expect(listSupplierFamilyPreferences).toHaveBeenCalledWith(8);
    expect(deleteSupplierFamilyPreference).toHaveBeenCalledWith({ organizationId: 8, familyKey });
  });
});
