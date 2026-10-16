jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));
jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({
  readConfirmedSupplierPresentations: jest.fn(),
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
    expect(readConfirmedSupplierPresentations).toHaveBeenCalledWith(7);
  });
});
