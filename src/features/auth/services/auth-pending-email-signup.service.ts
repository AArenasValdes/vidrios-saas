import type { AuthProfile } from "@/features/auth/types/auth";

export type PendingEmailSignup = {
  nombre: string;
  empresaNombre: string;
  whatsapp: string;
  ciudadComuna: string;
  countryCode: string;
  consentimientoAceptado: boolean;
};

export function readPendingEmailSignup(value: unknown): PendingEmailSignup | null {
  if (!value || typeof value !== "object") return null;
  const pending = (value as Record<string, unknown>).ventora_signup;
  if (!pending || typeof pending !== "object" || Array.isArray(pending)) {
    return null;
  }

  const fields = pending as Record<string, unknown>;
  if (fields.version !== 1) return null;

  return {
    nombre: typeof fields.nombre === "string" ? fields.nombre : "",
    empresaNombre:
      typeof fields.empresaNombre === "string" ? fields.empresaNombre : "",
    whatsapp: typeof fields.whatsapp === "string" ? fields.whatsapp : "",
    ciudadComuna:
      typeof fields.ciudadComuna === "string" ? fields.ciudadComuna : "",
    countryCode:
      typeof fields.countryCode === "string" ? fields.countryCode : "",
    consentimientoAceptado: fields.consentimientoAceptado === true,
  };
}

export function isAuthEmailConfirmed(user: {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  return Boolean(
    user.email_confirmed_at ||
      user.confirmed_at ||
      user.user_metadata?.email_verified === true
  );
}

export async function completePendingEmailSignupFromSession(
  accessToken: string
): Promise<AuthProfile | null> {
  try {
    const response = await fetch("/api/auth/complete-pending-signup", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      organizacionId?: number | string | null;
      rol?: string | null;
    };

    if (!payload?.organizacionId) {
      return null;
    }

    return {
      organizacionId: payload.organizacionId,
      rol: payload.rol ?? null,
    };
  } catch {
    return null;
  }
}
