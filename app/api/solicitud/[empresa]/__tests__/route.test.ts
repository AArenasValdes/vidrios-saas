jest.mock("@/features/solicitudes/services/solicitudes-contacto.service", () => ({
  solicitudesContactoService: {
    getPublicRequestConfig: jest.fn(),
    createPublicRequest: jest.fn(),
  },
  SolicitudContactoValidationError: class SolicitudContactoValidationError extends Error {},
}));

import { POST } from "../route";
import { solicitudesContactoService } from "@/features/solicitudes/services/solicitudes-contacto.service";

describe("/api/solicitud/[empresa]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza slugs invalidos antes de consultar la empresa publica", async () => {
    const request = new Request("http://localhost/api/solicitud/empresa-invalida");
    const response = await POST(request, {
      params: Promise.resolve({ empresa: "../otro-slug" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(solicitudesContactoService.getPublicRequestConfig).not.toHaveBeenCalled();
    expect(payload).toEqual({
      error: "No encontramos la empresa solicitada.",
    });
  });

  it("rechaza JSON invalido en la captacion publica", async () => {
    const request = new Request("http://localhost/api/solicitud/ventora", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{invalido",
    });

    const response = await POST(request, {
      params: Promise.resolve({ empresa: "ventora" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(solicitudesContactoService.createPublicRequest).not.toHaveBeenCalled();
    expect(payload).toEqual({
      error: "La solicitud no tiene un formato valido.",
    });
  });

  it("rechaza captacion en una pagina despublicada", async () => {
    (solicitudesContactoService.getPublicRequestConfig as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost/api/solicitud/ventora", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nombre: "Ana",
        contacto: "+56912345678",
        tipoTrabajo: "Ventanas",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ empresa: "ventora" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(solicitudesContactoService.createPublicRequest).not.toHaveBeenCalled();
    expect(payload).toEqual({
      error: "No encontramos la empresa solicitada.",
    });
  });

  it("aplica rate limiting por IP en la ruta publica critica", async () => {
    (solicitudesContactoService.getPublicRequestConfig as jest.Mock).mockResolvedValue({
      organizationId: "org-1",
      empresaNombre: "Ventora",
    });
    (solicitudesContactoService.createPublicRequest as jest.Mock).mockResolvedValue({
      id: "lead-1",
    });

    const makeRequest = () =>
      new Request("http://localhost/api/solicitud/ventora", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.42",
        },
        body: JSON.stringify({
          nombre: "Ana",
          contacto: "+56912345678",
        }),
      });

    for (let index = 0; index < 5; index += 1) {
      const response = await POST(makeRequest(), {
        params: Promise.resolve({ empresa: "ventora" }),
      });

      expect(response.status).toBe(201);
    }

    const blockedResponse = await POST(makeRequest(), {
      params: Promise.resolve({ empresa: "ventora" }),
    });
    const payload = await blockedResponse.json();

    expect(blockedResponse.status).toBe(429);
    expect(payload).toEqual({
      error: "Recibimos demasiadas solicitudes. Intenta nuevamente en unos minutos.",
    });
  });
});
