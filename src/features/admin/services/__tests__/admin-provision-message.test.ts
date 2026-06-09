import {
  buildProvisionCredentialsText,
  buildProvisionWhatsAppMessage,
} from "@/features/admin/services/admin-provision-message";

describe("admin provision message helpers", () => {
  it("arma texto de credenciales", () => {
    expect(
      buildProvisionCredentialsText({
        email: "cliente@empresa.cl",
        password: "clave1234",
      })
    ).toBe("Correo: cliente@empresa.cl\nContrasena: clave1234");
  });

  it("arma mensaje whatsapp con links", () => {
    const message = buildProvisionWhatsAppMessage({
      appOrigin: "https://ventora.cl",
      empresaNombre: "Vidrios Sur",
      email: "cliente@empresa.cl",
      password: "clave1234",
      trialEndsAt: "2026-06-16T12:00:00.000Z",
    });

    expect(message).toContain("Empresa: Vidrios Sur");
    expect(message).toContain("Entra aqui: https://ventora.cl/login");
    expect(message).toContain(
      "Completa tu empresa aqui: https://ventora.cl/configuracion/empresa"
    );
  });
});
