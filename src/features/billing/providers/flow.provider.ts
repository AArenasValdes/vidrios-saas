import "server-only";

import { createHmac, randomUUID } from "node:crypto";

import { createPagoSuscripcionRepository } from "@/features/subscriptions/repositories/pago-suscripcion.repository";
import type {
  PagoSuscripcionRow,
  PaymentStatus,
} from "@/features/subscriptions/types/pago-suscripcion";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  PaymentVerificationResult,
  ProviderReturnInput,
  ProviderReturnResult,
} from "@/features/billing/types/payment-provider";
import {
  activateOrganizationSubscriptionFromPayment,
  assertOrganizationCanStartCheckout,
  BILLING_FAILURE_REDIRECT,
  BILLING_PENDING_REDIRECT,
  BILLING_SUCCESS_REDIRECT,
  buildBillingPeriod,
} from "@/features/billing/services/billing-subscription.service";

const FLOW_TOKEN_PATTERN = /^[A-Za-z0-9._-]{6,160}$/;
const FLOW_ENVIRONMENTS = ["sandbox", "production"] as const;
const FLOW_RETURN_PATH = "/api/billing/flow/confirmar";

type FlowEnvironment = (typeof FLOW_ENVIRONMENTS)[number];

type FlowCreateResponse = {
  url?: string;
  token?: string;
  flowOrder?: number;
};

type FlowStatusResponse = {
  flowOrder?: number;
  commerceOrder?: string;
  requestDate?: string;
  status?: number;
  subject?: string;
  currency?: string;
  amount?: number;
  payer?: string;
  optional?: unknown;
  paymentData?: {
    date?: string;
    amount?: number;
    currency?: string;
    media?: string;
  } | null;
};

type FlowParams = Record<string, string | number>;

function getFlowEnvironment(): FlowEnvironment {
  const env = process.env.FLOW_ENVIRONMENT?.trim() ?? "sandbox";

  if (!FLOW_ENVIRONMENTS.includes(env as FlowEnvironment)) {
    throw new Error("FLOW_ENVIRONMENT debe ser sandbox o production.");
  }

  return env as FlowEnvironment;
}

function getFlowApiBaseUrl(): string {
  return getFlowEnvironment() === "production"
    ? "https://www.flow.cl/api"
    : "https://sandbox.flow.cl/api";
}

function getFlowApiKey(): string {
  const apiKey = process.env.FLOW_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Falta FLOW_API_KEY para crear pagos Flow.");
  }

  return apiKey;
}

function getFlowSecretKey(): string {
  const secretKey = process.env.FLOW_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("Falta FLOW_SECRET_KEY para crear pagos Flow.");
  }

  return secretKey;
}

function getPublicUrl(): URL {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
  const parsedUrl = new URL(appUrl);

  if (getFlowEnvironment() === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_APP_URL debe usar HTTPS en produccion.");
  }

  return parsedUrl;
}

function buildBillingCallbackUrl(source: "confirmation" | "return"): string {
  const url = getPublicUrl();
  url.pathname = FLOW_RETURN_PATH;
  url.search = "";
  url.hash = "";
  url.searchParams.set("source", source);
  return url.toString();
}

