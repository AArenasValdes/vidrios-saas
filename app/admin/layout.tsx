import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

async function resolveAdminLayoutContext() {
  try {
    return await resolveVentoraAdminRouteContext();
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      if (error.status === 401) {
        const headerStore = await headers();
        const pathname =
          headerStore.get("x-pathname") ??
          headerStore.get("next-url") ??
          "/admin";
        redirect(`/login?next=${encodeURIComponent(pathname)}`);
      }

      if (error.status === 403) {
        redirect("/dashboard");
      }
    }

    throw error;
  }
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  await resolveAdminLayoutContext();

  return <AdminShell>{children}</AdminShell>;
}
