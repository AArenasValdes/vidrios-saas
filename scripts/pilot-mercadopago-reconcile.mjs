#!/usr/bin/env node

import process from "node:process";
import {
  exitWithError,
  loadPilotRuntime,
  parseArgs,
} from "./pilot-shared.mjs";

const API_BASE = "https://api.mercadopago.com";

function addMonths(isoDate, months) {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

function printHelp() {
  console.log(`
Reprocesa una suscripcion y su pago aprobado de Mercado Pago sin crear otro cobro.

Uso:
  pnpm pilot:mercadopago:reconcile --organization-id 39 --subscription-id ID --payment-id ID
  pnpm pilot:mercadopago:reconcile --organization-id 39 --subscription-id ID --payment-id ID --apply

Requisitos:
  MERCADOPAGO_CL_ACCESS_TOKEN
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SUPABASE_URL

Sin --apply solo valida y muestra lo que se repararia.
`);
}

async function getMercadoPagoResource(accessToken, path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Mercado Pago rechazo ${path} con estado ${response.status}.`);
  }

  return body;
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

function requireId(options, key) {
  const value = options[key]?.trim();
  if (!value) exitWithError(`Debes indicar --${key}.`);
  return value;
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || options.h) {
    printHelp();
    return;
  }

  const organizationId = Number(requireId(options, "organization-id"));
  const subscriptionProviderId = requireId(options, "subscription-id");
  const paymentId = requireId(options, "payment-id");

  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    exitWithError("--organization-id no es valido.");
  }

  const runtime = loadPilotRuntime(options);
  const accessToken = process.env.MERCADOPAGO_CL_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    exitWithError("Falta MERCADOPAGO_CL_ACCESS_TOKEN en el entorno.");
  }

  const { data: localSubscription, error: subscriptionError } = await runtime.supabase
    .from("suscripciones_organizacion")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "mercadopago")
    .eq("provider_subscription_id", subscriptionProviderId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (subscriptionError) throw subscriptionError;
  if (!localSubscription) {
    exitWithError("No existe una suscripcion local con esos datos.");
  }

  const [preapproval, payment] = await Promise.all([
    getMercadoPagoResource(
      accessToken,
      `/preapproval/${encodeURIComponent(subscriptionProviderId)}`
    ),
    getMercadoPagoResource(
      accessToken,
      `/v1/payments/${encodeURIComponent(paymentId)}`
    ),
  ]);

  const expectedReference = localSubscription.external_reference;
  const paymentAmount = normalizeAmount(payment?.transaction_amount);
  const localAmount = normalizeAmount(localSubscription.amount);
  const paymentCurrency = payment?.currency_id?.trim().toUpperCase();

  if (preapproval?.status !== "authorized") {
    exitWithError(`La suscripcion remota no esta autorizada: ${preapproval?.status ?? "sin estado"}.`);
  }

  if (
    preapproval?.external_reference !== expectedReference ||
    (preapproval?.preapproval_plan_id &&
      preapproval.preapproval_plan_id !== localSubscription.provider_plan_id)
  ) {
    exitWithError("La referencia o el plan remoto no coinciden con Ventora.");
  }

  if (payment?.status !== "approved") {
    exitWithError(`El pago remoto no esta aprobado: ${payment?.status ?? "sin estado"}.`);
  }

  if (paymentAmount !== localAmount || paymentCurrency !== localSubscription.currency_code) {
    exitWithError("El monto o la moneda del pago no coinciden con la suscripcion.");
  }

  const paidAt = payment.date_approved ?? payment.date_created;
  if (!paidAt) exitWithError("El pago remoto no informa fecha de aprobacion.");

  const nextPaymentAt = preapproval.next_payment_date ?? null;
  const nextPaymentDate = nextPaymentAt ? new Date(nextPaymentAt) : null;
  const paidDate = new Date(paidAt);
  const periodEndsAt =
    nextPaymentDate && nextPaymentDate.getTime() > paidDate.getTime()
      ? nextPaymentDate.toISOString()
      : addMonths(
          paidDate.toISOString(),
          localSubscription.billing_period === "yearly" ? 12 : 1
        );

  const result = {
    organizationId,
    subscriptionId: localSubscription.id,
    providerSubscriptionId: subscriptionProviderId,
    providerPaymentId: String(payment.id),
    planCode: localSubscription.plan_code,
    billingPeriod: localSubscription.billing_period,
    amount: paymentAmount,
    paidAt: paidDate.toISOString(),
    periodEndsAt,
    nextPaymentAt,
    apply: options.apply === "true",
  };

  if (options.apply !== "true") {
    console.log("[dry-run] Se reconciliaria:");
    console.table([result]);
    return;
  }

  const { error: subscriptionRpcError } = await runtime.supabase.rpc(
    "reconcile_mercadopago_subscription",
    {
      p_subscription_id: localSubscription.id,
      p_provider_subscription_id: subscriptionProviderId,
      p_provider_plan_id: localSubscription.provider_plan_id,
      p_provider_status: preapproval.status,
      p_status: "active",
      p_period_starts_at: paidDate.toISOString(),
      p_period_ends_at: periodEndsAt,
      p_next_payment_at: nextPaymentAt,
      p_cancelled_at: null,
    }
  );

  if (subscriptionRpcError) throw subscriptionRpcError;

  const { error: paymentRpcError } = await runtime.supabase.rpc(
    "reconcile_mercadopago_payment",
    {
      p_subscription_id: localSubscription.id,
      p_provider_payment_id: String(payment.id),
      p_provider_order_id: null,
      p_provider_status: payment.status,
      p_status: "aprobado",
      p_amount: paymentAmount,
      p_currency_code: paymentCurrency,
      p_paid_at: paidDate.toISOString(),
      p_period_starts_at: paidDate.toISOString(),
      p_period_ends_at: periodEndsAt,
      p_provider_response: {
        payment_id: String(payment.id),
        status: payment.status,
        status_detail: payment.status_detail ?? null,
        external_reference: payment.external_reference ?? expectedReference,
        transaction_details: payment.transaction_details ?? null,
      },
    }
  );

  if (paymentRpcError) throw paymentRpcError;

  console.log("OK: suscripcion y pago Mercado Pago reconciliados.");
  console.table([result]);
}

run().catch((error) => {
  console.error(
    "Fallo la reconciliacion Mercado Pago.",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
