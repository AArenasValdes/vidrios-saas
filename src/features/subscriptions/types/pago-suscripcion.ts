export type PaymentStatus =
  | "pendiente"
  | "aprobado"
  | "fallido"
  | "cancelado"
  | "reembolsado";
export type PaymentProvider =
  | "mercadopago"
  | "flow"
  | "manual_transfer"
  | "manual_other"
  | "webpay_plus";

export type PagoSuscripcionRow = {
  id: number;
  organization_id: number;
  plan_code: string;
  billing_period: string;
  amount_clp: number;
  amount: number;
  currency: string;
  currency_code: string;
  subscription_id: number | null;
  provider_payment_id: string | null;
  payment_provider: PaymentProvider;
  provider_token: string | null;
  provider_order_id: string | null;
  provider_status: string | null;
  provider_response: unknown;
  checkout_url: string | null;
  buy_order: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  period_starts_at: string | null;
  period_ends_at: string | null;
  creado_en: string;
  actualizado_en: string;
  eliminado_en: string | null;
};

export type CreatePagoInput = {
  organization_id: number;
  plan_code: string;
  billing_period: string;
  amount_clp: number;
  buy_order: string;
  payment_provider?: PaymentProvider;
  provider_token?: string | null;
  provider_order_id?: string | null;
  checkout_url?: string | null;
};

export type UpdatePagoInput = {
  status?: PaymentStatus;
  provider_token?: string | null;
  provider_order_id?: string | null;
  provider_status?: string;
  provider_response?: unknown;
  checkout_url?: string | null;
  paid_at?: string;
  period_starts_at?: string;
  period_ends_at?: string;
};
