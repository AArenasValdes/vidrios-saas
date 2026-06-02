import "server-only";

import {
  getBillingPlan,
  type BillingPlanCode,
} from "@/features/billing/types/plans";
import { getPaymentProvider } from "@/features/billing/services/payment-provider-registry";
import type { PaymentProvider as PaymentProviderCode } from "@/features/subscriptions/types/pago-suscripcion";

export async function createBillingCheckout(input: {
  organizationId: number;
  userEmail: string;
  planCode: BillingPlanCode;
  provider: PaymentProviderCode;
}): Promise<{ checkout_url: string }> {
  const plan = getBillingPlan(input.planCode);

  if (!plan.checkoutEnabled) {
    throw new Error("Este plan se activa por WhatsApp en esta version.");
  }

  const provider = getPaymentProvider(input.provider);

  if (provider.code !== "flow") {
    throw new Error("Proveedor de pago no disponible para checkout automatico.");
  }

  const result = await provider.createCheckout({
    organizationId: input.organizationId,
    userEmail: input.userEmail,
    plan,
  });

  return { checkout_url: result.checkoutUrl };
}
