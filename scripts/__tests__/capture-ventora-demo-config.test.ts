import { resolveDemoCaptureConfig } from "../capture-ventora-demo-config";

describe("resolveDemoCaptureConfig", () => {
  const baseEnv = {
    VENTORA_DEMO_BASE_URL: "https://ventora-staging.example.com",
    VENTORA_DEMO_EMAIL: "demo-staging@example.com",
    VENTORA_DEMO_PASSWORD: "secret-from-vault",
  };

  it("exige URL y credenciales explicitas", () => {
    expect(() => resolveDemoCaptureConfig({})).toThrow("VENTORA_DEMO_BASE_URL");
  });

  it("rechaza todos los hosts de produccion de Ventora", () => {
    expect(() =>
      resolveDemoCaptureConfig({
        ...baseEnv,
        VENTORA_DEMO_BASE_URL: "https://www.ventorap.cl",
      })
    ).toThrow("produccion");
  });

  it("rechaza HTTP fuera de localhost", () => {
    expect(() =>
      resolveDemoCaptureConfig({
        ...baseEnv,
        VENTORA_DEMO_BASE_URL: "http://staging.example.com",
      })
    ).toThrow("HTTPS");
  });

  it("acepta staging HTTPS sin exponer secretos en la URL", () => {
    expect(resolveDemoCaptureConfig(baseEnv)).toEqual({
      baseUrl: "https://ventora-staging.example.com",
      email: "demo-staging@example.com",
      password: "secret-from-vault",
      publicSlug: undefined,
      quoteToken: undefined,
    });
  });
});
