import {
  buildCotizacionApprovalPath,
  buildCotizacionApprovalUrl,
  resolveAppOrigin,
} from "../cotizacion-approval";

describe("cotizacion-approval utils", () => {
  const originalEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL:
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL =
      originalEnv.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = originalEnv.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.NEXT_PUBLIC_VERCEL_URL = originalEnv.NEXT_PUBLIC_VERCEL_URL;
    process.env.VERCEL_URL = originalEnv.VERCEL_URL;
  });

  it("debe construir la ruta publica del presupuesto", () => {
    expect(buildCotizacionApprovalPath("abc123")).toBe("/presupuesto/abc123");
  });

  it("debe priorizar la url publica configurada", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vidrios-saas.vercel.app/";
    process.env.NEXT_PUBLIC_SITE_URL = "";

    expect(resolveAppOrigin()).toBe("https://vidrios-saas.vercel.app");
  });

  it("debe usar el dominio de vercel si no hay app url configurada", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.NEXT_PUBLIC_SITE_URL = "";
    process.env.VERCEL_URL = "vidrios-saas.vercel.app";

    expect(resolveAppOrigin()).toBe("https://vidrios-saas.vercel.app");
  });

  it("debe construir la url completa del presupuesto", () => {
    const url = buildCotizacionApprovalUrl(
      "abc123abc123abc123abc123abc123ab",
      "https://vidrios-saas.vercel.app"
    );

    expect(url).toBe(
      "https://vidrios-saas.vercel.app/presupuesto/abc123abc123abc123abc123abc123ab"
    );
  });
});
