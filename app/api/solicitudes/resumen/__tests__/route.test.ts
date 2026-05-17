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

jest.mock("@/features/solicitudes/services/solicitudes-contacto-access", () => ({
  canAccessSolicitudes: jest.fn(),
  canAccessAllSolicitudes: jest.fn(),
}));

jest.mock("@/features/solicitudes/services/solicitudes-contacto.service", () => ({
  solicitudesContactoService: {
    listSolicitudesResumenPage: jest.fn(),
    listSolicitudesResumenPageByOrganizationId: jest.fn(),
    getSolicitudesResumenGlobal: jest.fn(),
    getSolicitudesResumenGlobalByOrganizationId: jest.fn(),
  },
}));

import { GET } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  canAccessAllSolicitudes,
  canAccessSolicitudes,
} from "@/features/solicitudes/services/solicitudes-contacto-access";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

describe("/api/solicitudes/resumen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("usa el resumen global cuando el admin esta habilitado para revisar todo", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "alessandroreal2.0@gmail.com" },
      profile: { rol: "admin", organizationId: null },
    });
    (canAccessSolicitudes as jest.Mock).mockReturnValue(true);
    (canAccessAllSolicitudes as jest.Mock).mockReturnValue(true);
    (
      solicitudesContactoService.listSolicitudesResumenPage as jest.Mock
    ).mockResolvedValue({
      solicitudes: [{ id: "lead-1" }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
    });
    (
      solicitudesContactoService.getSolicitudesResumenGlobal as jest.Mock
    ).mockResolvedValue({
      total: 1,
      hoy: 1,
      counts: {
        nueva: 1,
        contactada: 0,
        cerrada: 0,
        descartada: 0,
      },
    });

    const request = new Request("http://localhost/api/solicitudes/resumen");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(solicitudesContactoService.listSolicitudesResumenPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 25,
      estado: null,
      search: null,
    });
    expect(
      solicitudesContactoService.listSolicitudesResumenPageByOrganizationId
    ).not.toHaveBeenCalled();
    expect(payload).toEqual({
      solicitudes: [{ id: "lead-1" }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
      summary: {
        total: 1,
        hoy: 1,
        counts: {
          nueva: 1,
          contactada: 0,
          cerrada: 0,
          descartada: 0,
        },
      },
    });
  });

  it("mantiene el filtro por organizacion para admins normales", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { rol: "admin", organizationId: "org-7" },
    });
    (canAccessSolicitudes as jest.Mock).mockReturnValue(true);
    (canAccessAllSolicitudes as jest.Mock).mockReturnValue(true);
    (
      solicitudesContactoService.listSolicitudesResumenPageByOrganizationId as jest.Mock
    ).mockResolvedValue({
      solicitudes: [{ id: "lead-2" }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
    });
    (
      solicitudesContactoService.getSolicitudesResumenGlobalByOrganizationId as jest.Mock
    ).mockResolvedValue({
      total: 1,
      hoy: 0,
      counts: {
        nueva: 0,
        contactada: 1,
        cerrada: 0,
        descartada: 0,
      },
    });

    const request = new Request("http://localhost/api/solicitudes/resumen");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(
      solicitudesContactoService.listSolicitudesResumenPageByOrganizationId
    ).toHaveBeenCalledWith("org-7", {
      page: 1,
      pageSize: 25,
      estado: null,
      search: null,
    });
    expect(solicitudesContactoService.listSolicitudesResumenPage).not.toHaveBeenCalled();
    expect(payload).toEqual({
      solicitudes: [{ id: "lead-2" }],
      totalCount: 1,
      hasMore: false,
      page: 1,
      pageSize: 25,
      summary: {
        total: 1,
        hoy: 0,
        counts: {
          nueva: 0,
          contactada: 1,
          cerrada: 0,
          descartada: 0,
        },
      },
    });
  });
});
