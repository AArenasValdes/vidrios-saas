import "server-only";

import type {
  MercadoPagoAuthorizedPayment,
  MercadoPagoPayment,
  MercadoPagoPreapproval,
  MercadoPagoPreapprovalPlan,
} from "./mercadopago.types";

const API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 12_000;

function readMercadoPagoErrorMessage(body: unknown, status: number) {
  if (!body || typeof body !== "object") {
    return `Mercado Pago respondio con estado ${status}.`;
  }

  const payload = body as {
    message?: unknown;
    error?: unknown;
    cause?: Array<{ description?: unknown; code?: unknown }>;
  };

  const parts = [
    typeof payload.message === "string" ? payload.message : null,
    typeof payload.error === "string" ? payload.error : null,
    ...(payload.cause ?? [])
      .map((item) =>
        typeof item.description === "string"
          ? item.description
          : typeof item.code === "string"
            ? item.code
            : null
      )
      .filter(Boolean),
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(" ");
  }

  return `Mercado Pago respondio con estado ${status}.`;
}

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
      let errorBody: unknown = null;

      try {
        errorBody = await response.json();
      } catch {
        errorBody = null;
      }

      throw new MercadoPagoApiError(
        response.status,
        readMercadoPagoErrorMessage(errorBody, response.status)
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
          // Sin tarjeta tokenizada: el checkout hosted exige estado pending
          // para devolver init_point y que el pagador cargue el medio de pago.
          status: "pending",
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
