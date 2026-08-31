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
import {
  normalizeMercadoPagoExternalReference,
  resolveMercadoPagoCheckoutUrl,
} from "@/features/subscriptions/providers/mercadopago/mercadopago-reference";
import { createOrganizationSubscriptionRepository } from "@/features/subscriptions/repositories/organization-subscription.repository";
import type { OrganizationSubscriptionRow } from "@/features/subscriptions/types/organization-subscription";
import {
  buildMercadoPagoReturnUrl,
} from "@/features/subscriptions/constants/mercadopago-return";
import { resolvePublicAppUrl } from "@/utils/public-app-url";
import {
  getBillingPlanCodeForSelection,
  isBillingPlanCode,
  type BillingPeriodCode,
  type BillingProductCode,
} from "@/features/billing/types/plans";

export class MercadoPagoCheckoutError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "MercadoPagoCheckoutError";
    this.status = status;
  }
}

function checkoutUrlFromRaw(raw: unknown) {
  return resolveMercadoPagoCheckoutUrl(raw as MercadoPagoPreapproval);
}

function assertCreatedSubscriptionIdentity(input: {
  raw: Partial<MercadoPagoPreapproval>;
  expectedExternalReference: string;
  expectedProviderPlanId: string;
}) {
  const returnedReference = normalizeMercadoPagoExternalReference(
    input.raw.external_reference
  );

  if (
    returnedReference &&
    returnedReference !== input.expectedExternalReference
  ) {
    throw new Error("Mercado Pago devolvio una suscripcion con identidad invalida.");
  }

  if (
    input.raw.preapproval_plan_id &&
    input.raw.preapproval_plan_id !== input.expectedProviderPlanId
  ) {
    throw new Error("Mercado Pago devolvio una suscripcion con identidad invalida.");
  }
}

function isSameMercadoPagoPlan(
  existing: OrganizationSubscriptionRow,
  plan: ReturnType<typeof getMercadoPagoChilePlan>
) {
  return (
    existing.plan_code === plan.subscriptionPlanCode &&
    existing.billing_period === plan.billingPeriod &&
    existing.provider_plan_id === plan.providerPlanId
  );
}

