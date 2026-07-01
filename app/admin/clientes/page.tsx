import { Suspense } from "react";

import { AdminClientesWorkspace } from "@/features/admin/components/admin-clientes-workspace";

function ClientesLoading() {
  return <div>Cargando cuentas SaaS…</div>;
}

export default function AdminClientesPage() {
  return (
    <Suspense fallback={<ClientesLoading />}>
      <AdminClientesWorkspace />
    </Suspense>
  );
}
