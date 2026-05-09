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
    listSolicitudesResumen: jest.fn(),
    listSolicitudesResumenByOrganizationId: jest.fn(),
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
    (solicitudesContactoService.listSolicitudesResumen as jest.Mock).mockResolvedValue([
      { id: "lead-1" },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(solicitudesContactoService.listSolicitudesResumen).toHaveBeenCalled();
    expect(
      solicitudesContactoService.listSolicitudesResumenByOrganizationId
    ).not.toHaveBeenCalled();
    expect(payload).toEqual({ solicitudes: [{ id: "lead-1" }] });
  });

  it("mantiene el filtro por organizacion para admins normales", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { rol: "admin", organizationId: "org-7" },
    });
    (canAccessSolicitudes as jest.Mock).mockReturnValue(true);
    (canAccessAllSolicitudes as jest.Mock).mockReturnValue(false);
    (
      solicitudesContactoService.listSolicitudesResumenByOrganizationId as jest.Mock
    ).mockResolvedValue([{ id: "lead-2" }]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(
      solicitudesContactoService.listSolicitudesResumenByOrganizationId
    ).toHaveBeenCalledWith("org-7");
    expect(solicitudesContactoService.listSolicitudesResumen).not.toHaveBeenCalled();
    expect(payload).toEqual({ solicitudes: [{ id: "lead-2" }] });
  });
});
