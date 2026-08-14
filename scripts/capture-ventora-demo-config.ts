const PRODUCTION_HOSTS = new Set(["ventorap.cl", "www.ventorap.cl"]);

export type DemoCaptureConfig = {
  baseUrl: string;
  email: string;
  password: string;
  publicSlug?: string;
  quoteToken?: string;
};

function requireSecret(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} es obligatoria. Usa credenciales exclusivas de staging.`);
  }
  return value;
}

function normalizeAndValidateBaseUrl(value: string) {
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  const hostname = url.hostname.toLowerCase();

  if (PRODUCTION_HOSTS.has(hostname) || hostname.endsWith(".ventorap.cl")) {
    throw new Error(
      "La captura demo no puede ejecutarse contra produccion. Usa una URL de staging aislada."
    );
  }

  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (url.protocol !== "https:" && !isLocalhost) {
    throw new Error("VENTORA_DEMO_BASE_URL debe usar HTTPS fuera de localhost.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function resolveDemoCaptureConfig(
  env: NodeJS.ProcessEnv = process.env
): DemoCaptureConfig {
  return {
    baseUrl: normalizeAndValidateBaseUrl(requireSecret(env, "VENTORA_DEMO_BASE_URL")),
    email: requireSecret(env, "VENTORA_DEMO_EMAIL"),
    password: requireSecret(env, "VENTORA_DEMO_PASSWORD"),
    publicSlug: env.VENTORA_DEMO_PUBLIC_SLUG?.trim() || undefined,
    quoteToken: env.VENTORA_DEMO_QUOTE_TOKEN?.trim() || undefined,
  };
}
