import { Suspense } from "react";

import { AdminPaymentsWorkspace } from "@/features/admin/components/admin-payments-workspace";

function PagosLoading() {
  return <div>Cargando pagos y planes…</div>;
}

export default function AdminPagosYPlanesPage() {
  return (
    <Suspense fallback={<PagosLoading />}>
      <AdminPaymentsWorkspace />
    </Suspense>
  );
}
