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
import { buildPartialTechnicalCostSnapshot, type CatalogPresentationPrice } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";

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

    const post = (finishName: string | null, previewFinishNames: string[] = []) => POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        items: [{
          itemId: "alumco-l5000",
          catalogLineKey: line.catalogKey,
          familyKey: line.catalogMetadata!.familyKey,
          finishName,
          previewFinishNames,
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
    const multiFinishResponse = await post(null, ["Titanio", "Negro", "Blanco Hueso", "Aluminio Mate"]);
    expect(multiFinishResponse.status).toBe(200);
    const multiFinishBody = await multiFinishResponse.json();
    expect(multiFinishBody.profilePricesByFinish["alumco-l5000"].Titanio).toContainEqual(expect.objectContaining({
      technicalCode: "5001", netPrice: 12000, finishPriceBasis: "specific_finish", supplierSku: "TI5001A", status: "priced",
    }));
    expect(multiFinishBody.profilePricesByFinish["alumco-l5000"].Negro).toContainEqual(expect.objectContaining({
      technicalCode: "5001", netPrice: 12000, finishPriceBasis: "base_reference_other_finish", presentationId: "", supplierSku: "", status: "priced",
    }));
    expect(multiFinishBody.providerOptionsByFinish["alumco-l5000"].Negro).toContainEqual(expect.objectContaining({
      providerKey: "alumco", pricedProfileCount: 7, totalProfileCount: 7, baseReferenceProfileCount: 7,
    }));
    expect(multiFinishBody.providerOptionsByFinish["alumco-l5000"].Titanio).toContainEqual(expect.objectContaining({
      providerKey: "alumco", pricedProfileCount: 7, totalProfileCount: 7, baseReferenceProfileCount: 0,
    }));
    expect(readSupplierPresentationPrices).toHaveBeenCalledWith({
      familyKeys: expect.arrayContaining(["universal:aluminio:l5000", "arquetipo:l5000"]),
    });
  });

  it("solo aplica el costo privado L25 persistido cuando se elige para la pieza", async () => {
    const line = VENTORA_DEFAULT_LINE_CATALOG.find((entry) => entry.catalogKey === "ventora:l25");
    expect(line?.catalogMetadata?.familyKey).toBe("universal:aluminio:l25");
    if (!line?.catalogKey || !line.catalogMetadata?.familyKey) throw new Error("Falta L25 en el catálogo canónico.");

    // Represents the row returned by readWorkshopPresentationPrices after the
    // 2511R / Blanco / 6000 mm / CLP 45,000 record was saved for organization 7.
    const persistedWorkshopPrice: CatalogPresentationPrice = {
      presentationId: "private-2511r-white-org-7",
      providerKey: "taller:7",
      familyKeys: ["universal:aluminio:l25"],
      configurationKey: null,
      technicalCode: "2511R",
      recipeComponentCodes: ["2511R"],
      technicalName: "Refuerzo pierna abierta",
      supplierSku: "",
      presentationDescription: "Refuerzo pierna abierta · Blanco · taller",
      finishCode: "",
      finishName: "Blanco",
      finishResolution: "specific",
      purchaseUnit: "UN",
      commercialLengthMm: 6000,
      netPrice: 45000,
      priceBasis: "commercial_presentation",
      currency: "CLP",
      priceListId: "taller:7",
      priceListRevision: "taller-v2",
      origin: "workshop",
    };
    (readConfirmedSupplierPresentations as jest.Mock).mockResolvedValue([{
      presentationId: persistedWorkshopPrice.presentationId,
      providerKey: persistedWorkshopPrice.providerKey,
      supplierSku: "",
      technicalCode: "2511R",
      recipeComponentCodes: ["2511R"],
      familyKeys: persistedWorkshopPrice.familyKeys,
      configurationKey: null,
      finishCode: null,
      finishName: "Blanco",
      finishResolution: "specific",
      commercialLengthMm: 6000,
      preferred: false,
    }]);
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([persistedWorkshopPrice]);
    (listSupplierFamilyPreferences as jest.Mock).mockResolvedValue([{
      familyKey: "universal:aluminio:l25", providerKey: "arquetipo",
    }]);
    (readSupplierNames as jest.Mock).mockResolvedValue(new Map());
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });

    const post = (providerKey?: string) => POST(new Request("http://localhost/api/proveedor-catalogos/resolve-presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        includeProviderOptions: true,
        items: [{
          itemId: "piece-2511r", catalogLineKey: line.catalogKey!, familyKey: line.catalogMetadata!.familyKey as string,
          finishName: "Blanco", technicalCodes: ["2511R"], providerKey: providerKey ?? null,
        }],
      }),
    }));

    const defaultResponse = await post();
    expect(defaultResponse.status).toBe(200);
    const defaultBody = await defaultResponse.json();
    expect(defaultBody.selections["piece-2511r"][0]).toMatchObject({ status: "missing", providerKey: "arquetipo" });
    expect(defaultBody.profilePrices["piece-2511r"]).toContainEqual(expect.objectContaining({
      providerKey: "taller:7", netPrice: 45000, commercialLengthMm: 6000, status: "priced",
    }));

    const selectedResponse = await post("taller:7");
    expect(selectedResponse.status).toBe(200);
    const selectedBody = await selectedResponse.json();
    const [selection] = selectedBody.selections["piece-2511r"];
    expect(selection).toMatchObject({
      status: "resolved", providerKey: "taller:7", presentationId: persistedWorkshopPrice.presentationId,
      commercialLengthMm: 6000,
    });

    const calculated = buildPartialTechnicalCostSnapshot({
      workSnapshot: {
        schemaVersion: 1, tipo: "fabricacion_trabajo_snapshot", packing: "first_fit_decreasing_sugerido",
        capturedAt: "2026-11-07T12:00:00.000Z", itemCountWithPauta: 1, totalBars: 1,
        totalProfilesLinealMm: 4200, totalWasteMm: 1800, sourcePresentations: [],
        bars: [{
          materialKey: "ventora:l25:2511R", presentationKey: "private-2511r-white-org-7|Blanco|6000",
          codigoPerfil: "2511R", nombrePerfil: "Refuerzo pierna abierta", acabadoKey: "Blanco",
          lineaIds: [75], largoComercialMm: 6000, indice: 1, despunteInicialMm: 0,
          perdidaCorteMm: 0, usadoMm: 4200, sobranteMm: 1800,
          supplierPresentationId: selection.presentationId, supplierProviderKey: selection.providerKey,
          supplierSku: selection.supplierSku, supplierFinishName: selection.finishName,
          cortes: [{
            itemId: "piece-2511r", codigoItem: "piece-2511r", nombreItem: "L25 Blanco",
            componenteId: "refuerzo", codigoPerfil: "2511R", funcion: "Refuerzo pierna abierta",
            corte: "90° / 90°", largoMm: 4200,
          }],
        }],
      },
      quoteItems: [{
        code: "piece-2511r", color: "Blanco", finishName: "Blanco", catalogLineKey: "ventora:l25",
        supplierFamilyKey: "universal:aluminio:l25", supplierProviderKey: selection.providerKey,
      }],
      availablePrices: [persistedWorkshopPrice],
      calculatedAt: "2026-11-07T12:00:00.000Z",
    });

    expect(calculated?.lines).toEqual(expect.arrayContaining([expect.objectContaining({
      technicalCode: "2511R", providerKey: "taller:7", commercialLengthMm: 6000,
      bars: 1, netPricePerPresentation: 45000, lineNet: 45000,
    })]));
  });
});

