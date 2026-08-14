import type { CookieOptionsWithName } from "@supabase/ssr";

export const LEGACY_SUPABASE_COOKIE_DOMAIN = ".ventorap.cl";
export const SUPABASE_COOKIE_MIGRATION_MARKER = "ventora-auth-cookie-host-only-v1";

function normalizeHostname(hostname?: string | null) {
  return hostname?.trim().toLowerCase().replace(/:\d+$/u, "") ?? "";
}

export function isSharedVentoraWebHost(hostname?: string | null) {
  const normalizedHostname = normalizeHostname(hostname);

  return (
    normalizedHostname === "ventorap.cl" ||
    normalizedHostname === "www.ventorap.cl"
  );
}

export function getSupabaseCookieOptions(
  hostname?: string | null
): CookieOptionsWithName | undefined {
  if (!isSharedVentoraWebHost(hostname)) {
    return undefined;
  }

  return {
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