export function buildFlowSignature(
  params: FlowParams,
  secretKey: string
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}${String(params[key])}`)
    .join("");

  return createHmac("sha256", secretKey).update(toSign).digest("hex");
}

function buildSignedParams(params: FlowParams): URLSearchParams {
  const signed = {
    ...params,
    s: buildFlowSignature(params, getFlowSecretKey()),
  };
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(signed)) {
    body.set(key, String(value));
  }

  return body;
}

export function redactFlowSensitiveText(
  value: string,
  secrets: Array<string | null | undefined> = []
) {
  let redacted = value
    .replace(/([?&](?:apiKey|token|s)=)[^&\s]+/giu, "$1[REDACTED]")
    .replace(/("(?:apiKey|token|s)"\s*:\s*")[^"]+/giu, "$1[REDACTED]");

  for (const secret of secrets) {
    const normalized = secret?.trim();
    if (normalized) {
      redacted = redacted.replaceAll(normalized, "[REDACTED]");
    }
  }

  return redacted.slice(0, 500);
}

export function buildFlowCommerceOrder(
  organizationId: number,
  timestamp = Date.now(),
  entropy = randomUUID()
): string {
  const orgSegment = organizationId
    .toString(36)
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");
  const timeSegment = timestamp.toString(36).toUpperCase().slice(-8);
  const randomSegment = entropy.replaceAll("-", "").toUpperCase().slice(0, 10);

  return `VF${orgSegment}${timeSegment}${randomSegment}`.slice(0, 26);
}

function buildCheckoutUrl(data: FlowCreateResponse): string {
  if (!data.url || !data.token || !FLOW_TOKEN_PATTERN.test(data.token)) {
    throw new Error("Respuesta invalida al crear orden Flow.");
  }

  const checkoutUrl = new URL(data.url);

  if (checkoutUrl.protocol !== "https:") {
    throw new Error("Flow retorno una URL de checkout no segura.");
  }

  checkoutUrl.searchParams.set("token", data.token);
  return checkoutUrl.toString();
}

function parseFlowPaidAt(value: string | null | undefined): Date {
  if (!value) {
    return new Date();
  }

  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function mapFlowStatus(status: number | undefined): PaymentStatus {
  if (status === 2) return "aprobado";
  if (status === 1) return "pendiente";
  if (status === 4) return "cancelado";
  return "fallido";
}

function redirectForStatus(status: PaymentStatus): string {
  if (status === "aprobado") return BILLING_SUCCESS_REDIRECT;
  if (status === "pendiente") return BILLING_PENDING_REDIRECT;
  return BILLING_FAILURE_REDIRECT;
}

function validateFlowStatus(
  payment: PagoSuscripcionRow,
  flowStatus: FlowStatusResponse
): string[] {
  const errors: string[] = [];

  if (flowStatus.commerceOrder !== payment.buy_order) {
    errors.push("commerce_order_mismatch");
  }

  if (Number(flowStatus.amount) !== payment.amount_clp) {
    errors.push("amount_mismatch");
  }

  if (flowStatus.currency && flowStatus.currency !== payment.currency) {
    errors.push("currency_mismatch");
  }

  return errors;
}

async function requestFlowStatus(
  token: string
): Promise<FlowStatusResponse> {
  if (!FLOW_TOKEN_PATTERN.test(token)) {
    throw new Error("Token Flow invalido.");
  }

  const params: FlowParams = {
    apiKey: getFlowApiKey(),
    token,
  };
  const query = buildSignedParams(params);
  const statusUrl = new URL(`${getFlowApiBaseUrl()}/payment/getStatus`);
  statusUrl.search = query.toString();
  const response = await fetch(statusUrl, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Error Flow status (${response.status}): ${redactFlowSensitiveText(
        errorBody,
        [token, getFlowApiKey(), query.get("s")]
      )}`
    );
  }

  return (await response.json()) as FlowStatusResponse;
}

