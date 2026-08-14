import type { AuthOAuthProvider } from "@/features/auth/types/auth";

const ALLOWED_NEXT_PREFIXES = [
  "/dashboard",
  "/activacion",
  "/clientes",
  "/cotizaciones",
  "/solicitudes",
  "/configuracion",
  "/admin",
  "/cuenta-vencida",
  "/auth/definir-contrasena",
] as const;

const DEFAULT_NEXT_PATH = "/dashboard";

function isUnsafeNextPath(value: string) {
  if (!value.startsWith("/")) {
    return true;
  }

  if (value.startsWith("//")) {
    return true;
  }

  if (value.includes("://")) {
    return true;
  }

  if (value.includes("\\")) {
    return true;
  }

  return false;
}

function isAllowedInternalPath(pathname: string) {
  return ALLOWED_NEXT_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function sanitizeAuthNextPath(
  nextPath: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH
): string {
  const raw = nextPath?.trim() ?? "";

  if (!raw || isUnsafeNextPath(raw)) {
    return fallback;
  }

  const pathname = raw.split("?")[0]?.split("#")[0] ?? raw;

  if (!isAllowedInternalPath(pathname)) {
    return fallback;
  }

  return raw;
}

export function buildOAuthCallbackUrl(options: {
  origin: string;
  intent: "login" | "signup";
  provider: AuthOAuthProvider;
  nextPath?: string | null;
}) {
  const safeNext = sanitizeAuthNextPath(options.nextPath);
  const params = new URLSearchParams({
    intent: options.intent,
    provider: options.provider,
    next: safeNext,
  });

  return `${options.origin.replace(/\/$/u, "")}/auth/callback?${params.toString()}`;
}
