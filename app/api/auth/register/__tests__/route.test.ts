jest.mock("@/features/auth/services/auth-register-rate-limit.service", () => ({
  assertAuthRegisterRateLimit: jest.fn(),
}));

jest.mock("@/features/solicitudes/services/solicitudes-contacto.service", () => ({
  SolicitudContactoValidationError: class SolicitudContactoValidationError extends Error {},
  solicitudesContactoService: {
    createSaasRegistrationRequest: jest.fn(),
  },
}));

import { POST } from "@/app/api/auth/register/route";
import {
  SolicitudContactoValidationError,
  solicitudesContactoService,
} from "@/features/solicitudes/services/solicitudes-contacto.service";

const mockCreateSaasRegistrationRequest =
  solicitudesContactoService.createSaasRegistrationRequest as jest.MockedFunction<
    typeof solicitudesContactoService.createSaasRegistrationRequest
>;

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("guarda una solicitud de cuenta y responde ok", async () => {
    mockCreateSaasRegistrationRequest.mockResolvedValue({
      id: "lead-1",
      organizationId: null,
      nombre: "Juan Perez",
      empresa: "Vidrios del Sur",
      correo: null,
      telefono: "+56912345678",
      contacto: "+56912345678",
      tipoTrabajo: "Solicitud de cuenta Ventora",
      mensaje: "Ciudad/comuna: Puente Alto\nMensaje: Quiero probar Ventora",
      ayuda: "demo",
      contexto: "registro-saas",
      estado: "nueva",
      origen: "registro-saas",
      ip: null,
      userAgent: null,
      creadoEn: null,
      actualizadoEn: null,
      contactadaAt: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      sourceUrl: null,
    });

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "Juan Perez",
          empresa: "Vidrios del Sur",
          whatsapp: "+56 9 1234 5678",
          ciudadComuna: "Puente Alto",
          mensaje: "Quiero probar Ventora",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(mockCreateSaasRegistrationRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Juan Perez",
        empresa: "Vidrios del Sur",
        whatsapp: "+56 9 1234 5678",
        ciudadComuna: "Puente Alto",
        mensaje: "Quiero probar Ventora",
        origen: "registro-saas",
      })
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      message:
        "Recibimos tus datos. Te contactaremos por WhatsApp para dejar tu cuenta configurada.",
    });
  });

  it("responde 400 si la solicitud no valida", async () => {
    mockCreateSaasRegistrationRequest.mockRejectedValue(
      new SolicitudContactoValidationError("Ingresa un WhatsApp válido.")
    );

    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "Juan Perez",
          empresa: "Vidrios",
          whatsapp: "123",
          ciudadComuna: "Santiago",
        }),
      })
    );

    expect(response.status).toBe(400);
  });
});
