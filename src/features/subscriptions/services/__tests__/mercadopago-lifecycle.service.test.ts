jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  isMercadoPagoChileBillingReady: jest.fn(),
  getMercadoPagoChileConfig: jest.fn(),
}));
jest.mock(
  "@/features/subscriptions/repositories/organization-subscription.repository",
  () => ({ createOrganizationSubscriptionRepository: jest.fn() })
);
jest.mock(
  "@/features/subscriptions/providers/mercadopago/mercadopago.provider",
  () => ({ createMercadoPagoSubscriptionProvider: jest.fn() })
);

import {
  cancelMercadoPagoChileSubscription,
  MercadoPagoLifecycleError,
} from "../mercadopago-lifecycle.service";

const { isMercadoPagoChileBillingReady, getMercadoPagoChileConfig } = jest.requireMock(
  "@/features/subscriptions/config/mercadopago-cl.config"
) as { isMercadoPagoChileBillingReady: jest.Mock; getMercadoPagoChileConfig: jest.Mock };
const { createOrganizationSubscriptionRepository } = jest.requireMock(
  "@/features/subscriptions/repositories/organization-subscription.repository"
) as { createOrganizationSubscriptionRepository: jest.Mock };
const { createMercadoPagoSubscriptionProvider } = jest.requireMock(
  "@/features/subscriptions/providers/mercadopago/mercadopago.provider"
) as { createMercadoPagoSubscriptionProvider: jest.Mock };

const getOpenMercadoPagoByOrganizationId = jest.fn();
const reconcileMercadoPagoSubscription = jest.fn();
const markMercadoPagoCancellationRequested = jest.fn();
const cancelSubscription = jest.fn();

function activeSubscription() {
  return {
    id: 81,
    organization_id: 7,
    provider: "mercadopago",
    provider_subscription_id: "preapproval-1",
    provider_plan_id: "plan-founder",
    plan_code: "founder_full",
    billing_period: "yearly",
    country_code: "CL",
    currency_code: "CLP",
    amount: 79_990,
    status: "active",
    provider_status: "authorized",
    current_period_starts_at: "2026-08-01T00:00:00.000Z",
    current_period_ends_at: "2027-08-01T00:00:00.000Z",
    next_payment_at: "2027-08-01T00:00:00.000Z",
    cancel_at_period_end: false,
    cancelled_at: null,
    external_reference: "ventora:cl:7:uuid",
    creado_en: "2026-08-01T00:00:00.000Z",
    actualizado_en: "2026-08-01T00:00:00.000Z",
    eliminado_en: null,
  };
}

describe("Mercado Pago lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMercadoPagoChileBillingReady.mockReturnValue(true);
    getMercadoPagoChileConfig.mockReturnValue({ accessToken: "access-token" });
    createOrganizationSubscriptionRepository.mockReturnValue({
      getOpenMercadoPagoByOrganizationId,
      reconcileMercadoPagoSubscription,
      markMercadoPagoCancellationRequested,
    });
    createMercadoPagoSubscriptionProvider.mockReturnValue({ cancelSubscription });
    getOpenMercadoPagoByOrganizationId.mockResolvedValue(activeSubscription());
    reconcileMercadoPagoSubscription.mockResolvedValue(81);
    markMercadoPagoCancellationRequested.mockResolvedValue(activeSubscription());
    cancelSubscription.mockResolvedValue({
      providerSubscriptionId: "preapproval-1",
      providerStatus: "cancelled",
      status: "cancelled",
    });
  });

  it("cancela la renovacion y conserva el fin del periodo pagado", async () => {
    await expect(
      cancelMercadoPagoChileSubscription({ organizationId: 7 })
    ).resolves.toEqual({
      subscriptionId: 81,
      currentPeriodEndsAt: "2027-08-01T00:00:00.000Z",
    });

    expect(cancelSubscription).toHaveBeenCalledWith("preapproval-1");
    expect(reconcileMercadoPagoSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 81,
        status: "cancelled",
        periodEndsAt: "2027-08-01T00:00:00.000Z",
      })
    );
    expect(markMercadoPagoCancellationRequested).toHaveBeenCalledWith(81);
  });

  it("no intenta llamar a Mercado Pago sin configuracion completa", async () => {
    isMercadoPagoChileBillingReady.mockReturnValue(false);

    await expect(
      cancelMercadoPagoChileSubscription({ organizationId: 7 })
    ).rejects.toEqual(
      expect.objectContaining<MercadoPagoLifecycleError>({ status: 503 })
    );

    expect(getOpenMercadoPagoByOrganizationId).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });
});
