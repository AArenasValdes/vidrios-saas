const INVALID_SERVICE_ROLE_KEY_MESSAGE =
  "SUPABASE_SERVICE_ROLE_KEY no es una clave de servicio de Supabase. Copiala desde Dashboard → Settings → API → service_role (JWT eyJ... o sb_secret_...). Un valor de Vercel CLI cifrado (vck_...) no sirve en localhost. Reinicia pnpm run dev despues de pegarla.";

export function classifySupabaseSecret(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "empty" as const;
  }

  if (trimmed.startsWith("vck_")) {
    return "vercel_encrypted" as const;
  }

  if (trimmed.startsWith("sb_secret_")) {
    return "sb_secret" as const;
  }

  if (trimmed.startsWith("eyJ") && trimmed.split(".").length === 3) {
    return "jwt" as const;
  }

  return "unknown" as const;
}

export function isValidSupabaseServiceRoleKey(value: string | undefined | null) {
  const kind = classifySupabaseSecret(value);
  return kind === "jwt" || kind === "sb_secret";
}

export function assertValidSupabaseServiceRoleKey(value: string | undefined | null) {
  if (!isValidSupabaseServiceRoleKey(value)) {
    throw new Error(INVALID_SERVICE_ROLE_KEY_MESSAGE);
  }
}
