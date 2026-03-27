const APPROVAL_TOKEN_LENGTH = 32;
const PUBLIC_URL_PLACEHOLDER = "https://tu-dominio.cl";
const CANONICAL_PUBLIC_ORIGIN = "https://ventorap.cl";
const CANONICAL_PUBLIC_HOSTS = new Set(["ventorap.cl", "www.ventorap.cl"]);

function normalizeOrigin(origin: string | null | undefined) {
  const trimmed = origin?.trim() ?? "";

  if (!trimmed || trimmed === "undefined" || trimmed === "null") {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function canonicalizeOrigin(origin: string) {
  try {
    const parsed = new URL(origin);

    if (CANONICAL_PUBLIC_HOSTS.has(parsed.hostname.toLowerCase())) {
      return CANONICAL_PUBLIC_ORIGIN;
    }

    return parsed.origin.replace(/\/+$/, "");
  } catch {
    return origin;
  }
}

function normalizeConfiguredOrigin(origin: string | null | undefined) {
  const normalized = normalizeOrigin(origin);

  if (!normalized || normalized === PUBLIC_URL_PLACEHOLDER) {
    return "";
  }

  return canonicalizeOrigin(normalized);
}

function randomHex(length: number) {
  const targetBytes = Math.ceil(length / 2);
  const buffer = new Uint8Array(targetBytes);

  crypto.getRandomValues(buffer);

  return Array.from(buffer, (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

export function createApprovalToken() {
  return randomHex(APPROVAL_TOKEN_LENGTH);
}

export function buildCotizacionApprovalPath(token: string) {
  return `/presupuesto/${token}`;
}

export function resolveAppOrigin() {
  const normalizedConfigured = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    CANONICAL_PUBLIC_ORIGIN,
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_URL,
  ]
    .map((value) => normalizeConfiguredOrigin(value))
    .find(Boolean);

  if (normalizedConfigured) {
    return normalizedConfigured;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    const runtimeOrigin = canonicalizeOrigin(window.location.origin.replace(/\/+$/, ""));
    const hostname = window.location.hostname;
    const isLocalHost =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";
    const isPrivateIpv4 =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    if (!isLocalHost && !isPrivateIpv4) {
      return runtimeOrigin;
    }
  }

  return PUBLIC_URL_PLACEHOLDER;
}

export function buildCotizacionApprovalUrl(token: string, origin = resolveAppOrigin()) {
  if (!token) {
    return null;
  }

  const path = buildCotizacionApprovalPath(token);

  if (!origin) {
    return path;
  }

  return `${origin}${path}`;
}
