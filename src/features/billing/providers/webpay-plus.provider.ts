import "server-only";

import type {
  CheckoutResult,
  PaymentProvider,
  PaymentVerificationResult,
  ProviderReturnResult,
} from "@/features/billing/types/payment-provider";

function unsupported(): never {
  throw new Error("webpay_plus queda como provider futuro en /api/billing.");
}

export const webpayPlusPaymentProvider: PaymentProvider = {
  code: "webpay_plus",
  createCheckout(): Promise<CheckoutResult> {
    unsupported();
  },
  verifyPayment(): Promise<PaymentVerificationResult> {
    unsupported();
  },
  handleReturnOrWebhook(): Promise<ProviderReturnResult> {
    unsupported();
  },
  getPaymentStatus(): Promise<PaymentVerificationResult> {
    unsupported();
  },
};