async function assertOrganizationIsChile(organizationId: number) {
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

async function releasePendingMercadoPagoCheckout(input: {
  subscription: OrganizationSubscriptionRow;
  accessToken: string;
  amount: number;
  billingPeriod: "monthly" | "yearly";
  repository: ReturnType<typeof createOrganizationSubscriptionRepository>;
}) {
  if (input.subscription.status !== "pending") {
    throw new MercadoPagoCheckoutError(
      409,
      "Ya existe otra suscripcion Mercado Pago en proceso para esta cuenta."
    );
  }

  if (input.subscription.provider_subscription_id) {
    const provider = createMercadoPagoSubscriptionProvider({
      accessToken: input.accessToken,
      expectedAmount: input.amount,
      expectedCurrency: "CLP",
      billingPeriod: input.billingPeriod,
      reason: "Ventora - liberar checkout pendiente",
    });

    await provider
      .cancelSubscription(input.subscription.provider_subscription_id)
      .catch(() => undefined);
  }

  await input.repository.releasePendingCheckout(input.subscription.id);
}

async function reusePendingCheckout(input: {
  subscription: OrganizationSubscriptionRow;
  accessToken: string;
  amount: number;
  billingPeriod: "monthly" | "yearly";
  planLabel: string;
}) {
  if (!input.subscription.provider_subscription_id) {
    return null;
  }

  const provider = createMercadoPagoSubscriptionProvider({
    accessToken: input.accessToken,
    expectedAmount: input.amount,
    expectedCurrency: "CLP",
    billingPeriod: input.billingPeriod,
    reason: `Ventora - ${input.planLabel}`,
  });
  const current = await provider.getSubscription(
    input.subscription.provider_subscription_id
  );
  const checkoutUrl =
    current.checkoutUrl ?? checkoutUrlFromRaw(current.rawResponse);

  if (!checkoutUrl) {
    return null;
  }

  return {
    checkout_url: checkoutUrl,
    subscription_id: input.subscription.id,
  };
}

function buildPendingReservationInput(input: {
  organizationId: number;
  plan: ReturnType<typeof getMercadoPagoChilePlan>;
}) {
  return {
    organizationId: input.organizationId,
    providerPlanId: input.plan.providerPlanId,
    planCode: input.plan.subscriptionPlanCode,
    billingPeriod: input.plan.billingPeriod,
    amount: input.plan.amountClp,
    externalReference: `ventora:cl:${input.organizationId}:${randomUUID()}`,
  };
}

export async function createMercadoPagoChileCheckout(input: {
  organizationId: number;
  payerEmail: string;
  planCode: BillingProductCode | MercadoPagoChilePlanCode;
  billingPeriod?: BillingPeriodCode;
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
  const variantPlanCode = isBillingPlanCode(input.planCode)
    ? input.planCode
    : getBillingPlanCodeForSelection(
        input.planCode,
        input.billingPeriod ?? "yearly"
      );
  const plan = getMercadoPagoChilePlan(variantPlanCode);
  const repository = createOrganizationSubscriptionRepository();
  let reservation = await repository.createPending(
    buildPendingReservationInput({
      organizationId: input.organizationId,
      plan,
    })
  );

  if (!reservation.created) {
    const existing = reservation.subscription;

    if (isSameMercadoPagoPlan(existing, plan)) {
      const reused = await reusePendingCheckout({
        subscription: existing,
        accessToken: config.accessToken,
        amount: plan.amountClp,
        billingPeriod: plan.billingPeriod,
        planLabel: plan.label,
      });

      if (reused) {
        return reused;
      }
    }

    await releasePendingMercadoPagoCheckout({
      subscription: existing,
      accessToken: config.accessToken,
      amount: plan.amountClp,
      billingPeriod: plan.billingPeriod,
      repository,
    });

    reservation = await repository.createPending(
      buildPendingReservationInput({
        organizationId: input.organizationId,
        plan,
      })
    );

    if (!reservation.created) {
      throw new MercadoPagoCheckoutError(
        409,
        "No pudimos preparar el checkout del plan seleccionado. Intenta nuevamente."
      );
    }
  }

  const reservationSubscription = reservation.subscription;
  const provider = createMercadoPagoSubscriptionProvider({
    accessToken: config.accessToken,
    expectedAmount: plan.amountClp,
    expectedCurrency: "CLP",
    billingPeriod: plan.billingPeriod,
    reason: `Ventora - ${plan.label}`,
  });

  try {
    const publicAppUrl = resolvePublicAppUrl();
    const created = await provider.createSubscription({
      organizationId: input.organizationId,
      externalReference: reservationSubscription.external_reference,
      providerPlanId: plan.providerPlanId,
      payerEmail: input.payerEmail,
      returnUrl: buildMercadoPagoReturnUrl(publicAppUrl),
      notificationUrl: `${publicAppUrl}/api/subscriptions/mercadopago/webhook`,
    });
    const raw = created.rawResponse as Partial<MercadoPagoPreapproval>;

    assertCreatedSubscriptionIdentity({
      raw,
      expectedExternalReference: reservationSubscription.external_reference,
      expectedProviderPlanId: plan.providerPlanId,
    });

    const saved = await repository.attachProviderSubscription({
      id: reservationSubscription.id,
      providerSubscriptionId: created.providerSubscriptionId,
      providerStatus: created.providerStatus,
      status: created.status,
    });

    if (!created.checkoutUrl) {
      throw new Error("Mercado Pago no devolvio una URL de checkout.");
    }

    return { checkout_url: created.checkoutUrl, subscription_id: saved.id };
  } catch (error) {
    await repository
      .releasePendingCheckout(reservationSubscription.id)
      .catch(() => undefined);
    throw error;
  }
}
