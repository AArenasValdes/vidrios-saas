import type { UserRole } from "@/features/auth/types/auth";

const DEFAULT_ALLOWED_EMAILS = ["alessandroreal2.0@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getVentoraAdminEmails() {
  const raw =
    process.env.VENTORA_ADMIN_EMAILS ??
    process.env.GROWTH_ADMIN_EMAILS ??
    process.env.NEXT_PUBLIC_GROWTH_ADMIN_EMAILS;

  if (!raw?.trim()) {
    return DEFAULT_ALLOWED_EMAILS;
  }

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function canAccessVentoraAdminPanel(input: {
  email: string | null | undefined;
  rol: UserRole | null | undefined;
}) {
  if (input.rol !== "admin") {
    return false;
  }

  return getVentoraAdminEmails().includes(normalizeEmail(input.email));
}
