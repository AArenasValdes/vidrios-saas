import { buildWelcomeEmailContent } from "../auth-welcome-email.template";

describe("buildWelcomeEmailContent", () => {
  it("personaliza el asunto y el cuerpo con nombre y empresa", () => {
    const content = buildWelcomeEmailContent({
      to: "juan@taller.cl",
      nombre: "Juan Pérez",
      empresaNombre: "Vidrios Norte",
      trialEndsAt: "2026-08-28T12:00:00.000Z",
    });

    expect(content.subject).toBe("Juan, bienvenido a Ventora");
    expect(content.text).toContain("Vidrios Norte");
    expect(content.text).toContain("15 dias gratis");
    expect(content.html).toContain("Vidrios Norte");
    expect(content.html).toContain("Entrar a Ventora");
  });
});
