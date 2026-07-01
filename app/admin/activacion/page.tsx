import { Suspense } from "react";

import { AdminActivacionWorkspace } from "@/features/admin/components/admin-activacion-workspace";

function ActivacionLoading() {
  return <div>Cargando activación…</div>;
}

export default function AdminActivacionPage() {
  return (
    <Suspense fallback={<ActivacionLoading />}>
      <AdminActivacionWorkspace />
    </Suspense>
  );
}
