import "server-only";

import { randomUUID } from "node:crypto";

import { assertOrganizationCanStartCheckout } from "@/features/billing/services/billing-subscription.service";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMercadoPagoChileConfig,
  getMercadoPagoChilePlan,
  isMercadoPagoChileBillingReady,
  type MercadoPagoChilePlanCode,
} from "@/features/subscriptions/config/mercadopago-cl.config";
import { createMercadoPagoSubscriptionProvider } from "@/features/subscriptions/providers/mercadopago/mercadopago.provider";
import type { MercadoPagoPreapproval } from "@/features/subscriptions/providers/mercadopago/mercadopago.types";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import { resolvePublicAppUrl } from "@/utils/public-app-url";

export class MercadoPagoCheckoutError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MercadoPagoCheckoutError";
    this.status = status;
  }
}

function checkoutUrlFromRaw(raw: unknown) {
  const resource = raw as Partial<MercadoPagoPreapproval>;
  return typeof resource.init_point === "string" ? resource.init_point : null;
}

async function assertOrganizationIsChile(organizationId: number) {
  // La ruta actual sigue siendo el checkout Chile. La configuracion multi-pais
  // no debe permitir cobrar CLP a una empresa de otro mercado por accidente.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("organization_profile")
    .select("country_code")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new MercadoPagoCheckoutError(
      500,
      "No pudimos validar el mercado de tu empresa."
    );
  }

  if ((data?.country_code?.trim().toUpperCase() || "CL") !== "CL") {
    throw new MercadoPagoCheckoutError(
      503,
      "Mercado Pago aun no esta habilitado para el pais de tu empresa."
    );
  }
}

export async function createMercadoPagoChileCheckout(input: {
  organizationId: number;
  payerEmail: string;
  planCode: MercadoPagoChilePlanCode;
}): Promise<{ checkout_url: string; subscription_id: number }> {
  if (!isMercadoPagoChileBillingReady()) {
    throw new MercadoPagoCheckoutError(
      503,
      "Mercado Pago aun no esta disponible. Puedes contratar por WhatsApp."
    );
  }

  await assertOrganizationIsChile(input.organizationId);
  await assertOrganizationCanStartCheckout(input.organizationId);

  const config = getMercadoPagoChileConfig();
  const plan = getMercadoPagoChilePlan(input.planCode);
  const repository = createOrganizationSubscriptionRepository();
  const externalReference = `ventora:cl:${input.organizationId}:${randomUUID()}`;
  const reservation = await repository.createPending({
    organizationId: input.organizationId,
    providerPlanId: plan.providerPlanId,
    planCode: plan.subscriptionPlanCode,
    billingPeriod: plan.billingPeriod,
    amount: plan.amountClp,
    externalReference,
  });

  if (!reservation.created) {
    const existing = reservation.subscription;

    if (
      existing.plan_code !== plan.subscriptionPlanCode ||
      existing.billing_period !== plan.billingPeriod ||
      existing.provider_plan_id !== plan.providerPlanId
    ) {
      throw new MercadoPagoCheckoutError(
        409,
        "Ya existe otra suscripcion Mercado Pago en proceso para esta cuenta."
      );
    }

    if (!existing.provider_subscription_id) {
      throw new MercadoPagoCheckoutError(
        409,
        "La suscripcion ya se esta preparando. Espera unos segundos e intenta nuevamente."
      );
    }

    const provider = createMercadoPagoSubscriptionProvider({
      accessToken: config.accessToken,
      expectedAmount: plan.amountClp,
      expectedCurrency: "CLP",
      reason: `Ventora - ${plan.label}`,
    });
    const current = await provider.getSubscription(
      existing.provider_subscription_id
    );
    const checkoutUrl = current.checkoutUrl ?? checkoutUrlFromRaw(current.rawResponse);

    if (!checkoutUrl) {
      throw new MercadoPagoCheckoutError(
        409,
        "La suscripcion ya existe y esta esperando confirmacion de Mercado Pago."
      );
    }

    return { checkout_url: checkoutUrl, subscription_id: existing.id };
  }

  const provider = createMercadoPagoSubscriptionProvider({
    accessToken: config.accessToken,
    expectedAmount: plan.amountClp,
    expectedCurrency: "CLP",
    reason: `Ventora - ${plan.label}`,
  });

  try {
    const publicAppUrl = resolvePublicAppUrl();
    const created = await provider.createSubscription({
      organizationId: input.organizationId,
      externalReference: reservation.subscription.external_reference,
      providerPlanId: plan.providerPlanId,
      payerEmail: input.payerEmail,
      returnUrl: `${publicAppUrl}/cuenta-vencida/mercadopago/retorno`,
      notificationUrl: `${publicAppUrl}/api/subscriptions/mercadopago/webhook`,
    });
    const raw = created.rawResponse as Partial<MercadoPagoPreapproval>;

    if (
      raw.external_reference !== reservation.subscription.external_reference ||
      raw.preapproval_plan_id !== plan.providerPlanId
    ) {
      throw new Error("Mercado Pago devolvio una suscripcion con identidad invalida.");
    }

    const saved = await repository.attachProviderSubscription({
      id: reservation.subscription.id,
      providerSubscriptionId: created.providerSubscriptionId,
      providerStatus: created.providerStatus,
      status: created.status,
    });

    if (!created.checkoutUrl) {
      throw new Error("Mercado Pago no devolvio una URL de checkout.");
    }

    return { checkout_url: created.checkoutUrl, subscription_id: saved.id };
  } catch (error) {
    await repository.cancelPending(reservation.subscription.id).catch(() => undefined);
    throw error;
  }
}
