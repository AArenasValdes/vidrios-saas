import type { UserRole } from "@/features/auth/types/auth";

const DEFAULT_ALLOWED_EMAILS = ["alessandroreal2.0@gmail.com"];

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getGrowthAllowedEmails() {
  const raw =
    process.env.NEXT_PUBLIC_GROWTH_ADMIN_EMAILS ??
    process.env.GROWTH_ADMIN_EMAILS;

  if (!raw?.trim()) {
    return DEFAULT_ALLOWED_EMAILS;
  }

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function getGrowthOnlyEmails() {
  const raw =
    process.env.NEXT_PUBLIC_GROWTH_ONLY_EMAILS ??
    process.env.GROWTH_ONLY_EMAILS;

  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function canAccessGrowthPanel(input: {
  email: string | null | undefined;
  rol: UserRole | null | undefined;
}) {
  if (input.rol !== "admin") {
    return false;
  }

  return getGrowthAllowedEmails().includes(normalizeEmail(input.email));
}

export function isGrowthOnlyUser(email: string | null | undefined) {
  return getGrowthOnlyEmails().includes(normalizeEmail(email));
}
