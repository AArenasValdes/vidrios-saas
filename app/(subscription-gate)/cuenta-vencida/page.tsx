import { Suspense } from "react";

import { CuentaVencidaPageContent } from "./page-content";

export default function CuentaVencidaPage() {
  return (
    <Suspense fallback={null}>
      <CuentaVencidaPageContent />
    </Suspense>
  );
}
