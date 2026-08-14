jest.mock("@/features/billing/services/billing-subscription.service", () => ({
  assertOrganizationCanStartCheckout: jest.fn(),
}));
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(),
}));
jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  isMercadoPagoChileBillingReady: () => true,
  getMercadoPagoChileConfig: () => ({
    enabled: true,
    accessToken: "access-token",
    webhookSecret: "secret",
  }),
  getMercadoPagoChilePlan: (code: string) => ({
    code,
    subscriptionPlanCode: code === "quote_only_annual" ? "quote_only" : "founder_full",
    billingPeriod: code === "founder_monthly" ? "monthly" : "yearly",
    amountClp:
      code === "founder_monthly" ? 8_990 : code === "quote_only_annual" ? 59_990 : 79_990,
    label: code,
    providerPlanId: `plan-${code}`,
    countryCode: "CL",
    currencyCode: "CLP",
  }),
}));
jest.mock(
  "@/features/subscriptions/repositories/organization-subscription.repository",
  () => ({
    createOrganizationSubscriptionRepository: jest.fn(),
  })
);
jest.mock(
  "@/features/subscriptions/providers/mercadopago/mercadopago.provider",
  () => ({
    createMercadoPagoSubscriptionProvider: jest.fn(),
  })
);
jest.mock("@/utils/public-app-url", () => ({
  resolvePublicAppUrl: () => "https://www.ventorap.cl",
}));

import { createMercadoPagoChileCheckout } from "../mercadopago-checkout.service";

const { assertOrganizationCanStartCheckout: mockAssertOrganizationCanStartCheckout } =
  jest.requireMock("@/features/billing/services/billing-subscription.service") as {
    assertOrganizationCanStartCheckout: jest.Mock;
  };
const { createAdminClient } = jest.requireMock("@/lib/supabase/admin") as {
  createAdminClient: jest.Mock;
};
const { createOrganizationSubscriptionRepository } = jest.requireMock(
  "@/features/subscriptions/repositories/organization-subscription.repository"
) as { createOrganizationSubscriptionRepository: jest.Mock };
const { createMercadoPagoSubscriptionProvider } = jest.requireMock(
  "@/features/subscriptions/providers/mercadopago/mercadopago.provider"
) as { createMercadoPagoSubscriptionProvider: jest.Mock };
const mockCreatePending = jest.fn();
const mockAttachProviderSubscription = jest.fn();
const mockCancelPending = jest.fn();
const mockReleasePendingCheckout = jest.fn();
const mockCancelSubscription = jest.fn();
const mockGetSubscription = jest.fn();
const mockCreateSubscription = jest.fn();

function pendingSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 81,
    organization_id: 7,
    provider: "mercadopago",
    provider_subscription_id: null,
    provider_plan_id: "plan-founder_full_annual",
    plan_code: "founder_full",
    billing_period: "yearly",
    country_code: "CL",
    currency_code: "CLP",
    amount: 79_990,
    status: "pending",
    provider_status: "local_pending",
    external_reference: "ventora:cl:7:uuid",
    ...overrides,
  };
}

