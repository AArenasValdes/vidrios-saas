jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/features/cotizaciones/services/cotizaciones.service", () => ({
  createCotizacionesAppService: jest.fn(),
}));

jest.mock("@/features/clientes/repositories/clientes-repository", () => ({
  createClientesRepository: jest.fn(),
}));

jest.mock("@/features/cotizaciones/repositories/cotizaciones-repository", () => ({
  createCotizacionesRepository: jest.fn(),
}));

jest.mock("@/features/projects/repositories/projects.repository", () => ({
  createProjectsRepository: jest.fn(),
}));

import { GET } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createClient } from "@/lib/supabase/server";
import { createCotizacionesAppService } from "@/features/cotizaciones/services/cotizaciones.service";

describe("/api/cotizaciones/resumen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue({});
  });

  it("propaga el error de auth", async () => {
    const { AuthRouteAccessError } = jest.requireMock(
      "@/features/auth/services/auth-route-access.service"
    );
    (resolveAuthenticatedRouteContext as jest.Mock).mockRejectedValue(
      new AuthRouteAccessError(401, "No autorizado.")
    );

    const request = new Request("http://localhost/api/cotizaciones/resumen");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "No autorizado." });
  });

  it("mantiene el resumen de cotizaciones acotado a la organizacion activa", async () => {
    const listWorkflowSummaryPageByOrganizationId = jest.fn().mockResolvedValue({
      cotizaciones: [{ id: 100 }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
      summary: {
        totalCount: 1,
        totalAmount: 714000,
        approvedAmount: 0,
        counts: {
          borrador: 0,
          creada: 1,
          enviada: 0,
          aprobada: 0,
          rechazada: 0,
          terminada: 0,
        },
      },
    });

    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-2", email: "seller@ventora.cl" },
      profile: { organizationId: "org-55", rol: "admin" },
    });
    (createCotizacionesAppService as jest.Mock).mockReturnValue({
      listWorkflowSummaryPageByOrganizationId,
    });

    const request = new Request(
      "http://localhost/api/cotizaciones/resumen?page=1&pageSize=25"
    );
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listWorkflowSummaryPageByOrganizationId).toHaveBeenCalledWith("org-55", {
      page: 1,
      pageSize: 25,
      estado: null,
      clienteNombre: null,
      period: "all",
      order: "updated_desc",
      search: null,
    });
    expect(payload).toEqual({
      cotizaciones: [{ id: 100 }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
      summary: {
        totalCount: 1,
        totalAmount: 714000,
        approvedAmount: 0,
        counts: {
          borrador: 0,
          creada: 1,
          enviada: 0,
          aprobada: 0,
          rechazada: 0,
          terminada: 0,
        },
      },
    });
  });
});
