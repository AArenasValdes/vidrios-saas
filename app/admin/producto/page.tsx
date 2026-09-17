import { Suspense } from "react";

import { AdminProductoWorkspace } from "@/features/admin/components/admin-producto-workspace";

function ProductoLoading() {
  return <div>Cargando uso del producto…</div>;
}

export default function AdminProductoPage() {
  return (
    <Suspense fallback={<ProductoLoading />}>
      <AdminProductoWorkspace />
    </Suspense>
  );
}
