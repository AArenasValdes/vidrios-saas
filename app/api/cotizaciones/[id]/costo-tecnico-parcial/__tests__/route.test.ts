jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } },
}));

jest.mock("@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository", () => ({
  getExistingTechnicalCostSnapshot: jest.fn(),
  persistTechnicalCostSnapshot: jest.fn(),
  readOrganizationPurchasePricing: jest.fn(),
  readSupplierPresentationPrices: jest.fn(),
  readWorkshopPresentationPrices: jest.fn(),
  readQuoteForTechnicalCost: jest.fn(),
}));

jest.mock("@/features/proveedor-catalogos/services/costo-tecnico-parcial.service", () => ({
  buildPartialTechnicalCostSnapshot: jest.fn(),
}));

import { POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  getExistingTechnicalCostSnapshot,
  persistTechnicalCostSnapshot,
  readOrganizationPurchasePricing,
  readSupplierPresentationPrices,
  readWorkshopPresentationPrices,
  readQuoteForTechnicalCost,
} from "@/features/proveedor-catalogos/repositories/costo-tecnico-parcial.repository";
import { buildPartialTechnicalCostSnapshot } from "@/features/proveedor-catalogos/services/costo-tecnico-parcial.service";

const sourceMarker = {
  mode: "supplier_catalog_v1_qa_preliminary" as const,
  readiness: "lista_para_validar" as const,
  provenance: { sourceType: "ventora_seed" as const, sourceReference: "veratec:7400" },
};
const itemId = "quote-item-7";
const itemSnapshot = {
  recipeId: "recipe-draft-7400",
  recipeVersion: 3,
  recipeStatus: "draft",
  selectedVariant: "monolitico_4mm",
  qaPreliminary: sourceMarker,
};
const workSnapshot = {
  schemaVersion: 1,
  tipo: "fabricacion_trabajo_snapshot",
  packing: "first_fit_decreasing_sugerido",
  capturedAt: "2026-10-05T10:00:00.000Z",
  itemCountWithPauta: 1,
  totalBars: 1,
  totalProfilesLinealMm: 1200,
  totalWasteMm: 400,
  sourcePresentations: [],
  qaPreliminary: {
    mode: "supplier_catalog_v1_qa_preliminary",
    items: [{
      itemId,
      recipeId: itemSnapshot.recipeId,
      recipeVersion: itemSnapshot.recipeVersion,
      variantKey: itemSnapshot.selectedVariant,
      recipeStatus: "draft",
      readiness: "lista_para_validar",
      sourceType: sourceMarker.provenance.sourceType,
      sourceReference: sourceMarker.provenance.sourceReference,
    }],
  },
  bars: [],
};

const quote = (overrides: Record<string, unknown> = {}) => ({
  createdAt: "2026-10-05T10:00:00.000Z",
  workSnapshot,
  items: [{
    id: itemId,
    code: "V1",
    catalogLineKey: "ventora:veratec-7400-corredera",
    color: "Blanco",
    glassDescription: "Monolítico 4 mm",
    fabricacionSnapshot: itemSnapshot,
    recipeAccessories: [],
  }],
  ...overrides,
});

const route = { params: Promise.resolve({ id: "1046" }) };
const costSnapshot = {
  schemaVersion: 2,
  status: "partial",
  priceOrigin: "own",
  calculatedAt: "2026-10-05T10:01:00.000Z",
  currency: "CLP",
  knownNetTotal: 10000,
  lines: [],
  missing: [],
  assumptions: [],
  sourcePautaCapturedAt: "2026-10-05T10:00:00.000Z",
};

describe("POST /api/cotizaciones/[id]/costo-tecnico-parcial", () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.SUPPLIER_CATALOG_V1_ENABLED = "true";
    process.env.SUPPLIER_CATALOG_V1_QA_ORGANIZATION_IDS = "3";
    process.env.SUPPLIER_CATALOG_V1_NEW_QUOTES_AFTER = "2026-10-05T00:00:00.000Z";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "qa-user", email: "admin@test.com" },
      profile: { organizationId: 3, rol: "admin" },
    });
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue(quote());
    (getExistingTechnicalCostSnapshot as jest.Mock).mockResolvedValue(null);
    (readSupplierPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readWorkshopPresentationPrices as jest.Mock).mockResolvedValue([]);
    (readOrganizationPurchasePricing as jest.Mock).mockResolvedValue({ adjustments: [], overrides: [] });
    (buildPartialTechnicalCostSnapshot as jest.Mock).mockReturnValue(costSnapshot);
    (persistTechnicalCostSnapshot as jest.Mock).mockResolvedValue({ snapshot: costSnapshot });
  });

  it("permite guardar solo si los snapshots del ítem y la pauta comparten la marca QA autorizada", async () => {
    const response = await POST(new Request("http://localhost/api/cotizaciones/1046/costo-tecnico-parcial", { method: "POST" }), route);
    expect(response.status).toBe(200);
    expect(persistTechnicalCostSnapshot).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 3, quoteId: 1046 }));
  });

  it("rechaza a una identidad fuera de la cuenta QA autorizada", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "other", email: "other@example.com" },
      profile: { organizationId: 3, rol: "admin" },
    });
    const response = await POST(new Request("http://localhost/api/cotizaciones/1046/costo-tecnico-parcial", { method: "POST" }), route);
    expect(response.status).toBe(404);
    expect(persistTechnicalCostSnapshot).not.toHaveBeenCalled();
  });

  it("bloquea antes de leer o devolver un costo existente si falta la marca en los snapshots", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue(quote({
      workSnapshot: { ...workSnapshot, qaPreliminary: undefined },
      items: [{ ...quote().items[0], fabricacionSnapshot: { ...itemSnapshot, qaPreliminary: undefined } }],
    }));
    const response = await POST(new Request("http://localhost/api/cotizaciones/1046/costo-tecnico-parcial", { method: "POST" }), route);
    const payload = await response.json();
    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/marca QA preliminar/i);
    expect(getExistingTechnicalCostSnapshot).not.toHaveBeenCalled();
    expect(persistTechnicalCostSnapshot).not.toHaveBeenCalled();
  });

  it("bloquea si la variante persistida no coincide con la procedencia conjunta", async () => {
    (readQuoteForTechnicalCost as jest.Mock).mockResolvedValue(quote({
      items: [{ ...quote().items[0], fabricacionSnapshot: { ...itemSnapshot, selectedVariant: "otra_variante" } }],
    }));
    const response = await POST(new Request("http://localhost/api/cotizaciones/1046/costo-tecnico-parcial", { method: "POST" }), route);
    expect(response.status).toBe(409);
    expect(persistTechnicalCostSnapshot).not.toHaveBeenCalled();
  });
});
