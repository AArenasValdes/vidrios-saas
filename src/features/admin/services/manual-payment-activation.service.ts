import "server-only";

import {
  activateOrganizationSubscriptionFromPayment,
  buildBillingPeriod,
} from "@/features/billing/services/billing-subscription.service";
import {
  BILLING_PLANS,
  type BillingPlanCode,
  isBillingPlanCode,
} from "@/features/billing/types/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";

export class ManualPaymentActivationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ManualPaymentActivationError";
  }
}

type OrganizationStatusRow = {
  id: number | string;
  eliminado_en: string | null;
};

type OrganizationTrialProfileRow = {
  organization_id: number | string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  plan_code: string | null;
  subscription_ends_at: string | null;
};

type PagoSuscripcionInsert = {
  organization_id: number;
  plan_code: string;
  billing_period: string;
  amount_clp: number;
  currency: "CLP";
  payment_provider: "manual_transfer";
  provider_status: "manual_approved";
  provider_response: {
    source: "manual_transfer";
    reference: string | null;
    activated_at: string;
  };
  buy_order: string;
  status: "aprobado";
  paid_at: string;
  period_starts_at: string;
  period_ends_at: string;
};

type InsertPagoSuscripcionTable = {
  insert(values: PagoSuscripcionInsert): {
    select(columns: string): {
      single(): Promise<{
        data: PagoSuscripcionRow | null;
        error: { message: string } | null;
      }>;
    };
  };
};

type OrganizationTrialProfileUpdate = {
  subscription_status: "trial_active" | "trial_expired";
  plan_code: "trial";
  plan_type: "trial";
  billing_period: "none";
  payment_method: "none";
  trial_ends_at: string;
  actualizado_en: string;
};

type UpdateOrganizationProfileTable = {
  update(values: OrganizationTrialProfileUpdate): {
    eq(column: "organization_id", value: number): Promise<{
      error: { message: string } | null;
    }>;
  };
};

type ConfirmPagoSuscripcionUpdate = {
  status: "aprobado";
  paid_at: string;
  period_starts_at: string;
  period_ends_at: string;
  provider_status: string;
};

type RejectPagoSuscripcionUpdate = {
  status: "fallido";
  provider_status: "manual_rejected";
};

