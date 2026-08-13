import "server-only";

import type {
  MercadoPagoAuthorizedPayment,
  MercadoPagoPayment,
  MercadoPagoPreapproval,
  MercadoPagoPreapprovalPlan,
} from "./mercadopago.types";

const API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 12_000;

export class MercadoPagoApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.status = status;
  }
}

export function createMercadoPagoClient(accessToken: string) {
  async function request<T>(
    path: string,
    options: { method?: "GET" | "POST" | "PUT"; body?: unknown; idempotencyKey?: string } = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey
          ? { "X-Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new MercadoPagoApiError(
        response.status,
        `Mercado Pago respondio con estado ${response.status}.`
      );
    }

    return (await response.json()) as T;
  }

  return {
    getPreapprovalPlan(planId: string) {
      return request<MercadoPagoPreapprovalPlan>(
        `/preapproval_plan/${encodeURIComponent(planId)}`
      );
    },
    createPreapproval(input: {
      providerPlanId: string;
      payerEmail: string;
      externalReference: string;
      returnUrl: string;
      notificationUrl: string;
      reason: string;
      idempotencyKey: string;
    }) {
      return request<MercadoPagoPreapproval>("/preapproval", {
        method: "POST",
        idempotencyKey: input.idempotencyKey,
        body: {
          preapproval_plan_id: input.providerPlanId,
          payer_email: input.payerEmail,
          external_reference: input.externalReference,
          back_url: input.returnUrl,
          notification_url: input.notificationUrl,
          reason: input.reason,
        },
      });
    },
    getPreapproval(id: string) {
      return request<MercadoPagoPreapproval>(
        `/preapproval/${encodeURIComponent(id)}`
      );
    },
    updatePreapproval(id: string, status: "authorized" | "cancelled") {
      return request<MercadoPagoPreapproval>(
        `/preapproval/${encodeURIComponent(id)}`,
        { method: "PUT", body: { status } }
      );
    },
    getAuthorizedPayment(id: string) {
      return request<MercadoPagoAuthorizedPayment>(
        `/authorized_payments/${encodeURIComponent(id)}`
      );
    },
    getPayment(id: string) {
      return request<MercadoPagoPayment>(`/v1/payments/${encodeURIComponent(id)}`);
    },
  };
}

export type MercadoPagoClient = ReturnType<typeof createMercadoPagoClient>;
