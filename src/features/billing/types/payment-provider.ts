import type {
  PagoSuscripcionRow,
  PaymentProvider as PaymentProviderCode,
  PaymentStatus,
} from "@/features/subscriptions/types/pago-suscripcion";
import type { BillingPlan } from "@/features/billing/types/plans";

export type CheckoutInput = {
  organizationId: number;
  userEmail: string;
  plan: BillingPlan;
};

export type CheckoutResult = {
  checkoutUrl: string;
  payment: PagoSuscripcionRow;
};

export type PaymentVerificationResult = {
  status: PaymentStatus;
  providerStatus: string;
  rawResponse: unknown;
  providerOrderId: string | null;
  paidAt: string | null;
};

export type ProviderReturnInput = {
  token: string | null;
  source: "confirmation" | "return";
};

export type ProviderReturnResult = {
  status: PaymentStatus;
  redirectPath: string;
};

export type PaymentProvider = {
  code: PaymentProviderCode;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(token: string): Promise<PaymentVerificationResult>;
  handleReturnOrWebhook(input: ProviderReturnInput): Promise<ProviderReturnResult>;
  getPaymentStatus(token: string): Promise<PaymentVerificationResult>;
};
