import "server-only";

import type { PaymentProvider } from "@/features/billing/types/payment-provider";
import type { PaymentProvider as PaymentProviderCode } from "@/features/subscriptions/types/pago-suscripcion";

// El checkout operativo de Ventora vive en
// `features/subscriptions/providers/mercadopago`. Este registro pertenece al
// billing legacy y queda deliberadamente vacío para impedir que Flow, Webpay
// u otro provider antiguo vuelva a exponerse por accidente.
const PROVIDERS: Partial<Record<PaymentProviderCode, PaymentProvider>> = {};

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
