import { AdminDashboardWorkspace } from "@/features/admin/components/admin-dashboard-workspace";
import { getAdminDashboard } from "@/features/admin/services/admin-dashboard.service";

export default async function AdminHomePage() {
  // server-parallel-fetching: datos listos en SSR para evitar waterfall client auth→JS→fetch.
  const dashboard = await getAdminDashboard();

  return <AdminDashboardWorkspace initialDashboard={dashboard} />;
}
