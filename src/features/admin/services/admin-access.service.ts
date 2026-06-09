import type { UserRole } from "@/features/auth/types/auth";

const DEFAULT_FOUNDER_EMAILS = ["alessandroreal2.0@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getFounderAdminEmails() {
  const raw =
    process.env.VENTORA_FOUNDER_ADMIN_EMAILS ??
    process.env.VENTORA_ADMIN_EMAILS ??
    process.env.GROWTH_ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_GROWTH_ADMIN_EMAILS;

  if (!raw?.trim()) {
    return DEFAULT_FOUNDER_EMAILS;
  }

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function isFounderAdminEmail(email: string | null | undefined) {
  return getFounderAdminEmails().includes(normalizeEmail(email));
}

export function canAccessFounderAdminPanel(input: {
  email: string | null | undefined;
  rol: UserRole | null | undefined;
}) {
  if (input.rol !== "admin") {
    return false;
  }

  return isFounderAdminEmail(input.email);
}

// Compat legacy. Mantiene imports existentes mientras migramos /admin.
export function getVentoraAdminEmails() {
  return getFounderAdminEmails();
}

export function canAccessVentoraAdminPanel(input: {
  email: string | null | undefined;
  rol: UserRole | null | undefined;
}) {
  return canAccessFounderAdminPanel(input);
}
