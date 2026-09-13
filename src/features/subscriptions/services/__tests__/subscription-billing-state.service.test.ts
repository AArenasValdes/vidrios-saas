import {
  resolveCanonicalSubscriptionSnapshot,
} from "../subscription-billing-state.service";

const trialProfile = {
  subscription_status: "trial_active",
  trial_started_at: "2026-09-12T18:04:36.000Z",
  trial_ends_at: "2026-09-27T18:04:36.000Z",
  plan_type: "trial",
  plan_code: "trial",
  billing_period: "none",
  payment_method: "none",
  last_payment_at: null,
  founder_price_locked: false,
};

const activeQuoteSubscription = {
  id: 34,
  organization_id: 39,
  provider: "mercadopago" as const,
  provider_subscription_id: "preapproval-1",
  provider_plan_id: "plan-quote-monthly",
  plan_code: "quote_only" as const,
  billing_period: "monthly" as const,
  country_code: "CL",
  currency_code: "CLP",
  amount: 6_990,
  status: "active" as const,
  provider_status: "authorized",
  current_period_starts_at: "2026-09-13T12:00:00.000Z",
  current_period_ends_at: "2026-10-13T12:00:00.000Z",
  next_payment_at: "2026-10-13T12:00:00.000Z",
  cancel_at_period_end: false,
  cancelled_at: null,
  external_reference: "ventora:cl:39:payment-1",
  creado_en: "2026-09-13T12:00:00.000Z",
  actualizado_en: "2026-09-13T12:00:00.000Z",
  eliminado_en: null,
};

describe("canonical subscription billing state", () => {
  it("prioriza contrato activo sobre trial antiguo", () => {
    const snapshot = resolveCanonicalSubscriptionSnapshot({
      profile: trialProfile,
      recurringSubscription: activeQuoteSubscription,
      latestApprovedPayment: null,
    });

    expect(snapshot).toMatchObject({
      subscriptionStatus: "active",
      planCode: "quote_only",
      billingPeriod: "monthly",
      paymentMethod: "mercadopago",
      subscriptionStartedAt: "2026-09-13T12:00:00.000Z",
      subscriptionEndsAt: "2026-10-13T12:00:00.000Z",
    });
  });

  it("mantiene el trial mientras el checkout siga pendiente", () => {
    const snapshot = resolveCanonicalSubscriptionSnapshot({
      profile: trialProfile,
      recurringSubscription: {
        ...activeQuoteSubscription,
        status: "pending",
        provider_status: "pending",
      },
      latestApprovedPayment: null,
    });

    expect(snapshot).toMatchObject({
      subscriptionStatus: "trial_active",
      planCode: "trial",
      billingPeriod: "none",
    });
  });

  it("mantiene el trial vigente al cancelar un checkout sin pago aprobado", () => {
    const snapshot = resolveCanonicalSubscriptionSnapshot({
      profile: trialProfile,
      recurringSubscription: {
        ...activeQuoteSubscription,
        status: "cancelled",
        provider_status: "cancelled",
        current_period_starts_at: null,
        current_period_ends_at: null,
        next_payment_at: null,
        cancel_at_period_end: true,
      },
      latestApprovedPayment: null,
    });

    expect(snapshot).toMatchObject({
      subscriptionStatus: "trial_active",
      planCode: "trial",
      billingPeriod: "none",
      paymentMethod: "none",
      trialEndsAt: "2026-09-27T18:04:36.000Z",
    });
  });

  it("usa un pago aprobado ligado a la suscripcion aunque el estado recurrente siga pendiente", () => {
    const snapshot = resolveCanonicalSubscriptionSnapshot({
      profile: trialProfile,
      recurringSubscription: {
        ...activeQuoteSubscription,
        status: "pending",
        provider_status: "pending",
        current_period_starts_at: null,
        current_period_ends_at: null,
      },
      latestApprovedPayment: {
        id: 501,
        organization_id: 39,
        plan_code: "quote_only",
        billing_period: "monthly",
        amount_clp: 6_990,
        amount: 6_990,
        currency: "CLP",
        currency_code: "CLP",
        subscription_id: 34,
        provider_payment_id: "payment-1",
        payment_provider: "mercadopago",
        provider_token: null,
        provider_order_id: null,
        provider_status: "approved",
        provider_response: null,
        checkout_url: null,
        buy_order: "mp:payment-1",
        status: "aprobado",
        paid_at: "2026-09-13T12:00:00.000Z",
        period_starts_at: "2026-09-13T12:00:00.000Z",
        period_ends_at: "2026-10-13T12:00:00.000Z",
        creado_en: "2026-09-13T12:00:00.000Z",
        actualizado_en: "2026-09-13T12:00:00.000Z",
        eliminado_en: null,
      },
    });

    expect(snapshot).toMatchObject({
      subscriptionStatus: "active",
      planCode: "quote_only",
      subscriptionStartedAt: "2026-09-13T12:00:00.000Z",
      subscriptionEndsAt: "2026-10-13T12:00:00.000Z",
    });
  });
});
