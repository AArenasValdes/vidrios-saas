export type PaymentStatus = "pendiente" | "aprobado" | "fallido" | "reembolsado";
export type PaymentProvider = "webpay_plus";

export type PagoSuscripcionRow = {
  id: number;
  organization_id: number;
  plan_code: string;
  billing_period: string;
  amount_clp: number;
  currency: string;
  payment_provider: PaymentProvider;
  provider_token: string | null;
  provider_status: string | null;
  provider_response: unknown;
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
  provider_token: string;
};

export type UpdatePagoInput = {
  status?: PaymentStatus;
  provider_status?: string;
  provider_response?: unknown;
  paid_at?: string;
  period_starts_at?: string;
  period_ends_at?: string;
};
