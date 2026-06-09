import { AdminClientesWorkspace } from "@/features/admin/components/admin-clientes-workspace";
import { listAdminClients } from "@/features/admin/services/admin-clients.service";

export default async function AdminClientesPage() {
  const clients = await listAdminClients();

  return <AdminClientesWorkspace initialClients={clients} />;
}
