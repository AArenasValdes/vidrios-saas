/** @jest-environment node */
import { GET, PATCH, POST } from "../route";
import { AuthRouteAccessError, resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  createWorkshopGlassCutPresentation,
  listOrganizationGlassProducts,
  listWorkshopGlassCutPresentations,
  updateWorkshopGlassCutPresentation,
  WorkshopPresentationsSchemaMissingError,
} from "@/features/proveedor-catalogos/repositories/workshop-presentations.repository";

jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  AuthRouteAccessError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  resolveAuthenticatedRouteContext: jest.fn(),
}));

jest.mock("@/features/proveedor-catalogos/repositories/workshop-presentations.repository", () => ({
  WorkshopPresentationsSchemaMissingError: class extends Error {},
  WorkshopPresentationConflictError: class extends Error {},
  listOrganizationGlassProducts: jest.fn(),
  listWorkshopGlassCutPresentations: jest.fn(),
  createWorkshopGlassCutPresentation: jest.fn(),
  updateWorkshopGlassCutPresentation: jest.fn(),
}));

const authMock = resolveAuthenticatedRouteContext as jest.MockedFunction<typeof resolveAuthenticatedRouteContext>;
const listProductsMock = listOrganizationGlassProducts as jest.MockedFunction<typeof listOrganizationGlassProducts>;
const listGlassMock = listWorkshopGlassCutPresentations as jest.MockedFunction<typeof listWorkshopGlassCutPresentations>;
const createGlassMock = createWorkshopGlassCutPresentation as jest.MockedFunction<typeof createWorkshopGlassCutPresentation>;
const updateGlassMock = updateWorkshopGlassCutPresentation as jest.MockedFunction<typeof updateWorkshopGlassCutPresentation>;

describe("/api/proveedor-catalogos/taller-vidrios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authMock.mockResolvedValue({
      user: { id: "user-1" },
      profile: { organizationId: 99, rol: "admin" },
    } as never);
    listProductsMock.mockResolvedValue([
      { id: 3643, productId: "3643", name: "Incoloro monolítico 5mm", category: "monolitico", thicknessMm: 5 },
    ]);
    listGlassMock.mockResolvedValue({ presentations: [], schemaPending: false });
  });

  it("lista productos de vidrio y presentaciones privadas de la organización sin exponer otras empresas", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(listProductsMock).toHaveBeenCalledWith(99);
    expect(listGlassMock).toHaveBeenCalledWith(99);
    expect(body.glassProducts).toHaveLength(1);
    expect(body.schemaPending).toBe(false);
  });

  it("bloquea escritura a roles sin permiso (403) y propaga 401 si falla autenticación", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "user-2" },
      profile: { organizationId: 99, rol: "vendedor" },
    } as never);
    const forbidden = await POST(
      new Request("http://localhost/api/proveedor-catalogos/taller-vidrios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(forbidden.status).toBe(403);

    authMock.mockRejectedValueOnce(new AuthRouteAccessError(401, "No autorizado"));
    const unauth = await GET();
    expect(unauth.status).toBe(401);
  });

  it("crea y actualiza presentación de vidrio al corte (M2) validando vigencia y precio positivo", async () => {
    const invalidDates = await POST(
      new Request("http://localhost/api/proveedor-catalogos/taller-vidrios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "monolitico",
          thicknessMm: 5,
          description: "Incoloro 5mm",
          supplierName: "Vidriería Sur",
          netPricePerM2: 14500,
          currency: "CLP",
          validFrom: "2026-12-01",
          validUntil: "2026-11-01",
        }),
      })
    );
    expect(invalidDates.status).toBe(400);

    createGlassMock.mockResolvedValueOnce({ id: "g-1", revision: 1 } as never);
    const created = await POST(
      new Request("http://localhost/api/proveedor-catalogos/taller-vidrios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          glassLineTemplateId: 3643,
          glassProductId: "3643",
          category: "monolitico",
          thicknessMm: 5,
          description: "Incoloro monolítico 5mm",
          supplierName: "Vidriería Sur",
          netPricePerM2: 14500,
          minBillableM2PerPane: 0.5,
          currency: "CLP",
          validFrom: "2026-11-01",
          validUntil: "2026-12-31",
        }),
      })
    );
    expect(created.status).toBe(201);
    expect(createGlassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 99,
        glassLineTemplateId: 3643,
        category: "monolitico",
        thicknessMm: 5,
        netPricePerM2: 14500,
        minBillableM2PerPane: 0.5,
      })
    );

    updateGlassMock.mockResolvedValueOnce({ id: "g-1", revision: 2 } as never);
    const updated = await PATCH(
      new Request("http://localhost/api/proveedor-catalogos/taller-vidrios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationId: "11111111-1111-4111-8111-111111111111",
          expectedRevision: 1,
          supplierName: "Vidriería Sur",
          netPricePerM2: 15200,
          minBillableM2PerPane: null,
          currency: "CLP",
        }),
      })
    );
    expect(updated.status).toBe(200);
    expect(updateGlassMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 99,
        expectedRevision: 1,
        netPricePerM2: 15200,
      })
    );
  });

  it("devuelve 503 si la migración de vidrio aún no se aplica en BD", async () => {
    createGlassMock.mockRejectedValueOnce(new WorkshopPresentationsSchemaMissingError());
    const res = await POST(
      new Request("http://localhost/api/proveedor-catalogos/taller-vidrios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "monolitico",
          thicknessMm: 5,
          description: "Incoloro 5mm",
          supplierName: "Vidriería Sur",
          netPricePerM2: 14500,
          currency: "CLP",
        }),
      })
    );
    expect(res.status).toBe(503);
  });
});
