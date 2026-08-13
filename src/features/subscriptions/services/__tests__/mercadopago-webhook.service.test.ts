const getPreapproval = jest.fn();
const getAuthorizedPayment = jest.fn();
const getPayment = jest.fn();
const getByProviderSubscriptionId = jest.fn();
const getByExternalReference = jest.fn();
const reconcileMercadoPagoSubscription = jest.fn();
const reconcileMercadoPagoPayment = jest.fn();

jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  getMercadoPagoChileConfig: () => ({ accessToken: "access-token" }),
}));
jest.mock(
  "@/features/subscriptions/providers/mercadopago/mercadopago.client",
  () => ({
    createMercadoPagoClient: () => ({
      getPreapproval,
      getAuthorizedPayment,
      getPayment,
    }),
  })
);
jest.mock(
  "@/features/subscriptions/repositories/organization-subscription.repository",
  () => ({
    createOrganizationSubscriptionRepository: () => ({
      getByProviderSubscriptionId,
      getByExternalReference,
      reconcileMercadoPagoSubscription,
      reconcileMercadoPagoPayment,
    }),
  })
);

import { processMercadoPagoWebhook } from "../mercadopago-webhook.service";

const local = {
  id: 81,
  organization_id: 7,
  provider: "mercadopago",
  provider_subscription_id: "preapproval-1",
  provider_plan_id: "plan-founder-monthly",
  plan_code: "founder_full",
  billing_period: "monthly",
  country_code: "CL",
  currency_code: "CLP",
  amount: 8_990,
  status: "pending",
  provider_status: "pending",
  external_reference: "ventora:cl:7:uuid",
};

const preapproval = {
  id: "preapproval-1",
  status: "authorized",
  preapproval_plan_id: "plan-founder-monthly",
  external_reference: "ventora:cl:7:uuid",
  start_date: "2026-08-12T12:00:00.000Z",
  next_payment_date: "2026-09-12T12:00:00.000Z",
  auto_recurring: {
    transaction_amount: 8_990,
    currency_id: "CLP",
  },
};

describe("Mercado Pago webhook reconciliation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getByProviderSubscriptionId.mockResolvedValue(local);
    getByExternalReference.mockResolvedValue(local);
    getPreapproval.mockResolvedValue(preapproval);
    reconcileMercadoPagoSubscription.mockResolvedValue(81);
    reconcileMercadoPagoPayment.mockResolvedValue(901);
  });

  it("consulta el recurso real y activa una preapproval autorizada", async () => {
    const processed = await processMercadoPagoWebhook({
      topic: "subscription_preapproval",
      resourceId: "preapproval-1",
    });

    expect(processed).toBe(true);
    expect(getPreapproval).toHaveBeenCalledWith("preapproval-1");
    expect(reconcileMercadoPagoSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", providerStatus: "authorized" })
    );
  });

  it("registra pago aprobado con ID estable y periodo mensual", async () => {
    getAuthorizedPayment.mockResolvedValue({
      id: 501,
      preapproval_id: "preapproval-1",
      transaction_amount: 8_990,
      currency_id: "CLP",
      debit_date: "2026-08-12T12:00:00.000Z",
      payment: { id: 9001, status: "approved", status_detail: "accredited" },
    });

    await processMercadoPagoWebhook({
      topic: "subscription_authorized_payment",
      resourceId: "501",
    });

    expect(reconcileMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        providerPaymentId: "9001",
        providerOrderId: "501",
        status: "aprobado",
        amount: 8_990,
        currencyCode: "CLP",
        periodEndsAt: "2026-09-12T12:00:00.000Z",
      })
    );
  });

  it("un pago rechazado lleva la suscripcion a past_due", async () => {
    getAuthorizedPayment.mockResolvedValue({
      id: 502,
      preapproval_id: "preapproval-1",
      transaction_amount: 8_990,
      currency_id: "CLP",
      debit_date: "2026-08-12T12:00:00.000Z",
      payment: { id: 9002, status: "rejected", status_detail: "cc_rejected" },
    });

    await processMercadoPagoWebhook({
      topic: "subscription_authorized_payment",
      resourceId: "502",
    });

    expect(reconcileMercadoPagoSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ status: "past_due" })
    );
    expect(reconcileMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerPaymentId: "9002", status: "fallido" })
    );
  });

  it("reprocesa un webhook duplicado con la misma clave idempotente", async () => {
    getAuthorizedPayment.mockResolvedValue({
      id: 503,
      preapproval_id: "preapproval-1",
      transaction_amount: 8_990,
      currency_id: "CLP",
      debit_date: "2026-08-12T12:00:00.000Z",
      payment: { id: 9003, status: "approved" },
    });

    await processMercadoPagoWebhook({
      topic: "subscription_authorized_payment",
      resourceId: "503",
    });
    await processMercadoPagoWebhook({
      topic: "subscription_authorized_payment",
      resourceId: "503",
    });

    expect(reconcileMercadoPagoPayment).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ providerPaymentId: "9003" })
    );
    expect(reconcileMercadoPagoPayment).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ providerPaymentId: "9003" })
    );
  });

  it("registra un evento tardio sin degradar un periodo mas nuevo", async () => {
    getByProviderSubscriptionId.mockResolvedValue({
      ...local,
      status: "active",
      current_period_starts_at: "2026-09-12T12:00:00.000Z",
    });
    getAuthorizedPayment.mockResolvedValue({
      id: 504,
      preapproval_id: "preapproval-1",
      transaction_amount: 8_990,
      currency_id: "CLP",
      debit_date: "2026-08-12T12:00:00.000Z",
      payment: { id: 9004, status: "rejected" },
    });

    await processMercadoPagoWebhook({
      topic: "subscription_authorized_payment",
      resourceId: "504",
    });

    expect(reconcileMercadoPagoSubscription).not.toHaveBeenCalled();
    expect(reconcileMercadoPagoPayment).toHaveBeenCalledWith(
      expect.objectContaining({ providerPaymentId: "9004", status: "fallido" })
    );
  });

  it("no muta si el recurso real no pertenece a una suscripcion Ventora", async () => {
    getByProviderSubscriptionId.mockResolvedValue(null);
    getByExternalReference.mockResolvedValue(null);

    const processed = await processMercadoPagoWebhook({
      topic: "subscription_preapproval",
      resourceId: "unknown",
    });

    expect(processed).toBe(false);
    expect(reconcileMercadoPagoSubscription).not.toHaveBeenCalled();
  });
});
