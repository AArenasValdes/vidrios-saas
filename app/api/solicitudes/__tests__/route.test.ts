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
    listSolicitudes: jest.fn(),
    listSolicitudesByOrganizationId: jest.fn(),
    createSolicitud: jest.fn(),
    updateSolicitudStatus: jest.fn(),
  },
  SolicitudContactoValidationError: class SolicitudContactoValidationError extends Error {},
}));

import { GET, PATCH, POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import {
  canAccessAllSolicitudes,
  canAccessSolicitudes,
} from "@/features/solicitudes/services/solicitudes-contacto-access";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

describe("/api/solicitudes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("usa el listado global cuando el admin puede revisar todas las organizaciones", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "alessandroreal2.0@gmail.com" },
      profile: { rol: "admin", organizationId: null },
    });
    (canAccessSolicitudes as jest.Mock).mockReturnValue(true);
    (canAccessAllSolicitudes as jest.Mock).mockReturnValue(true);
    (solicitudesContactoService.listSolicitudes as jest.Mock).mockResolvedValue([
      { id: "lead-1" },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(solicitudesContactoService.listSolicitudes).toHaveBeenCalled();
    expect(
      solicitudesContactoService.listSolicitudesByOrganizationId
    ).not.toHaveBeenCalled();
    expect(payload).toEqual({ solicitudes: [{ id: "lead-1" }] });
  });

  it("rechaza body invalido en el POST publico", async () => {
    const request = new Request("http://localhost/api/solicitudes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{invalido",
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(solicitudesContactoService.createSolicitud).not.toHaveBeenCalled();
    expect(payload).toEqual({
      error: "La solicitud no tiene un formato valido.",
    });
  });

  it("mantiene el scope por organizacion al actualizar solicitudes aunque el email este allowlist", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { rol: "admin", organizationId: "org-7" },
    });
    (canAccessSolicitudes as jest.Mock).mockReturnValue(true);
    (canAccessAllSolicitudes as jest.Mock).mockReturnValue(true);
    (solicitudesContactoService.updateSolicitudStatus as jest.Mock).mockResolvedValue({
      id: "lead-1",
      organizationId: "org-7",
      estado: "contactada",
    });

    const request = new Request("http://localhost/api/solicitudes", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: "lead-1",
        estado: "contactada",
      }),
    });

    const response = await PATCH(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(solicitudesContactoService.updateSolicitudStatus).toHaveBeenCalledWith({
      id: "lead-1",
      estado: "contactada",
      organizationId: "org-7",
    });
    expect(payload).toEqual({
      solicitud: {
        id: "lead-1",
        organizationId: "org-7",
        estado: "contactada",
      },
    });
  });
});
