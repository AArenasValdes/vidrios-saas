import { Suspense } from "react";

import { AdminTareasWorkspace } from "@/features/admin/components/admin-tareas-workspace";

function TareasLoading() {
  return <div>Cargando tareas…</div>;
}

export default function AdminTareasPage() {
  return (
    <Suspense fallback={<TareasLoading />}>
      <AdminTareasWorkspace />
    </Suspense>
  );
}