describe("Mercado Pago checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createOrganizationSubscriptionRepository.mockReturnValue({
      createPending: mockCreatePending,
      attachProviderSubscription: mockAttachProviderSubscription,
      cancelPending: mockCancelPending,
      releasePendingCheckout: mockReleasePendingCheckout,
    });
    createMercadoPagoSubscriptionProvider.mockReturnValue({
      createSubscription: mockCreateSubscription,
      getSubscription: mockGetSubscription,
      cancelSubscription: mockCancelSubscription,
    });
    mockAssertOrganizationCanStartCheckout.mockResolvedValue(undefined);
    mockCancelPending.mockResolvedValue(undefined);
    mockReleasePendingCheckout.mockResolvedValue(undefined);
    mockCancelSubscription.mockResolvedValue(undefined);
    mockAttachProviderSubscription.mockResolvedValue(pendingSubscription({
      provider_subscription_id: "preapproval-1",
    }));
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: { country_code: "CL" }, error: null }) }),
        }),
      }),
    });
  });

  it.each([
    ["founder_monthly", 8_990, "monthly", "founder_full"],
    ["founder_full_annual", 79_990, "yearly", "founder_full"],
    ["quote_only_annual", 59_990, "yearly", "quote_only"],
  ])("reserva %s con monto y moneda definidos en servidor", async (
    planCode,
    amount,
    billingPeriod,
    subscriptionPlanCode
  ) => {
    const local = pendingSubscription({
      provider_plan_id: `plan-${planCode}`,
      plan_code: subscriptionPlanCode,
      billing_period: billingPeriod,
      amount,
    });
    mockCreatePending.mockResolvedValue({ subscription: local, created: true });
    mockCreateSubscription.mockResolvedValue({
      providerSubscriptionId: "preapproval-1",
      providerStatus: "pending",
      status: "pending",
      checkoutUrl: "https://www.mercadopago.cl/subscriptions/checkout",
      rawResponse: {
        id: "preapproval-1",
        status: "pending",
        external_reference: local.external_reference,
        preapproval_plan_id: `plan-${planCode}`,
        init_point: "https://www.mercadopago.cl/subscriptions/checkout",
      },
    });

    await createMercadoPagoChileCheckout({
      organizationId: 7,
      payerEmail: "owner@ventora.cl",
      planCode: planCode as "founder_full_annual",
    });

    expect(mockCreatePending).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 7,
        amount,
        billingPeriod,
        planCode: subscriptionPlanCode,
      })
    );
  });

  it("reutiliza el checkout existente ante un segundo click", async () => {
    mockCreatePending.mockResolvedValue({
      created: false,
      subscription: pendingSubscription({
        provider_subscription_id: "preapproval-1",
      }),
    });
    mockGetSubscription.mockResolvedValue({
      checkoutUrl: "https://www.mercadopago.cl/subscriptions/existing",
      rawResponse: {},
    });

    const result = await createMercadoPagoChileCheckout({
      organizationId: 7,
      payerEmail: "owner@ventora.cl",
      planCode: "founder_full_annual",
    });

    expect(mockCreateSubscription).not.toHaveBeenCalled();
    expect(result.checkout_url).toContain("existing");
  });

  it("libera la reserva si Mercado Pago falla antes de persistir identidad", async () => {
    mockCreatePending.mockResolvedValue({
      created: true,
      subscription: pendingSubscription(),
    });
    mockCreateSubscription.mockRejectedValue(new Error("provider down"));

    await expect(
      createMercadoPagoChileCheckout({
        organizationId: 7,
        payerEmail: "owner@ventora.cl",
        planCode: "founder_full_annual",
      })
    ).rejects.toThrow("provider down");
    expect(mockReleasePendingCheckout).toHaveBeenCalledWith(81);
  });

  it("permite cambiar de plan mientras el checkout sigue pendiente", async () => {
    const existing = pendingSubscription({
      provider_subscription_id: "preapproval-old",
      provider_plan_id: "plan-founder_full_annual",
      billing_period: "yearly",
      amount: 79_990,
    });
    const replacement = pendingSubscription({
      id: 82,
      provider_plan_id: "plan-founder_monthly",
      plan_code: "founder_full",
      billing_period: "monthly",
      amount: 8_990,
      external_reference: "ventora:cl:7:new",
    });

    mockCreatePending
      .mockResolvedValueOnce({ created: false, subscription: existing })
      .mockResolvedValueOnce({ created: true, subscription: replacement });
    mockCreateSubscription.mockResolvedValue({
      providerSubscriptionId: "preapproval-new",
      providerStatus: "pending",
      status: "pending",
      checkoutUrl: "https://www.mercadopago.cl/subscriptions/checkout/new",
      rawResponse: {
        id: "preapproval-new",
        status: "pending",
        external_reference: replacement.external_reference,
        init_point: "https://www.mercadopago.cl/subscriptions/checkout/new",
      },
    });

    const result = await createMercadoPagoChileCheckout({
      organizationId: 7,
      payerEmail: "owner@ventora.cl",
      planCode: "founder_monthly",
    });

    expect(mockCancelSubscription).toHaveBeenCalledWith("preapproval-old");
    expect(mockReleasePendingCheckout).toHaveBeenCalledWith(existing.id);
    expect(mockCreatePending).toHaveBeenCalledTimes(2);
    expect(result.checkout_url).toContain("new");
  });

  it("bloquea un checkout Chile para una empresa de otro mercado", async () => {
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: { country_code: "PE" }, error: null }) }),
        }),
      }),
    });

    await expect(
      createMercadoPagoChileCheckout({
        organizationId: 7,
        payerEmail: "owner@ventora.pe",
        planCode: "founder_full_annual",
      })
    ).rejects.toThrow("aun no esta habilitado para el pais");
    expect(mockCreatePending).not.toHaveBeenCalled();
  });
});
