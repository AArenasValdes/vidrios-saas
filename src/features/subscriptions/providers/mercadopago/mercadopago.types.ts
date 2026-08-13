export type MercadoPagoPreapprovalPlan = {
  id: string;
  status?: string;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
};

export type MercadoPagoPreapproval = {
  id: string;
  status: string;
  preapproval_plan_id?: string | null;
  external_reference?: string | null;
  init_point?: string | null;
  payer_id?: number | null;
  date_created?: string | null;
  last_modified?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
};

export type MercadoPagoAuthorizedPayment = {
  id: number | string;
  preapproval_id?: string | null;
  external_reference?: string | null;
  currency_id?: string | null;
  transaction_amount?: number | null;
  debit_date?: string | null;
  status?: string | null;
  summarized?: string | null;
  payment?: {
    id?: number | string | null;
    status?: string | null;
    status_detail?: string | null;
  } | null;
};

export type MercadoPagoPayment = {
  id: number | string;
  status?: string | null;
  status_detail?: string | null;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  date_approved?: string | null;
  date_created?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type MercadoPagoWebhookTopic =
  | "subscription_preapproval"
  | "subscription_authorized_payment"
  | "payment";
