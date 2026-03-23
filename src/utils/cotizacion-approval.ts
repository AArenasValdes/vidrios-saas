const APPROVAL_TOKEN_LENGTH = 32;

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
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "";

  return configured.replace(/\/+$/, "");
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
