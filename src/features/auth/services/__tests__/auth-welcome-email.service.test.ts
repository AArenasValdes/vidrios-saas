import { buildWelcomeEmailContent } from "../auth-welcome-email.template";

describe("buildWelcomeEmailContent", () => {
  it("personaliza el asunto y el cuerpo con nombre y fecha de prueba", () => {
    const content = buildWelcomeEmailContent({
      nombre: "Juan Pérez",
      empresaNombre: "Vidrios Norte",
      trialEndsAt: "2026-08-28T12:00:00.000Z",
    });

    expect(content.subject).toBe("Hola Juan, tu cuenta está lista");
    expect(content.text).toContain("Tu prueba gratuita de Ventora ya está activa");
    expect(content.text).toContain("Crea tu primera cotización");
    expect(content.text).toContain("Crear mi primera cotización:");
    expect(content.html).toContain("Crear mi primera cotización");
    expect(content.html).toContain("/cotizaciones/nueva");
    expect(content.html).toContain("ventora-logo-login-clean-dark.svg");
    expect(content.html).toContain("Te avisaremos antes de que termine");
  });
});
