import "server-only";

import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPagoSuscripcionRepository } from "@/features/subscriptions/repositories/pago-suscripcion.repository";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";

const WEBPAY_SUCCESS_REDIRECT = "/dashboard?pago_exitoso=1";
const WEBPAY_FAILURE_REDIRECT = "/cuenta-vencida?pago_fallido=1";
const WEBPAY_RETURN_PATH = "/api/subscriptions/webpay/confirmar";
const WEBPAY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{64}$/;
const WEBPAY_BUY_ORDER_PATTERN = /^[A-Za-z0-9]{1,26}$/;

const WEBPAY_ENVIRONMENTS = [
  "development",
  "integration",
  "production",
] as const;

const PLAN_CODES = ["founder_full", "quote_only"] as const;
const BILLING_PERIODS = ["yearly"] as const;

export type WebpayPlanCode = (typeof PLAN_CODES)[number];
export type WebpayBillingPeriod = (typeof BILLING_PERIODS)[number];

type WebpayEnvironment = (typeof WEBPAY_ENVIRONMENTS)[number];

type TransbankCreateResponse = {
  token?: string;
  url?: string;
};

type TransbankCommitResponse = {
  vci?: string;
  amount?: number;
  status?: string;
  buy_order?: string;
  session_id?: string;
  card_detail?: unknown;
  accounting_date?: string;
  transaction_date?: string;
  authorization_code?: string;
  payment_type_code?: string;
  response_code?: number;
  installments_number?: number;
};

type WebpayConfig = {
  baseUrl: string;
  headers: Record<string, string>;
  returnUrl: string;
};

const PRECIOS_POR_PLAN: Record<
  WebpayPlanCode,
  Record<WebpayBillingPeriod, number>
> = {
  founder_full: { yearly: 79_990 },
  quote_only: { yearly: 59_990 },
};

export function isWebpayPlanCode(
  value: string
): value is WebpayPlanCode {
  return PLAN_CODES.includes(value as WebpayPlanCode);
}

export function isWebpayBillingPeriod(
  value: string
): value is WebpayBillingPeriod {
  return BILLING_PERIODS.includes(value as WebpayBillingPeriod);
}

function getPrecioOficial(
  planCode: WebpayPlanCode,
  billingPeriod: WebpayBillingPeriod
): number {
  const porBilling = PRECIOS_POR_PLAN[planCode];

  if (!porBilling) {
    throw new Error(`Plan no valido: ${planCode}`);
  }

  const precio = porBilling[billingPeriod];

  if (!precio) {
    throw new Error(
      `Combinacion no valida: ${planCode} + ${billingPeriod}`
    );
  }

  return precio;
}

function parseWebpayEnvironment(): WebpayEnvironment {
  const env = process.env.TBK_ENVIRONMENT ?? "development";

  if (!WEBPAY_ENVIRONMENTS.includes(env as WebpayEnvironment)) {
    throw new Error(
      "TBK_ENVIRONMENT debe ser development, integration o production."
    );
  }

  return env as WebpayEnvironment;
}

function getTransbankBaseUrl(env: WebpayEnvironment): string {
  return env === "production"
    ? "https://webpay3g.transbank.cl"
    : "https://webpay3gint.transbank.cl";
}

function getTransbankHeaders(): Record<string, string> {
  const keyId = process.env.TBK_API_KEY_ID?.trim();
  const keySecret = process.env.TBK_API_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error(
      "Faltan credenciales Webpay: TBK_API_KEY_ID y TBK_API_KEY_SECRET."
    );
  }

  return {
    "Tbk-Api-Key-Id": keyId,
    "Tbk-Api-Key-Secret": keySecret,
    "Content-Type": "application/json",
  };
}

function getReturnUrl(env: WebpayEnvironment): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "http://localhost:3000";
  const parsedUrl = new URL(appUrl);

  if (env === "production" && parsedUrl.protocol !== "https:") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL debe usar HTTPS en producción para Webpay."
    );
  }

  parsedUrl.pathname = WEBPAY_RETURN_PATH;
  parsedUrl.search = "";
  parsedUrl.hash = "";

  return parsedUrl.toString();
}

function getWebpayConfig(): WebpayConfig {
  const env = parseWebpayEnvironment();

  return {
    baseUrl: getTransbankBaseUrl(env),
    headers: getTransbankHeaders(),
    returnUrl: getReturnUrl(env),
  };
}

export function buildWebpayBuyOrder(
  organizationId: number,
  timestamp = Date.now(),
  entropy = randomUUID()
): string {
  const orgSegment = organizationId
    .toString(36)
    .toUpperCase()
    .slice(-4)
    .padStart(4, "0");
  const timeSegment = timestamp
    .toString(36)
    .toUpperCase()
    .slice(-8);
  const randomSegment = entropy.replaceAll("-", "").toUpperCase().slice(0, 10);

  return `VT${orgSegment}${timeSegment}${randomSegment}`.slice(0, 26);
}

