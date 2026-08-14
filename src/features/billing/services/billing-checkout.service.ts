import "server-only";

import {
  type BillingPlanCode,
} from "@/features/billing/types/plans";
import { createMercadoPagoChileCheckout } from "@/features/subscriptions/services/mercadopago-checkout.service";
import type { PaymentProvider as PaymentProviderCode } from "@/features/subscriptions/types/pago-suscripcion";

export async function createBillingCheckout(input: {
  organizationId: number;
  userEmail: string;
  planCode: BillingPlanCode;
  provider: PaymentProviderCode;
}): Promise<{ checkout_url: string }> {
  if (input.provider !== "mercadopago") {
    throw new Error("Mercado Pago es la unica pasarela activa.");
  }

  const result = await createMercadoPagoChileCheckout({
    organizationId: input.organizationId,
    payerEmail: input.userEmail,
    planCode: input.planCode,
  });

  return { checkout_url: result.checkout_url };
}
