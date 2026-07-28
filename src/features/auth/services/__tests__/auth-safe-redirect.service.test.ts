import { sanitizeAuthNextPath, buildOAuthCallbackUrl } from "../auth-safe-redirect.service";

describe("auth-safe-redirect.service", () => {
  it("acepta rutas internas permitidas", () => {
    expect(sanitizeAuthNextPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("/activacion")).toBe("/activacion");
    expect(sanitizeAuthNextPath("/cotizaciones/nueva")).toBe("/cotizaciones/nueva");
  });

  it("rechaza open redirects y usa fallback", () => {
    expect(sanitizeAuthNextPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("/evil")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("/login")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("/registro")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("/auth/completar-cuenta")).toBe("/dashboard");
    expect(sanitizeAuthNextPath(null)).toBe("/dashboard");
  });

  it("permite usar activacion como fallback del alta", () => {
    expect(
      sanitizeAuthNextPath("https://evil.com", "/activacion")
    ).toBe("/activacion");
  });

  it("construye callback OAuth con intent y next seguro", () => {
    const url = buildOAuthCallbackUrl({
      origin: "https://www.ventorap.cl",
      intent: "signup",
      provider: "google",
      nextPath: "https://evil.com",
    });

    expect(url).toBe(
      "https://www.ventorap.cl/auth/callback?intent=signup&provider=google&next=%2Fdashboard"
    );
  });
});
