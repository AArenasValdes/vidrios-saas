jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
  },
}));
jest.mock("@/features/fabricacion/repositories/fabrication-cut-settings.repository", () => ({
  getFabricationCutSettings: jest.fn(),
  saveFabricationCutSettings: jest.fn(),
  FabricationCutSettingsSchemaMissingError: class FabricationCutSettingsSchemaMissingError extends Error {},
}));

import { GET, PUT } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { getFabricationCutSettings, saveFabricationCutSettings } from "@/features/fabricacion/repositories/fabrication-cut-settings.repository";

const request = (body: unknown) => new Request("http://localhost/api/configuracion/fabricacion/parametros-corte", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("/api/configuracion/fabricacion/parametros-corte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "user-7" }, profile: { organizationId: 7, rol: "admin" },
    });
    (getFabricationCutSettings as jest.Mock).mockResolvedValue(null);
    (saveFabricationCutSettings as jest.Mock).mockResolvedValue({ organizationId: 7 });
  });

  it("lee solo la organización activa de la sesión", async () => {
    expect((await GET()).status).toBe(200);
    expect(getFabricationCutSettings).toHaveBeenCalledWith(7);
  });

  it("guarda parámetros confirmados con organización y actor de la sesión", async () => {
    const response = await PUT(request({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true }));
    expect(response.status).toBe(200);
    expect(saveFabricationCutSettings).toHaveBeenCalledWith({
      organizationId: 7, userId: "user-7", perdidaCorteMm: 3, despunteInicialMm: 12,
    });
  });

  it("rechaza confirmación ausente, valores fuera de rango y organización en body", async () => {
    expect((await PUT(request({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza" }))).status).toBe(400);
    expect((await PUT(request({ perdidaCorteMm: 21, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true }))).status).toBe(400);
    expect((await PUT(request({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true, organizationId: 8 }))).status).toBe(400);
    expect(saveFabricationCutSettings).not.toHaveBeenCalled();
  });

  it("bloquea escritura de usuarios sin permiso y conserva el aislamiento de otra organización", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValueOnce({ user: { id: "viewer" }, profile: { organizationId: 7, rol: "vendedor" } });
    expect((await PUT(request({ perdidaCorteMm: 3, despunteInicialMm: 12, procedimiento: "por_pieza", confirmacionExplicita: true }))).status).toBe(403);
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValueOnce({ user: { id: "user-8" }, profile: { organizationId: 8, rol: "admin" } });
    expect((await GET()).status).toBe(200);
    expect(getFabricationCutSettings).toHaveBeenCalledWith(8);
  });
});
