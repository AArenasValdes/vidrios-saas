jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  resolveAuthenticatedRouteContext: jest.fn(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));

jest.mock("@/features/proveedor-catalogos/repositories/workshop-presentations.repository", () => {
  const actual = jest.requireActual("@/features/proveedor-catalogos/repositories/workshop-presentations.repository");
  return {
    ...actual,
    listOfficialTechnicalInputsForFamily: jest.fn(async () => []),
    listWorkshopPresentations: jest.fn(),
    createWorkshopPresentation: jest.fn(),
    updateWorkshopPresentationPurchase: jest.fn(),
  };
});

import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createWorkshopPresentation,
  listWorkshopPresentations,
  updateWorkshopPresentationPurchase,
} from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";
import { saveQuickWorkshopProfileCost } from "@/features/proveedor-catalogos/services/mis-precios.client.service";
import { GET, PATCH, POST } from "../route";

describe("/api/proveedor-catalogos/taller-presentaciones", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "user-1" },
      profile: { organizationId: 7, rol: "admin" },
    });
    (createAdminClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: { id: 10, catalog_key: "ventora:l42" }, error: null }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  it("permite crear -> consultar -> editar -> volver a consultar un costo TIRA con saveQuickWorkshopProfileCost", async () => {
    const store: Array<Record<string, unknown>> = [];
    (listWorkshopPresentations as jest.Mock).mockImplementation(async () => [...store]);
    (createWorkshopPresentation as jest.Mock).mockImplementation(async (input) => {
      const created = {
        id: "11111111-1111-4111-8111-111111111111",
        organization_id: input.organizationId,
        family_key: input.familyKey,
        configuration_key: input.configurationKey,
        insumo_oficial_id: input.officialInputId,
        codigo_tecnico: input.technicalCode,
        codigo_receta: input.recipeCode,
        nombre_perfil: input.profileName,
        sku_taller: input.workshopSku,
        descripcion: input.description,
        modo_acabado: input.finishName ? "especifico" : "independiente",
        acabado_nombre: input.finishName,
        unidad_compra: input.purchaseUnit,
        largo_comercial_mm: input.commercialLengthMm,
        precio_neto: input.netPrice,
        moneda: input.currency,
        proveedor_nombre: input.supplierName ?? null,
        preferida: input.preferred,
        revision: 1,
        creado_en: "2026-11-20T00:00:00.000Z",
      };
      store.push(created);
      return created;
    });
    (updateWorkshopPresentationPurchase as jest.Mock).mockImplementation(async (input) => {
      const row = store.find((entry) => entry.id === input.presentationId && entry.revision === input.expectedRevision);
      if (!row) throw new Error("La presentación cambió");
      row.unidad_compra = input.purchaseUnit;
      row.largo_comercial_mm = input.commercialLengthMm;
      row.precio_neto = input.netPrice;
      row.moneda = input.currency;
      row.revision = input.expectedRevision + 1;
      return {
        id: row.id,
        revision: row.revision,
        unidad_compra: row.unidad_compra,
        largo_comercial_mm: row.largo_comercial_mm,
        precio_neto: row.precio_neto,
        moneda: row.moneda,
        preferida: row.preferida,
      };
    });

    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (_url, init) => {
      const req = new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones", {
        method: init?.method,
        headers: init?.headers as HeadersInit,
        body: init?.body as BodyInit,
      });
      return init?.method === "POST" ? POST(req) : PATCH(req);
    }) as jest.Mock;

    try {
      await saveQuickWorkshopProfileCost({
        kind: "create",
        lineTemplateId: 10,
        technicalCode: "4201",
        profileName: "Marco L42",
        finishName: "Blanco",
        commercialLengthMm: 6000,
        netPrice: 15000,
        supplierName: "Aluminera",
      });

      const firstGet = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=10"));
      expect(firstGet.status).toBe(200);
      const firstBody = await firstGet.json();
      expect(firstBody.ownPresentations).toEqual([
        expect.objectContaining({
          id: "11111111-1111-4111-8111-111111111111",
          codigo_tecnico: "4201",
          unidad_compra: "TIRA",
          precio_neto: 15000,
          revision: 1,
        }),
      ]);

      await saveQuickWorkshopProfileCost({
        kind: "update",
        lineTemplateId: 10,
        presentationId: "11111111-1111-4111-8111-111111111111",
        expectedRevision: 1,
        purchaseUnit: "TIRA",
        commercialLengthMm: 6200,
        netPrice: 16500,
        supplierName: "Aluminera",
      });

      const secondGet = await GET(new Request("http://localhost/api/proveedor-catalogos/taller-presentaciones?lineTemplateId=10"));
      const secondBody = await secondGet.json();
      expect(secondBody.ownPresentations).toEqual([
        expect.objectContaining({
          id: "11111111-1111-4111-8111-111111111111",
          unidad_compra: "TIRA",
          largo_comercial_mm: 6200,
          precio_neto: 16500,
          revision: 2,
        }),
      ]);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