type UpdatePagoSuscripcionTable = {
  update(values: ConfirmPagoSuscripcionUpdate | RejectPagoSuscripcionUpdate): {
    eq(column: "id", value: number): {
      select(columns: string): {
        single(): Promise<{
          data: PagoSuscripcionRow | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

type RejectPagoSuscripcionTable = {
  update(values: RejectPagoSuscripcionUpdate): {
    eq(column: "id", value: number): Promise<{
      error: { message: string } | null;
    }>;
  };
};

function buildManualBuyOrder(organizationId: number, planCode: BillingPlanCode) {
  const stamp = Date.now();
  return `manual-${organizationId}-${planCode}-${stamp}`;
}

export async function activateManualOrganizationPayment(input: {
  organizationId: number;
  planCode: BillingPlanCode;
  reference?: string | null;
  paidAt?: Date;
}) {
  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new ManualPaymentActivationError("organization_id invalido.");
  }

  if (!isBillingPlanCode(input.planCode)) {
    throw new ManualPaymentActivationError("Plan no valido.");
  }

  const plan = BILLING_PLANS[input.planCode];
  const paidAt = input.paidAt ?? new Date();
  const period = buildBillingPeriod({ plan, paidAt });
  const admin = createAdminClient();

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, eliminado_en")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (organizationError) {
    throw new ManualPaymentActivationError(
      `No pudimos validar la organizacion: ${organizationError.message}`
    );
  }

  const organizationRow = organization as OrganizationStatusRow | null;

  if (!organizationRow || organizationRow.eliminado_en) {
    throw new ManualPaymentActivationError("La organizacion no existe.");
  }

  const buyOrder = buildManualBuyOrder(input.organizationId, input.planCode);
  const providerResponse = {
    source: "manual_transfer",
    reference: input.reference?.trim() || null,
    activated_at: paidAt.toISOString(),
  } satisfies PagoSuscripcionInsert["provider_response"];

  const pagosSuscripcionTable = admin.from(
    "pagos_suscripcion"
  ) as unknown as InsertPagoSuscripcionTable;

  const { data: payment, error: paymentError } = await pagosSuscripcionTable
    .insert({
      organization_id: input.organizationId,
      plan_code: plan.subscriptionPlanCode,
      billing_period: plan.billingPeriod,
      amount_clp: plan.amountClp,
      currency: "CLP",
      payment_provider: "manual_transfer",
      provider_status: "manual_approved",
      provider_response: providerResponse,
      buy_order: buyOrder,
      status: "aprobado",
      paid_at: period.paidAt,
      period_starts_at: period.periodStartsAt,
      period_ends_at: period.periodEndsAt,
    })
    .select("*")
    .single();

  if (paymentError || !payment) {
    throw new ManualPaymentActivationError(
      `No pudimos registrar el pago: ${paymentError?.message ?? "sin respuesta"}`
    );
  }

  await activateOrganizationSubscriptionFromPayment(
    payment
  );

  return {
    paymentId: Number(payment.id),
    organizationId: input.organizationId,
    planCode: input.planCode,
    amountClp: plan.amountClp,
    periodEndsAt: period.periodEndsAt,
    buyOrder,
  };
}

export async function extendOrganizationTrial(input: {
  organizationId: number;
  extraDays?: number;
}) {
  const extraDays = input.extraDays ?? 7;

  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new ManualPaymentActivationError("organization_id invalido.");
  }

  if (!Number.isInteger(extraDays) || extraDays <= 0 || extraDays > 30) {
    throw new ManualPaymentActivationError(
      "extraDays debe estar entre 1 y 30."
    );
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("organization_profile")
    .select(
      "organization_id, subscription_status, trial_ends_at, plan_code, subscription_ends_at"
    )
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (profileError) {
    throw new ManualPaymentActivationError(
      `No pudimos leer el perfil: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new ManualPaymentActivationError("La organizacion no tiene perfil.");
  }

  const profileRow = profile as OrganizationTrialProfileRow;

  if (
    profileRow.subscription_status === "active" &&
    profileRow.subscription_ends_at &&
    new Date(profileRow.subscription_ends_at).getTime() > Date.now()
  ) {
    throw new ManualPaymentActivationError(
      "La cuenta ya tiene una suscripcion activa pagada."
    );
  }

  const currentTrialEnd = profileRow.trial_ends_at
    ? new Date(profileRow.trial_ends_at)
    : new Date();
  const base =
    currentTrialEnd.getTime() > Date.now() ? currentTrialEnd : new Date();
  const nextTrialEnd = new Date(base);
  nextTrialEnd.setUTCDate(nextTrialEnd.getUTCDate() + extraDays);

  const organizationProfileTable = admin.from(
    "organization_profile"
  ) as unknown as UpdateOrganizationProfileTable;

  const { error: updateError } = await organizationProfileTable
    .update({
      subscription_status: "trial_active",
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      trial_ends_at: nextTrialEnd.toISOString(),
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", input.organizationId);

  if (updateError) {
    throw new ManualPaymentActivationError(
      `No pudimos extender el trial: ${updateError.message}`
    );
  }

  return {
    organizationId: input.organizationId,
    trialEndsAt: nextTrialEnd.toISOString(),
    extraDays,
  };
}

export async function deactivateOrganizationTrial(input: { organizationId: number }) {
  if (!Number.isInteger(input.organizationId) || input.organizationId <= 0) {
    throw new ManualPaymentActivationError("organization_id invalido.");
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("organization_profile")
    .select(
      "organization_id, subscription_status, trial_ends_at, plan_code, subscription_ends_at, plan_type"
    )
    .eq("organization_id", input.organizationId)
    .maybeSingle();

  if (profileError) {
    throw new ManualPaymentActivationError(
      `No pudimos leer el perfil: ${profileError.message}`
    );
  }

  if (!profile) {
    throw new ManualPaymentActivationError("La organizacion no tiene perfil.");
  }

  const profileRow = profile as OrganizationTrialProfileRow & { plan_type: string | null };

  if (
    profileRow.subscription_status === "active" &&
    profileRow.subscription_ends_at &&
    new Date(profileRow.subscription_ends_at).getTime() > Date.now()
  ) {
    throw new ManualPaymentActivationError(
      "No puedes desactivar el trial de una cuenta con suscripcion activa pagada."
    );
  }

  const isTrialLike =
    profileRow.plan_type === "trial" ||
    profileRow.plan_code === "trial" ||
    profileRow.subscription_status === "trial_active" ||
    profileRow.subscription_status === "trial_expiring" ||
    profileRow.subscription_status === "trial_expired";

  if (!isTrialLike) {
    throw new ManualPaymentActivationError("Esta cuenta no tiene un trial activo para desactivar.");
  }

  const nowIso = new Date().toISOString();
  const organizationProfileTable = admin.from(
    "organization_profile"
  ) as unknown as UpdateOrganizationProfileTable;

  const { error: updateError } = await organizationProfileTable
    .update({
      subscription_status: "trial_expired",
      plan_code: "trial",
      plan_type: "trial",
      billing_period: "none",
      payment_method: "none",
      trial_ends_at: nowIso,
      actualizado_en: nowIso,
    })
    .eq("organization_id", input.organizationId);

  if (updateError) {
    throw new ManualPaymentActivationError(
      `No pudimos desactivar el trial: ${updateError.message}`
    );
  }

  return {
    organizationId: input.organizationId,
    trialEndsAt: nowIso,
    subscriptionStatus: "trial_expired" as const,
  };
}

function resolveBillingPlanCodeFromPayment(payment: PagoSuscripcionRow): BillingPlanCode | null {
  if (payment.plan_code === "founder_full" && payment.billing_period === "monthly") {
    return "founder_monthly";
  }

  if (payment.plan_code === "founder_full" && payment.billing_period === "yearly") {
    return "founder_full_annual";
  }

  if (payment.plan_code === "quote_only" && payment.billing_period === "yearly") {
    return "quote_only_annual";
  }

  return null;
}

export async function confirmPendingOrganizationPayment(paymentId: number) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new ManualPaymentActivationError("payment_id invalido.");
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("pagos_suscripcion")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !payment) {
    throw new ManualPaymentActivationError("No encontramos el pago.");
  }

  const row = payment as PagoSuscripcionRow;

  if (row.status !== "pendiente") {
    throw new ManualPaymentActivationError("Solo se confirman pagos pendientes.");
  }

  const billingPlanCode = resolveBillingPlanCodeFromPayment(row);
  if (!billingPlanCode) {
    throw new ManualPaymentActivationError("No pudimos resolver el plan del pago.");
  }

  const plan = BILLING_PLANS[billingPlanCode];
  const paidAt = new Date();
  const period = buildBillingPeriod({ plan, paidAt });

  const { data: updated, error: updateError } = await (
    admin.from("pagos_suscripcion") as unknown as UpdatePagoSuscripcionTable
  )
    .update({
      status: "aprobado",
      paid_at: period.paidAt,
      period_starts_at: period.periodStartsAt,
      period_ends_at: period.periodEndsAt,
      provider_status: row.provider_status ?? "manual_confirmed",
    })
    .eq("id", paymentId)
    .select("*")
    .single();

  if (updateError || !updated) {
    throw new ManualPaymentActivationError(
      `No pudimos confirmar el pago: ${updateError?.message ?? "sin respuesta"}`
    );
  }

  await activateOrganizationSubscriptionFromPayment(updated as PagoSuscripcionRow);

  return {
    paymentId,
    organizationId: Number(row.organization_id),
    periodEndsAt: period.periodEndsAt,
  };
}

export async function rejectOrganizationPayment(paymentId: number) {
  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new ManualPaymentActivationError("payment_id invalido.");
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("pagos_suscripcion")
    .select("id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !payment) {
    throw new ManualPaymentActivationError("No encontramos el pago.");
  }

  if ((payment as { status: string }).status === "aprobado") {
    throw new ManualPaymentActivationError("No se puede rechazar un pago ya aprobado.");
  }

  const { error: updateError } = await (
    admin.from("pagos_suscripcion") as unknown as RejectPagoSuscripcionTable
  )
    .update({
      status: "fallido",
      provider_status: "manual_rejected",
    })
    .eq("id", paymentId);

  if (updateError) {
    throw new ManualPaymentActivationError(
      `No pudimos rechazar el pago: ${updateError.message}`
    );
  }

  return { paymentId };
}
