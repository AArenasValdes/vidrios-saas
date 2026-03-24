import type { UserRole } from "@/types/auth";

const DEFAULT_ALLOWED_EMAILS = ["alessandroreal2.0@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getSolicitudesAllowedEmails() {
  const raw =
    process.env.NEXT_PUBLIC_SOLICITUDES_ADMIN_EMAILS ??
    process.env.SOLICITUDES_ADMIN_EMAILS;

  if (!raw?.trim()) {
    return DEFAULT_ALLOWED_EMAILS;
  }

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function canAccessSolicitudes(input: {
  email: string | null | undefined;
  rol: UserRole | null | undefined;
}) {
  const email = normalizeEmail(input.email);

  if (input.rol !== "admin" || !email) {
    return false;
  }

  return getSolicitudesAllowedEmails().includes(email);
}
