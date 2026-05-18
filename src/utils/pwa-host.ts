const CANONICAL_PWA_HOST = "www.ventorap.cl";

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

export function isCanonicalPwaHost(hostname: string) {
  return isLocalHostname(hostname) || hostname === CANONICAL_PWA_HOST;
}

export function getCanonicalPwaHost() {
  return CANONICAL_PWA_HOST;
}
