import { Suspense } from "react";

import { AdminMarketingWorkspace } from "@/features/admin/components/admin-marketing-workspace";

function MarketingLoading() {
  return <div>Cargando marketing…</div>;
}

export default function AdminMarketingPage() {
  return (
    <Suspense fallback={<MarketingLoading />}>
      <AdminMarketingWorkspace />
    </Suspense>
  );
}
