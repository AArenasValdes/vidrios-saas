const FALLBACK_PUBLIC_APP_URL = "https://ventorap.cl";

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.endsWith(".local")
  );
}

function normalizeBaseUrl(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function resolvePublicAppUrl(options?: { preferLocal?: boolean }) {
  const envUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const hostname = window.location.hostname;

    if (options?.preferLocal) {
      return origin;
    }

    if (!isLocalHostname(hostname)) {
      return origin;
    }
  }

  return envUrl ?? FALLBACK_PUBLIC_APP_URL;
}
