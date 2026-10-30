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
  readWorkshopPresentationPrices: jest.fn(),
}));
jest.mock("@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository", () => ({
  listSupplierFamilyPreferences: jest.fn(),
}));

import { POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  readConfirmedSupplierPresentations,
  readOrganizationPurchasePricing,
  readSupplierNames,
  readSupplierPresentationPrices,
  readWorkshopPresentationPrices,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { listSupplierFamilyPreferences } from "@/features/proveedor-catalogos/repositories/supplier-family-preferences.repository";
import { getSupplierCatalogQuoteLineKeys } from "@/features/proveedor-catalogos/services/proveedor-catalogo-qa.service";
import { VENTORA_DEFAULT_LINE_CATALOG } from "@/features/cotizaciones/line-templates/services/default-line-catalog";

const req = (items: unknown[]) => new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ items }),
});

describe("/api/proveedor-catalogos/resolve-presentations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "user-7", email: "admin@example.com" },
      profile: { organizationId: 7, rol: "admin" },
    });
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([]);
    (listSupplierFamilyPreferences as jest.Mock).mockResolvedValue([]);
  });

  it("resuelve las líneas admitidas aunque otra pieza aún no tenga familia de compra", async () => {
    const supportedKeys = getSupplierCatalogQuoteLineKeys();
    const supportedLine = VENTORA_DEFAULT_LINE_CATALOG.find((line) =>
      line.catalogKey && supportedKeys.has(line.catalogKey) && typeof line.catalogMetadata?.familyKey === "string"
    );
    expect(supportedLine?.catalogKey).toBeTruthy();
    if (!supportedLine?.catalogKey || !supportedLine.catalogMetadata?.familyKey) {
      throw new Error("No se encontró una línea de catálogo con familia de compra configurada.");
    }

    const response = await POST(req([
      {
        itemId: "supported",
        catalogLineKey: supportedLine.catalogKey,
        familyKey: supportedLine.catalogMetadata.familyKey,
        finishName: null,
        technicalCodes: ["TEST-1"],
      },
      {
        itemId: "pending",
        catalogLineKey: "ventora:linea-sin-familia-confirmada",
        familyKey: "sin-familia",
        finishName: null,
        technicalCodes: ["TEST-2"],
      },
    ]));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(true);
    expect(body.selections).toHaveProperty("supported");
    expect(body.itemErrors.pending).toMatch(/familia de compra/i);
    expect(body.selections).not.toHaveProperty("pending");
    expect(readConfirmedSupplierPresentations).toHaveBeenCalledWith(7, {
      familyKeys: expect.arrayContaining([supportedLine.catalogMetadata.familyKey]),
    });
  });

  it("omite consultas de ajustes de taller cuando la Guiada solo necesita cobertura de proveedores", async () => {
    const supportedKeys = getSupplierCatalogQuoteLineKeys();
    const line = VENTORA_DEFAULT_LINE_CATALOG.find((entry) =>
      entry.catalogKey && supportedKeys.has(entry.catalogKey) && typeof entry.catalogMetadata?.familyKey === "string"
    );
    if (!line?.catalogKey || !line.catalogMetadata?.familyKey) throw new Error("No se encontró una línea con familia de compra.");
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map());

    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        includeProfilePrices: false,
        items: [{ itemId: "guided", catalogLineKey: line.catalogKey, familyKey: line.catalogMetadata.familyKey, finishName: null, technicalCodes: ["TEST-1"] }],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profilePrices).toEqual({});
    expect(readOrganizationPurchasePricing).not.toHaveBeenCalled();
  });

  it("no atribuye los perfiles de proyectante a L32 Fijo y explica la lista comercial pendiente", async () => {
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map([["alumco", "Alumco"]]));

    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        items: [{
          itemId: "l32-fixed",
          catalogLineKey: "ventora:l32:configuration:ventora:l32:pano-fijo",
          familyKey: "universal:aluminio:l32",
          finishName: "Titanio",
          technicalCodes: ["3201", "3202", "3204", "3205", "3208"],
          providerKey: "alumco",
        }],
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.itemErrors).not.toHaveProperty("l32-fixed");
    expect(body.selections["l32-fixed"]).toEqual([]);
    expect(body.providerOptions["l32-fixed"]).toContainEqual(expect.objectContaining({
      providerKey: "alumco",
      pricedProfileCount: 0,
      totalProfileCount: 0,
      coverageMessage: "Precios de familia disponibles; materiales del fijo pendientes.",
    }));
  });

  it("resuelve AL-42 Fijo con sus referencias documentales exactas y no hereda perfiles de proyectante", async () => {
    const response = await POST(req([{
      itemId: "l42-fixed",
      catalogLineKey: "ventora:l42:configuration:ventora:l42:pano-fijo",
      familyKey: "universal:aluminio:l42",
      finishName: "Titanio",
      technicalCodes: [],
      providerKey: "alumco",
    }]));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.itemErrors).not.toHaveProperty("l42-fixed");
    expect(body.selections["l42-fixed"].map((entry: { technicalCode: string }) => entry.technicalCode)).toEqual(["4209", "4229"]);
  });

  it("devuelve precios de perfiles Kompen por referencias de línea aunque no haya receta", async () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === "ventora:kompen-form-line-800");
    expect(line?.catalogMetadata?.familyKey).toBe("thermowin:kom-800");
    if (!line?.catalogKey || !line.catalogMetadata?.familyKey) throw new Error("Falta Kompen Form 800 en el catálogo canónico.");

    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([{
      presentationId: "kompen-802-white",
      providerKey: "thermowin-kompen",
      supplierSku: "802-0003",
      technicalCode: "KOM 802",
      recipeComponentCodes: [],
      familyKeys: ["thermowin:kom-800"],
      finishCode: "0003",
      finishName: "Blanco",
      finishResolution: "specific",
      commercialLengthMm: 6000,
    }]);
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([{
      presentationId: "kompen-802-white",
      providerKey: "thermowin-kompen",
      familyKeys: ["thermowin:kom-800"],
      technicalCode: "KOM 802",
      technicalName: "Marco monorriel",
      supplierSku: "802-0003",
      presentationDescription: "Marco monorriel · Blanco",
      finishCode: "0003",
      finishName: "Blanco",
      finishResolution: "specific",
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      netPrice: 34900,
      priceBasis: "commercial_presentation",
      currency: "CLP",
      priceListId: "kompen-2026",
      priceListRevision: "2026",
    }]);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map([["thermowin-kompen", "Thermowin Kompen"]]));
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });

    const response = await POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        items: [{
          itemId: "kompen-item",
          catalogLineKey: line.catalogKey,
          familyKey: line.catalogMetadata.familyKey,
          finishName: "Blanco",
          technicalCodes: ["KOM 802"],
        }],
      }),
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.profilePrices["kompen-item"]).toContainEqual(expect.objectContaining({
      technicalCode: "KOM 802",
      providerLabel: "Thermowin Kompen",
      netPrice: 34900,
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      status: "priced",
    }));
    expect(body.providerOptions["kompen-item"]).toEqual([expect.objectContaining({
      providerKey: "thermowin-kompen",
      pricedProfileCount: 1,
    })]);
  });

  it("explica el acabado Titanio disponible y lo cuenta al elegirlo", async () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === "ventora:l5000");
    expect(line?.catalogMetadata?.familyKey).toBe("universal:aluminio:l5000");
    if (!line?.catalogKey || !line.catalogMetadata?.familyKey) throw new Error("Falta Serie 5000 en el catálogo canónico.");

    const codes = ["5001", "5002", "5003", "5004", "5005", "5006", "5007"];
    const priceRows = codes.map((code) => ({
      presentationId: `alumco-${code}`,
      providerKey: "alumco",
      familyKeys: [line.catalogMetadata!.familyKey as string],
      technicalCode: code,
      recipeComponentCodes: [],
      technicalName: `Perfil ${code}`,
      supplierSku: `TI${code}A`,
      presentationDescription: `Perfil ${code} · Titanio`,
      finishCode: "TI",
      finishName: "Titanio",
      finishResolution: "specific" as const,
      purchaseUnit: "TR",
      commercialLengthMm: 6000,
      netPrice: 12000,
      priceBasis: "commercial_presentation" as const,
      currency: "CLP",
      priceListId: "alumco-2026",
      priceListRevision: "2026",
    }));
    const arquetipoRows = priceRows.map((row) => ({
      ...row,
      presentationId: `arquetipo-${row.technicalCode}`,
      providerKey: "arquetipo",
      priceListId: "arquetipo-junio-2026",
      priceListRevision: "2026-06",
    }));
    const allPriceRows = [...priceRows, ...arquetipoRows];
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue(allPriceRows.map((row) => ({
      presentationId: row.presentationId,
      providerKey: row.providerKey,
      supplierSku: row.supplierSku,
      technicalCode: row.technicalCode,
      recipeComponentCodes: [],
      familyKeys: row.familyKeys,
      finishCode: row.finishCode,
      finishName: row.finishName,
      finishResolution: row.finishResolution,
      commercialLengthMm: row.commercialLengthMm,
    })));
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue(allPriceRows);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map([
      ["alumco", "Alumco"],
      ["arquetipo", "Distribuidora Arquetipo"],
    ]));
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });

    const post = (finishName: string | null) => POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        items: [{
          itemId: "alumco-l5000",
          catalogLineKey: line.catalogKey,
          familyKey: line.catalogMetadata!.familyKey,
          finishName,
          technicalCodes: codes,
          providerKey: "alumco",
        }],
      }),
    }));

    const mismatchedResponse = await post(null);
    expect(mismatchedResponse.status).toBe(200);
    const mismatchedBody = await mismatchedResponse.json();
    expect(mismatchedBody.providerOptions["alumco-l5000"]).toContainEqual(expect.objectContaining({
      providerKey: "alumco",
      pricedProfileCount: 0,
      totalProfileCount: 7,
      otherAvailableFinishNames: ["Titanio"],
    }));

    const titanioResponse = await post("Titanio");
    expect(titanioResponse.status).toBe(200);
    const titanioBody = await titanioResponse.json();
    expect(titanioBody.providerOptions["alumco-l5000"]).toContainEqual(expect.objectContaining({
      providerKey: "alumco",
      label: "Alumco · 2026",
      pricedProfileCount: 7,
      totalProfileCount: 7,
      otherAvailableFinishNames: [],
    }));
    expect(titanioBody.providerOptions["alumco-l5000"]).toContainEqual(expect.objectContaining({
      providerKey: "arquetipo",
      label: "Arquetipo · junio 2026",
    }));
    expect(readSupplierPresentationPrices).toHaveBeenCalledWith({
      familyKeys: expect.arrayContaining(["universal:aluminio:l5000", "arquetipo:l5000"]),
    });
  });
});

