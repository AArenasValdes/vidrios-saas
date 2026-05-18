import type { CookieOptionsWithName } from "@supabase/ssr";

const SHARED_COOKIE_DOMAIN = ".ventorap.cl";

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
    domain: SHARED_COOKIE_DOMAIN,
    path: "/",
    sameSite: "lax",
    secure: true,
  };
}
