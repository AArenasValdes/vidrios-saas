import type { UserRole } from "@/features/auth/types/auth";
import { getFounderAdminEmails } from "@/features/admin/services/admin-access.service";

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export function getGrowthAllowedEmails() {
  return getFounderAdminEmails();
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
