import { AdminDashboardWorkspace } from "@/features/admin/components/admin-dashboard-workspace";
import { getAdminDashboard } from "@/features/admin/services/admin-dashboard.service";

const DEFAULT_PERIOD_DAYS = 30;

export default async function AdminHomePage() {
  // server-parallel-fetching: datos listos en SSR para evitar waterfall client auth→JS→fetch.
  const dashboard = await getAdminDashboard(DEFAULT_PERIOD_DAYS);

  return (
    <AdminDashboardWorkspace
      initialDashboard={dashboard}
      initialPeriodDays={DEFAULT_PERIOD_DAYS}
    />
  );
}
