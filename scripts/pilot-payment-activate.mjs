#!/usr/bin/env node

import process from "node:process";
import {
  addMonths,
  exitWithError,
  loadPilotRuntime,
  parseArgs,
  resolvePilotOptions,
} from "./pilot-shared.mjs";

const PAYMENT_OPTION_MAP = {
  positionals: ["organization-id", "plan"],
  trailingPositionalKey: "reference",
  env: {
    PILOT_ORGANIZATION_ID: "organization-id",
    PILOT_PLAN: "plan",
    PILOT_REFERENCE: "reference",
  },
};

const BILLING_PLANS = {
  founder_monthly: {
    subscriptionPlanCode: "founder_full",
    planType: "monthly",
    billingPeriod: "monthly",
    amountClp: 8_990,
    durationMonths: 1,
    label: "Founder Mensual",
  },
  founder_full_annual: {
    subscriptionPlanCode: "founder_full",
    planType: "founder",
    billingPeriod: "yearly",
    amountClp: 79_990,
    durationMonths: 12,
    label: "Founder Full Anual",
  },
  quote_only_annual: {
    subscriptionPlanCode: "quote_only",
    planType: "yearly",
    billingPeriod: "yearly",
    amountClp: 59_990,
    durationMonths: 12,
    label: "Solo Cotizacion Anual",
  },
};

function printHelp() {
  console.log(`
Uso (recomendado con pnpm):
  pnpm pilot:payment:activate --organization-id 12 --plan founder_monthly --reference "transferencia junio"
  pnpm pilot:payment:activate 12 founder_monthly "transferencia junio"

Planes:
  founder_monthly      $8.990 / mes
  founder_full_annual  $79.990 / ano
  quote_only_annual    $59.990 / ano
`);
}

function buildBillingPeriod(plan, paidAt = new Date()) {
  return {
    paidAt: paidAt.toISOString(),
    periodStartsAt: paidAt.toISOString(),
    periodEndsAt: addMonths(paidAt, plan.durationMonths).toISOString(),
  };
}

function buildManualBuyOrder(organizationId, planCode) {
  return `manual-${organizationId}-${planCode}-${Date.now()}`;
}

async function activateOrganizationSubscription(supabase, payment) {
  const planType =
    payment.billing_period === "monthly"
      ? "monthly"
      : payment.plan_code === "founder_full"
        ? "founder"
        : "yearly";

  const { error } = await supabase
    .from("organization_profile")
    .update({
      subscription_status: "active",
      plan_code: payment.plan_code,
      plan_type: planType,
      billing_period: payment.billing_period,
      payment_method: "manual_transfer",
      founder_price_locked: payment.plan_code === "founder_full",
      subscription_started_at: payment.period_starts_at ?? payment.paid_at,
      subscription_ends_at: payment.period_ends_at,
      last_payment_at: payment.paid_at,
      actualizado_en: new Date().toISOString(),
    })
    .eq("organization_id", payment.organization_id);

  if (error) {
    throw error;
  }
}

async function runActivate(runtime, options) {
  const organizationId = Number(options["organization-id"]);
  const planCode = options.plan?.trim();
  const reference = options.reference?.trim() || null;
  const dryRun = options["dry-run"] === "true";

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    exitWithError("Debes indicar --organization-id valido.");
  }

  const plan = BILLING_PLANS[planCode];

  if (!plan) {
    exitWithError(
      "Debes indicar --plan founder_monthly, founder_full_annual o quote_only_annual."
    );
  }

  const { data: organization, error: organizationError } = await runtime.supabase
    .from("organizations")
    .select("id, nombre, eliminado_en")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) {
    throw organizationError;
  }

  if (!organization || organization.eliminado_en) {
    exitWithError(`La organizacion ${organizationId} no existe o esta eliminada.`);
  }

  const period = buildBillingPeriod(plan);
  const buyOrder = buildManualBuyOrder(organizationId, planCode);

  if (dryRun) {
    console.log("[dry-run] Activar pago manual:", {
      organizationId,
      empresa: organization.nombre,
      planCode,
      amountClp: plan.amountClp,
      periodEndsAt: period.periodEndsAt,
      reference,
    });
    return;
  }

  const paymentPayload = {
    organization_id: organizationId,
    plan_code: plan.subscriptionPlanCode,
    billing_period: plan.billingPeriod,
    amount_clp: plan.amountClp,
    currency: "CLP",
    payment_provider: "manual_transfer",
    provider_status: "manual_approved",
    provider_response: {
      source: "manual_transfer",
      reference,
      activated_at: period.paidAt,
    },
    buy_order: buyOrder,
    status: "aprobado",
    paid_at: period.paidAt,
    period_starts_at: period.periodStartsAt,
    period_ends_at: period.periodEndsAt,
  };

  const { data: payment, error: paymentError } = await runtime.supabase
    .from("pagos_suscripcion")
    .insert(paymentPayload)
    .select("*")
    .single();

  if (paymentError || !payment) {
    throw paymentError ?? new Error("No se registro el pago.");
  }

  await activateOrganizationSubscription(runtime.supabase, payment);

  console.log("OK: pago manual activado.");
  console.table([
    {
      organizationId,
      empresa: organization.nombre,
      plan: plan.label,
      amountClp: plan.amountClp,
      activeUntil: period.periodEndsAt,
      buyOrder,
    },
  ]);
}

async function main() {
  const argv = process.argv.slice(2);
  const options = resolvePilotOptions(argv, PAYMENT_OPTION_MAP);

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  if (!options["organization-id"] || !options.plan) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const runtime = loadPilotRuntime(options);
  await runActivate(runtime, options);
}

main().catch((error) => {
  console.error("Fallo el script de activacion de pagos.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
