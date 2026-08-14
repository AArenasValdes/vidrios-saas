import type { CookieOptionsWithName } from "@supabase/ssr";

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
