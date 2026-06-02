import "server-only";

import type {
  CheckoutResult,
  PaymentProvider,
  PaymentVerificationResult,
  ProviderReturnResult,
} from "@/features/billing/types/payment-provider";

function unsupported(): never {
  throw new Error("manual_transfer no tiene checkout automatico en esta version.");
}

export const manualTransferPaymentProvider: PaymentProvider = {
  code: "manual_transfer",
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
