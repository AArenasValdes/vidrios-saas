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

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "No autorizado." });
  });

  it("mantiene el resumen de cotizaciones acotado a la organizacion activa", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-2", email: "seller@ventora.cl" },
      profile: { organizationId: "org-55", rol: "admin" },
    });
    (createCotizacionesAppService as jest.Mock).mockReturnValue({
      listWorkflowSummaryByOrganizationId: jest.fn().mockResolvedValue([{ id: 100 }]),
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(createCotizacionesAppService).toHaveReturnedWith(
      expect.objectContaining({
        listWorkflowSummaryByOrganizationId: expect.any(Function),
      })
    );
    expect(payload).toEqual({ cotizaciones: [{ id: 100 }] });
  });
});
