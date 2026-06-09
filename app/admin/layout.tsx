import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { resolveVentoraAdminRouteContext } from "@/features/admin/services/admin-route-access.service";
import { AuthRouteAccessError } from "@/features/auth/services/auth-route-access.service";

async function resolveAdminLayoutContext() {
  try {
    return await resolveVentoraAdminRouteContext();
  } catch (error) {
    if (error instanceof AuthRouteAccessError) {
      if (error.status === 401 || error.status === 403) {
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
  const context = await resolveAdminLayoutContext();

  return (
    <AdminShell founderEmail={context.user.email ?? null}>{children}</AdminShell>
  );
}
