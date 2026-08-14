import {
  createSlidingWindowRateLimiter,
  parseBoundedFormData,
  parseJsonObjectBody,
  RateLimitUnavailableError,
  readRequestBodyWithLimit,
  RequestBodyTooLargeError,
  resolveRequestIp,
} from "../solicitudes-public-http.service";

describe("solicitudes public HTTP hardening", () => {
  const originalVercel = process.env.VERCEL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRateLimitEnv = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  };

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;

    Object.defineProperty(process.env, "NODE_ENV", {
      value: originalNodeEnv,
      configurable: true,
      writable: true,
    });

    for (const [name, value] of Object.entries(originalRateLimitEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it("corta el stream aunque el cliente no declare content-length", async () => {
    const request = new Request("https://example.test/api", {
      method: "POST",
      body: "123456",
    });
    request.headers.delete("content-length");

    await expect(readRequestBodyWithLimit(request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
  });

  it("solo acepta objetos JSON dentro del limite", async () => {
    const valid = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
    const array = new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "[]",
    });

    await expect(parseJsonObjectBody(valid)).resolves.toEqual({ ok: true });
    await expect(parseJsonObjectBody(array)).resolves.toBeNull();
  });

  it("limita multipart antes de invocar el parser", async () => {
    const form = new FormData();
    form.set("file", new Blob(["contenido"]), "demo.txt");
    const request = new Request("https://example.test/upload", {
      method: "POST",
      body: form,
    });

    await expect(parseBoundedFormData(request, 4)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError
    );
  });

  it("en Vercel usa solo el encabezado controlado por la plataforma", () => {
    process.env.VERCEL = "1";
    const request = new Request("https://example.test/api", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.8",
        "x-forwarded-for": "198.51.100.99",
        "x-real-ip": "192.0.2.20",
      },
    });

    expect(resolveRequestIp(request)).toBe("203.0.113.8");
  });

  it("falla cerrado en produccion si no existe limitador distribuido", async () => {
    process.env.VERCEL = "1";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const limiter = createSlidingWindowRateLimiter({
      namespace: "test:fail-closed",
      windowMs: 60_000,
      maxRequests: 1,
    });

    expect(limiter.mode).toBe("unavailable");
    await expect(limiter.isRateLimited("203.0.113.8")).rejects.toBeInstanceOf(
      RateLimitUnavailableError
    );
  });
});