export function createFlowPaymentProvider(): PaymentProvider {
  const pagoRepo = createPagoSuscripcionRepository();

  async function verifyPayment(
    token: string
  ): Promise<PaymentVerificationResult> {
    const flowStatus = await requestFlowStatus(token);
    const status = mapFlowStatus(flowStatus.status);

    return {
      status,
      providerStatus:
        typeof flowStatus.status === "number"
          ? String(flowStatus.status)
          : "UNKNOWN",
      rawResponse: flowStatus,
      providerOrderId: flowStatus.flowOrder
        ? String(flowStatus.flowOrder)
        : null,
      paidAt:
        status === "aprobado"
          ? parseFlowPaidAt(flowStatus.paymentData?.date).toISOString()
          : null,
    };
  }

  return {
    code: "flow",

    async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
      await assertOrganizationCanStartCheckout(input.organizationId);

      const buyOrder = buildFlowCommerceOrder(input.organizationId);
      const payment = await pagoRepo.create({
        organization_id: input.organizationId,
        plan_code: input.plan.subscriptionPlanCode,
        billing_period: input.plan.billingPeriod,
        amount_clp: input.plan.amountClp,
        buy_order: buyOrder,
        payment_provider: "flow",
      });

      const params: FlowParams = {
        apiKey: getFlowApiKey(),
        commerceOrder: buyOrder,
        subject: `Ventora ${input.plan.label}`,
        currency: "CLP",
        amount: input.plan.amountClp,
        email: input.userEmail,
        urlConfirmation: buildBillingCallbackUrl("confirmation"),
        urlReturn: buildBillingCallbackUrl("return"),
        optional: JSON.stringify({
          organizationId: input.organizationId,
          planCode: input.plan.code,
        }),
      };
      const configuredPaymentMethod = process.env.FLOW_PAYMENT_METHOD?.trim();

      if (configuredPaymentMethod) {
        params.paymentMethod = configuredPaymentMethod;
      }

      try {
        const response = await fetch(`${getFlowApiBaseUrl()}/payment/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: buildSignedParams(params),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Error Flow create (${response.status}): ${errorBody}`);
        }

        const flowData = (await response.json()) as FlowCreateResponse;
        const checkoutUrl = buildCheckoutUrl(flowData);

        await pagoRepo.update(payment.id, {
          provider_token: flowData.token ?? null,
          provider_order_id: flowData.flowOrder
            ? String(flowData.flowOrder)
            : null,
          checkout_url: checkoutUrl,
          provider_status: "CREATED",
        });

        return {
          checkoutUrl,
          payment: {
            ...payment,
            provider_token: flowData.token ?? null,
            provider_order_id: flowData.flowOrder
              ? String(flowData.flowOrder)
              : null,
            checkout_url: checkoutUrl,
            provider_status: "CREATED",
          },
        };
      } catch (error) {
        await pagoRepo.update(payment.id, {
          status: "fallido",
          provider_status: "FLOW_CREATE_FAILED",
          provider_response: {
            message:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Error desconocido al crear orden Flow.",
          },
        });

        throw error;
      }
    },

    verifyPayment,

    async handleReturnOrWebhook(
      input: ProviderReturnInput
    ): Promise<ProviderReturnResult> {
      if (!input.token || !FLOW_TOKEN_PATTERN.test(input.token)) {
        return {
          status: "fallido",
          redirectPath: BILLING_FAILURE_REDIRECT,
        };
      }

      const existing = await pagoRepo.getByProviderToken(input.token);

      if (!existing) {
        return {
          status: "fallido",
          redirectPath: BILLING_FAILURE_REDIRECT,
        };
      }

      if (existing.status === "aprobado") {
        await activateOrganizationSubscriptionFromPayment(existing);

        return {
          status: "aprobado",
          redirectPath: BILLING_SUCCESS_REDIRECT,
        };
      }

      const flowStatus = await requestFlowStatus(input.token);
      const validationErrors = validateFlowStatus(existing, flowStatus);

      if (validationErrors.length > 0) {
        await pagoRepo.update(existing.id, {
          status: "fallido",
          provider_status: "VALIDATION_FAILED",
          provider_response: {
            ...flowStatus,
            ventora_validation_errors: validationErrors,
          },
        });

        return {
          status: "fallido",
          redirectPath: BILLING_FAILURE_REDIRECT,
        };
      }

      const nextStatus = mapFlowStatus(flowStatus.status);
      const providerOrderId = flowStatus.flowOrder
        ? String(flowStatus.flowOrder)
        : existing.provider_order_id;

      if (nextStatus === "aprobado") {
        const paidAt = parseFlowPaidAt(flowStatus.paymentData?.date);
        const period = buildBillingPeriod({
          plan: {
            code:
              existing.plan_code === "quote_only"
                ? "quote_only_annual"
                : "founder_full_annual",
            subscriptionPlanCode:
              existing.plan_code === "quote_only"
                ? "quote_only"
                : "founder_full",
            planType:
              existing.plan_code === "quote_only" ? "yearly" : "founder",
            billingPeriod:
              existing.billing_period === "monthly" ? "monthly" : "yearly",
            amountClp: existing.amount_clp,
            durationMonths:
              existing.billing_period === "monthly" ? 1 : 12,
            label:
              existing.plan_code === "quote_only"
                ? "Solo Cotizacion Anual"
                : "Founder Full Anual",
            checkoutEnabled: true,
            productLabel:
              existing.plan_code === "quote_only"
                ? "Ventora Cotización"
                : "Ventora Comercial",
            description: "Plan historico conservado para reconciliacion de pagos.",
            benefits: [],
            recommended: false,
          },
          paidAt,
        });
        const approvedPayment = {
          ...existing,
          status: "aprobado" as const,
          provider_status: String(flowStatus.status),
          provider_response: flowStatus,
          provider_order_id: providerOrderId,
          paid_at: period.paidAt,
          period_starts_at: period.periodStartsAt,
          period_ends_at: period.periodEndsAt,
        };

        await pagoRepo.update(existing.id, {
          status: "aprobado",
          provider_status: String(flowStatus.status),
          provider_response: flowStatus,
          provider_order_id: providerOrderId,
          paid_at: period.paidAt,
          period_starts_at: period.periodStartsAt,
          period_ends_at: period.periodEndsAt,
        });

        await activateOrganizationSubscriptionFromPayment(approvedPayment);

        return {
          status: "aprobado",
          redirectPath: BILLING_SUCCESS_REDIRECT,
        };
      }

      await pagoRepo.update(existing.id, {
        status: nextStatus,
        provider_status:
          typeof flowStatus.status === "number"
            ? String(flowStatus.status)
            : "UNKNOWN",
        provider_order_id: providerOrderId,
        provider_response: flowStatus,
      });

      return {
        status: nextStatus,
        redirectPath: redirectForStatus(nextStatus),
      };
    },

    getPaymentStatus(token: string): Promise<PaymentVerificationResult> {
      return verifyPayment(token);
    },
  };
}

export const flowPaymentProvider = createFlowPaymentProvider();