function isValidWebpayToken(token: string): boolean {
  return WEBPAY_TOKEN_PATTERN.test(token);
}

function isValidBuyOrder(buyOrder: string): boolean {
  return WEBPAY_BUY_ORDER_PATTERN.test(buyOrder);
}

function addOneYear(date: Date): Date {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

function isAuthorizedWebpayResponse(
  response: TransbankCommitResponse
): boolean {
  return response.status === "AUTHORIZED" && response.response_code === 0;
}

function getPlanType(planCode: string): string {
  return planCode === "founder_full" ? "founder" : "yearly";
}

function buildValidationFailureResponse(
  tbkData: TransbankCommitResponse,
  validationErrors: string[]
): Record<string, unknown> {
  return {
    ...tbkData,
    ventora_validation_errors: validationErrors,
  };
}

export function createWebpaySuscripcionService() {
  const pagoRepo = createPagoSuscripcionRepository();

  async function activateOrganizationSubscription(
    payment: PagoSuscripcionRow
  ): Promise<void> {
    if (!payment.paid_at || !payment.period_ends_at) {
      throw new Error(
        "El pago aprobado no tiene fechas suficientes para activar la suscripcion."
      );
    }

    const admin = createAdminClient();
    const { error: orgError } = await admin
      .from("organization_profile")
      .update({
        subscription_status: "active",
        plan_code: payment.plan_code,
        plan_type: getPlanType(payment.plan_code),
        billing_period: payment.billing_period,
        payment_method: "webpay_plus",
        founder_price_locked: payment.plan_code === "founder_full",
        subscription_started_at:
          payment.period_starts_at ?? payment.paid_at,
        subscription_ends_at: payment.period_ends_at,
        last_payment_at: payment.paid_at,
      } as never)
      .eq("organization_id", payment.organization_id);

    if (orgError) {
      throw new Error(
        `Error al activar suscripcion: ${orgError.message}`
      );
    }
  }

  return {
    async createTransaccion(
      organizationId: number,
      planCode: WebpayPlanCode,
      billingPeriod: WebpayBillingPeriod
    ): Promise<{ token: string; url: string }> {
      const amount = getPrecioOficial(planCode, billingPeriod);
      const buyOrder = buildWebpayBuyOrder(organizationId);
      const webpayConfig = getWebpayConfig();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const admin = createAdminClient() as any;
      const { data: activeProfile } = (await admin
        .from("organization_profile")
        .select("subscription_status, subscription_ends_at")
        .eq("organization_id", organizationId)
        .single()) as {
        data: Record<string, unknown> | null;
      };

      const subStatus = activeProfile?.subscription_status as
        | string
        | undefined;
      const subEndsAt = activeProfile?.subscription_ends_at as
        | string
        | undefined;

      if (
        subStatus === "active" &&
        subEndsAt &&
        new Date(subEndsAt).getTime() > Date.now()
      ) {
        throw new Error(
          "La cuenta ya tiene una suscripcion activa."
        );
      }

      const tbkUrl = `${webpayConfig.baseUrl}/rswebpaytransaction/api/webpay/v1.2/transactions`;
      const tbkRes = await fetch(tbkUrl, {
        method: "POST",
        headers: webpayConfig.headers,
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: String(organizationId),
          amount,
          return_url: webpayConfig.returnUrl,
        }),
      });

      if (!tbkRes.ok) {
        const errorBody = await tbkRes.text();
        throw new Error(
          `Error Transbank (${tbkRes.status}): ${errorBody}`
        );
      }

      const tbkData = (await tbkRes.json()) as TransbankCreateResponse;

      if (
        !tbkData.token ||
        !isValidWebpayToken(tbkData.token) ||
        !tbkData.url
      ) {
        throw new Error("Respuesta invalida al crear transaccion Webpay.");
      }

      const redirectUrl = new URL(tbkData.url);

      if (redirectUrl.protocol !== "https:") {
        throw new Error("Webpay retorno una URL de pago no segura.");
      }

      await pagoRepo.create({
        organization_id: organizationId,
        plan_code: planCode,
        billing_period: billingPeriod,
        amount_clp: amount,
        buy_order: buyOrder,
        provider_token: tbkData.token,
      });

      return { token: tbkData.token, url: tbkData.url };
    },

    async confirmarPago(
      tokenWs: string
    ): Promise<{
      success: boolean;
      redirect: string;
      planCode?: string;
    }> {
      if (!isValidWebpayToken(tokenWs)) {
        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      const existing = await pagoRepo.getByProviderToken(tokenWs);

      if (!existing) {
        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      if (existing.status === "aprobado") {
        await activateOrganizationSubscription(existing);

        return {
          success: true,
          redirect: WEBPAY_SUCCESS_REDIRECT,
          planCode: existing.plan_code,
        };
      }

      if (existing.status !== "pendiente") {
        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      const webpayConfig = getWebpayConfig();
      const tbkUrl = `${webpayConfig.baseUrl}/rswebpaytransaction/api/webpay/v1.2/transactions/${tokenWs}`;
      const tbkRes = await fetch(tbkUrl, {
        method: "PUT",
        headers: webpayConfig.headers,
      });

      if (!tbkRes.ok) {
        const errorBody = await tbkRes.text();
        throw new Error(
          `Error Transbank confirm (${tbkRes.status}): ${errorBody}`
        );
      }

      const tbkData = (await tbkRes.json()) as TransbankCommitResponse;
      const validationErrors: string[] = [];

      if (tbkData.buy_order !== existing.buy_order) {
        validationErrors.push("buy_order_mismatch");
      }

      if (Number(tbkData.amount) !== existing.amount_clp) {
        validationErrors.push("amount_mismatch");
      }

      if (tbkData.session_id && tbkData.session_id !== String(existing.organization_id)) {
        validationErrors.push("session_id_mismatch");
      }

      if (validationErrors.length > 0) {
        await pagoRepo.update(existing.id, {
          status: "fallido",
          provider_status: "VALIDATION_FAILED",
          provider_response: buildValidationFailureResponse(
            tbkData,
            validationErrors
          ),
        });

        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      if (isAuthorizedWebpayResponse(tbkData)) {
        const now = new Date();
        const paidAt =
          tbkData.transaction_date && !Number.isNaN(Date.parse(tbkData.transaction_date))
            ? new Date(tbkData.transaction_date).toISOString()
            : now.toISOString();
        const periodStartsAt = now.toISOString();
        const periodEndsAt = addOneYear(now).toISOString();

        await pagoRepo.update(existing.id, {
          status: "aprobado",
          provider_status: tbkData.status,
          provider_response: tbkData,
          paid_at: paidAt,
          period_starts_at: periodStartsAt,
          period_ends_at: periodEndsAt,
        });

        await activateOrganizationSubscription({
          ...existing,
          status: "aprobado",
          provider_status: tbkData.status ?? null,
          provider_response: tbkData,
          paid_at: paidAt,
          period_starts_at: periodStartsAt,
          period_ends_at: periodEndsAt,
        });

        return {
          success: true,
          redirect: WEBPAY_SUCCESS_REDIRECT,
          planCode: existing.plan_code,
        };
      }

      await pagoRepo.update(existing.id, {
        status: "fallido",
        provider_status: tbkData.status,
        provider_response: tbkData,
      });

      return {
        success: false,
        redirect: WEBPAY_FAILURE_REDIRECT,
      };
    },

    async registrarRetornoIncompleto(input: {
      token?: string | null;
      buyOrder?: string | null;
      sessionId?: string | null;
      reason: "ABORTED" | "TIMEOUT" | "WEBPAY_FORM_ERROR";
      rawParams: Record<string, string>;
    }): Promise<{ success: false; redirect: string }> {
      let existing: PagoSuscripcionRow | null = null;
      const hasValidToken = Boolean(
        input.token && isValidWebpayToken(input.token)
      );

      if (hasValidToken) {
        existing = await pagoRepo.getByProviderToken(input.token!);
      }

      if (
        !existing &&
        !hasValidToken &&
        input.buyOrder &&
        input.sessionId &&
        isValidBuyOrder(input.buyOrder)
      ) {
        existing = await pagoRepo.getByBuyOrder(input.buyOrder);
      }

      if (!existing || existing.status !== "pendiente") {
        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      const orderMatches =
        !input.buyOrder || input.buyOrder === existing.buy_order;
      const sessionMatches =
        !input.sessionId || input.sessionId === String(existing.organization_id);
      const orderFallbackIsCorrelated =
        hasValidToken ||
        (Boolean(input.buyOrder) &&
          Boolean(input.sessionId) &&
          input.buyOrder === existing.buy_order &&
          input.sessionId === String(existing.organization_id));

      if (!orderMatches || !sessionMatches || !orderFallbackIsCorrelated) {
        return {
          success: false,
          redirect: WEBPAY_FAILURE_REDIRECT,
        };
      }

      await pagoRepo.markPendingAsFailed({
        id: existing.id,
        providerStatus: input.reason,
        providerResponse: {
          reason: input.reason,
          token_received: Boolean(input.token),
          buy_order: input.buyOrder ?? null,
          session_id: input.sessionId ?? null,
          raw_params: input.rawParams,
        },
      });

      return {
        success: false,
        redirect: WEBPAY_FAILURE_REDIRECT,
      };
    },
  };
}

export const webpaySuscripcionService = createWebpaySuscripcionService();
