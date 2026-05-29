import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createPagoSuscripcionRepository } from "@/features/subscriptions/repositories/pago-suscripcion.repository";

const PRECIOS_POR_PLAN: Record<string, Record<string, number>> = {
  founder_full: { yearly: 79_990 },
  quote_only: { yearly: 59_990 },
};

function getPrecioOficial(
  planCode: string,
  billingPeriod: string
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

function getTransbankBaseUrl(): string {
  const env = process.env.TBK_ENVIRONMENT ?? "development";
  return env === "production"
    ? "https://webpay3g.transbank.cl"
    : "https://webpay3gint.transbank.cl";
}

function getTransbankHeaders(): Record<string, string> {
  return {
    "Tbk-Api-Key-Id": process.env.TBK_API_KEY_ID ?? "",
    "Tbk-Api-Key-Secret": process.env.TBK_API_KEY_SECRET ?? "",
    "Content-Type": "application/json",
  };
}

function getReturnUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/subscriptions/webpay/confirmar`;
}

export function createWebpaySuscripcionService() {
  const pagoRepo = createPagoSuscripcionRepository();

  return {
    async createTransaccion(
      organizationId: number,
      planCode: string,
      billingPeriod: string
    ): Promise<{ token: string; url: string }> {
      const amount = getPrecioOficial(planCode, billingPeriod);

      const tempId = Date.now();
      const buyOrder = `VENTORA-${tempId}-${organizationId}`;
      const returnUrl = getReturnUrl();

      const tbkUrl = `${getTransbankBaseUrl()}/rswebpaytransaction/api/webpay/v1.2/transactions`;
      const tbkRes = await fetch(tbkUrl, {
        method: "POST",
        headers: getTransbankHeaders(),
        body: JSON.stringify({
          buy_order: buyOrder,
          session_id: String(organizationId),
          amount,
          return_url: returnUrl,
        }),
      });

      if (!tbkRes.ok) {
        const errorBody = await tbkRes.text();
        throw new Error(
          `Error Transbank (${tbkRes.status}): ${errorBody}`
        );
      }

      const tbkData = (await tbkRes.json()) as {
        token: string;
        url: string;
      };

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
      const existing = await pagoRepo.getByProviderToken(tokenWs);

      if (!existing) {
        return {
          success: false,
          redirect: "/cuenta-vencida?pago_fallido=1",
        };
      }

      if (existing.status === "aprobado") {
        return {
          success: true,
          redirect: "/dashboard?pago_exitoso=1",
          planCode: existing.plan_code,
        };
      }

      const tbkUrl = `${getTransbankBaseUrl()}/rswebpaytransaction/api/webpay/v1.2/transactions/${tokenWs}`;
      const tbkRes = await fetch(tbkUrl, {
        method: "PUT",
        headers: getTransbankHeaders(),
      });

      if (!tbkRes.ok) {
        const errorBody = await tbkRes.text();
        throw new Error(
          `Error Transbank confirm (${tbkRes.status}): ${errorBody}`
        );
      }

      const tbkData = (await tbkRes.json()) as {
        status: string;
        buy_order: string;
        amount: number;
        authorization_code?: string;
        transaction_date?: string;
        vci?: string;
      };

      if (tbkData.status === "AUTHORIZED") {
        const now = new Date();
        const paidAt = now.toISOString();
        const periodEndsAt = new Date(
          now.getFullYear() + 1,
          now.getMonth(),
          now.getDate()
        ).toISOString();

        await pagoRepo.update(existing.id, {
          status: "aprobado",
          provider_status: tbkData.status,
          provider_response: tbkData,
          paid_at: paidAt,
          period_starts_at: now.toISOString(),
          period_ends_at: periodEndsAt,
        });

        const admin = createAdminClient();
        const { error: orgError } = await admin
          .from("organization_profile")
          .update({
            subscription_status: "active",
            plan_code: existing.plan_code,
            billing_period: existing.billing_period,
            payment_method: "webpay_plus",
            subscription_started_at: now.toISOString(),
            subscription_ends_at: periodEndsAt,
            last_payment_at: paidAt,
          } as never)
          .eq("organization_id", existing.organization_id);

        if (orgError) {
          throw new Error(
            `Error al activar suscripcion: ${orgError.message}`
          );
        }

        return {
          success: true,
          redirect: "/dashboard?pago_exitoso=1",
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
        redirect: "/cuenta-vencida?pago_fallido=1",
      };
    },
  };
}

export const webpaySuscripcionService = createWebpaySuscripcionService();
