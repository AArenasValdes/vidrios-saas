import {
  buildProvisionActivationText,
  buildProvisionWhatsAppMessage,
} from "@/features/admin/services/admin-provision-message";

describe("admin provision message helpers", () => {
  it("arma texto de activacion sin secretos", () => {
    expect(
      buildProvisionActivationText({
        email: "cliente@empresa.cl",
      })
    ).toContain("Activacion: enviada al correo");
  });

  it("arma mensaje whatsapp con links", () => {
    const message = buildProvisionWhatsAppMessage({
      empresaNombre: "Vidrios Sur",
      email: "cliente@empresa.cl",
      trialEndsAt: "2026-06-16T12:00:00.000Z",
    });

    expect(message).toContain("Empresa: Vidrios Sur");
    expect(message).not.toContain("clave1234");
    expect(message).not.toContain("Contrasena:");
    expect(message).toContain("correo de activacion de un solo uso");
  });
});
