import { Suspense } from "react";

import { CuentaVencidaPageContent } from "./page-content";
import { isMercadoPagoChileBillingReady } from "@/features/subscriptions/config/mercadopago-cl.config";

export default function CuentaVencidaPage() {
  return (
    <Suspense fallback={null}>
      <CuentaVencidaPageContent
        mercadoPagoEnabled={isMercadoPagoChileBillingReady()}
      />
    </Suspense>
  );
}
