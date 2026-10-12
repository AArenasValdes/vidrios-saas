jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));

jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({
  readOrganizationPurchasePricing: jest.fn(),
  readSupplierNames: jest.fn(),
  readSupplierPresentationPrices: jest.fn(),
}));

jest.mock("@/features/proveedor-catalogos/repositories/precios-compra-organizacion.repository", () => ({
  clearPresentationOverride: jest.fn(),
  savePresentationOverride: jest.fn(),
  saveSupplierAdjustment: jest.fn(),
}));

import { GET, PUT } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  readOrganizationPurchasePricing,
  readSupplierNames,
  readSupplierPresentationPrices,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { saveSupplierAdjustment } from "@/features/proveedor-catalogos/repositories/precios-compra-organizacion.repository";

describe("/api/proveedor-catalogos/mis-precios", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPPLIER_CATALOG_V1_ENABLED = "false";
    process.env.SUPPLIER_CATALOG_ORG_PRICES_ENABLED = "false";
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "customer-user", email: "maestro@taller.cl" },
      profile: { organizationId: 941, rol: "tecnico" },
    });
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map());
    (saveSupplierAdjustment as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("sirve el catálogo a cualquier taller autenticado aunque no tenga banderas QA", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(readOrganizationPurchasePricing).toHaveBeenCalledWith({
      organizationId: 941,
      providerKeys: [],
      presentationIds: [],
    });
  });

  it("expone los códigos técnicos asociados para abrir el precio correcto desde un material pendiente", async () => {
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([{
      presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
      providerKey: "veratec",
      supplierSku: "67401VER000",
      technicalCode: "7401",
      recipeComponentCodes: ["67401VER"],
      familyKeys: ["veratec:sliding-7400"],
      presentationDescription: "Marco corredera 2 hojas",
      finishName: "Blanco",
      purchaseUnit: "M",
      commercialLengthMm: 5800,
      netPrice: null,
      priceBasis: "commercial_presentation",
      currency: "CLP",
      priceListRevision: "2026-06",
    }]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map([["veratec", "Veratec"]]));

    const response = await GET();
    const body = await response.json();
    expect(body.providers[0].presentations[0].technicalCodes).toEqual(["7401", "67401VER", "67401VER000"]);
  });

  it("permite guardar el precio propio del taller técnico dentro de su organización", async () => {
    const response = await PUT(new Request("http://localhost/api/proveedor-catalogos/mis-precios", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "adjustment", providerKey: "xelena", percentage: 3 }),
    }));
    expect(response.status).toBe(200);
    expect(saveSupplierAdjustment).toHaveBeenCalledWith({ organizationId: 941, providerKey: "xelena", percentage: 3 });
  });

  it("mantiene la edición de precios deshabilitada para perfiles de solo lectura", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "viewer-user", email: "visor@taller.cl" },
      profile: { organizationId: 941, rol: "viewer" },
    });
    const response = await PUT(new Request("http://localhost/api/proveedor-catalogos/mis-precios", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "adjustment", providerKey: "xelena", percentage: 3 }),
    }));
    expect(response.status).toBe(403);
    expect(saveSupplierAdjustment).not.toHaveBeenCalled();
  });
});
