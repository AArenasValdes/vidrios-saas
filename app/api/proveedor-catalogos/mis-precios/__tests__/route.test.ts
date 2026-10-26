jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ unstable_cache: (read: () => Promise<unknown>) => read }));

jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));

jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({
  readConfirmedSupplierPresentations: jest.fn(),
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
  readConfirmedSupplierPresentations,
  readOrganizationPurchasePricing,
  readSupplierNames,
  readSupplierPresentationPrices,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { savePresentationOverride, saveSupplierAdjustment } from "@/features/proveedor-catalogos/repositories/precios-compra-organizacion.repository";

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
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([]);
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map());
    (saveSupplierAdjustment as jest.Mock).mockResolvedValue(undefined);
    (savePresentationOverride as jest.Mock).mockResolvedValue(undefined);
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

  it("muestra en Mis precios un valor agregado desde cotización aunque no hubiera precio de referencia", async () => {
    const presentationId = "f14599eb-5ec8-480d-a919-779329ab8590";
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([{
      presentationId,
      providerKey: "thermowin-kompen",
      supplierSku: "802-0003",
      technicalCode: "KOM 802",
      familyKeys: ["thermowin:kom-800"],
      presentationDescription: "Marco monorriel · Blanco",
      finishName: "Blanco",
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      netPrice: null,
      priceBasis: "commercial_presentation",
      currency: "CLP",
      priceListRevision: "2026",
    }]);
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({
      adjustments: [],
      overrides: [{ presentationId, netPrice: 42000, currency: "CLP" }],
    });
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map([["thermowin-kompen", "Thermowin Kompen"]]));

    const response = await GET();
    const body = await response.json();

    expect(body.providers[0].providerKey).toBe("thermowin-kompen");
    expect(body.providers[0].presentations[0]).toMatchObject({
      presentationId,
      referenceNetPrice: null,
      ownNetPrice: 42000,
      effective: { unitNetPrice: 42000, source: "organization_override", currency: "CLP" },
    });
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

  it("relee ajustes privados por organización y nunca permite cachear la respuesta personalizada", async () => {
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([{
      presentationId: "price-5001", providerKey: "alumco", supplierSku: "TI5001",
      technicalCode: "5001", familyKeys: ["universal:aluminio:l5000"],
      presentationDescription: "Marco", finishName: "Titanio", purchaseUnit: "TR",
      commercialLengthMm: 6000, netPrice: 10000, priceBasis: "commercial_presentation",
      currency: "CLP", priceListRevision: "2026",
    }]);
    (readOrganizationPurchasePricing as jest.Mock)
      .mockResolvedValueOnce({ adjustments: [{ providerKey: "alumco", percentage: -10, active: true }], overrides: [] })
      .mockResolvedValueOnce({ adjustments: [], overrides: [{ presentationId: "price-5001", netPrice: 7000, currency: "CLP" }] });
    const first = await GET();
    expect((await first.json()).providers[0].presentations[0].effective.unitNetPrice).toBe(9000);
    expect(first.headers.get("Cache-Control")).toBe("private, no-store");
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "other-user" }, profile: { organizationId: 942, rol: "tecnico" },
    });
    const second = await GET();
    expect((await second.json()).providers[0].presentations[0].effective.unitNetPrice).toBe(7000);
    expect(readOrganizationPurchasePricing).toHaveBeenNthCalledWith(1, expect.objectContaining({ organizationId: 941 }));
    expect(readOrganizationPurchasePricing).toHaveBeenNthCalledWith(2, expect.objectContaining({ organizationId: 942 }));
  });

  it("guarda desde cotización solo el precio de una presentación confirmada de familia, código y acabado exactos", async () => {
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([{
      presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
      providerKey: "thermowin-kompen",
      technicalCode: "KOM 802",
      familyKeys: ["thermowin:kom-800"],
      finishName: "Blanco",
      finishResolution: "specific",
      commercialLengthMm: 6000,
    }]);
    const response = await PUT(new Request("http://localhost/api/proveedor-catalogos/mis-precios", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "quote_override",
        providerKey: "thermowin-kompen",
        presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
        familyKey: "thermowin:kom-800",
        technicalCode: "KOM 802",
        finishName: "Blanco",
        netPrice: 42000,
        currency: "CLP",
      }),
    }));

    expect(response.status).toBe(200);
    expect(readConfirmedSupplierPresentations).toHaveBeenCalledWith(941);
    expect(savePresentationOverride).toHaveBeenCalledWith({
      organizationId: 941,
      providerKey: "thermowin-kompen",
      presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
      netPrice: 42000,
      currency: "CLP",
    });
  });

  it("rechaza un precio de cotización con acabado que no coincide y no guarda el override", async () => {
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([{
      presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
      providerKey: "thermowin-kompen",
      technicalCode: "KOM 802",
      familyKeys: ["thermowin:kom-800"],
      finishName: "Negro",
      finishResolution: "specific",
      commercialLengthMm: 6000,
    }]);
    const response = await PUT(new Request("http://localhost/api/proveedor-catalogos/mis-precios", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "quote_override",
        providerKey: "thermowin-kompen",
        presentationId: "f14599eb-5ec8-480d-a919-779329ab8590",
        familyKey: "thermowin:kom-800",
        technicalCode: "KOM 802",
        finishName: "Blanco",
        netPrice: 42000,
        currency: "CLP",
      }),
    }));

    expect(response.status).toBe(400);
    expect(savePresentationOverride).not.toHaveBeenCalled();
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
