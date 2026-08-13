import "server-only";

import { flowPaymentProvider } from "@/features/billing/providers/flow.provider";
import { manualTransferPaymentProvider } from "@/features/billing/providers/manual-transfer.provider";
import { webpayPlusPaymentProvider } from "@/features/billing/providers/webpay-plus.provider";
import type { PaymentProvider } from "@/features/billing/types/payment-provider";
import type { PaymentProvider as PaymentProviderCode } from "@/features/subscriptions/types/pago-suscripcion";

const PROVIDERS: Partial<Record<PaymentProviderCode, PaymentProvider>> = {
  flow: flowPaymentProvider,
  manual_transfer: manualTransferPaymentProvider,
  webpay_plus: webpayPlusPaymentProvider,
};

export function isPaymentProviderCode(
  value: string
): value is PaymentProviderCode {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, value);
}

export function getPaymentProvider(code: PaymentProviderCode): PaymentProvider {
  const provider = PROVIDERS[code];
  if (!provider) {
    throw new Error(`Proveedor de checkout no implementado: ${code}`);
  }
  return provider;
}
