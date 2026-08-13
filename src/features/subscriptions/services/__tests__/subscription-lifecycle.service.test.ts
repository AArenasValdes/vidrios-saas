const activateFromApprovedPayment = jest.fn();

jest.mock(
  "@/features/subscriptions/repositories/organization-subscription.repository",
  () => ({
    createOrganizationSubscriptionRepository: () => ({
      activateFromApprovedPayment,
    }),
  })
);

import {
  activateSubscriptionFromApprovedPayment,
  mapMercadoPagoPaymentStatus,
  mapMercadoPagoSubscriptionStatus,
} from "@/features/subscriptions/services/subscription-lifecycle.service";
import type { PagoSuscripcionRow } from "@/features/subscriptions/types/pago-suscripcion";

function buildPayment(
  overrides: Partial<PagoSuscripcionRow> = {}
): PagoSuscripcionRow {
  return {
    id: 42,
    organization_id: 7,
    plan_code: "founder_full",
    billing_period: "yearly",
    amount_clp: 79_990,
    amount: 79_990,
    currency: "CLP",
    currency_code: "CLP",
    subscription_id: null,
    provider_payment_id: null,
    payment_provider: "webpay_plus",
    provider_token: null,
    provider_order_id: "wp-42",
    provider_status: "AUTHORIZED",
    provider_response: null,
    checkout_url: null,
    buy_order: "VENTORA-42",
    status: "aprobado",
    paid_at: "2026-08-12T12:00:00.000Z",
    period_starts_at: "2026-08-12T12:00:00.000Z",
    period_ends_at: "2027-08-12T12:00:00.000Z",
    creado_en: "2026-08-12T11:59:00.000Z",
    actualizado_en: "2026-08-12T12:00:00.000Z",
    eliminado_en: null,
    ...overrides,
  };
}

describe("subscription lifecycle", () => {
  beforeEach(() => {
    activateFromApprovedPayment.mockReset();
    activateFromApprovedPayment.mockResolvedValue(9);
  });

  it("delega la activacion aprobada al RPC transaccional", async () => {
    await activateSubscriptionFromApprovedPayment(buildPayment());

    expect(activateFromApprovedPayment).toHaveBeenCalledWith(42);
  });

  it("rechaza pagos no aprobados antes de escribir", async () => {
    await expect(
      activateSubscriptionFromApprovedPayment(buildPayment({ status: "pendiente" }))
    ).rejects.toThrow("debe estar aprobado");

    expect(activateFromApprovedPayment).not.toHaveBeenCalled();
  });

  it("rechaza pagos aprobados sin periodo completo", async () => {
    await expect(
      activateSubscriptionFromApprovedPayment(buildPayment({ period_ends_at: null }))
    ).rejects.toThrow("no tiene fechas suficientes");

    expect(activateFromApprovedPayment).not.toHaveBeenCalled();
  });

  it("traduce estados recurrentes de Mercado Pago al canon interno", () => {
    expect(mapMercadoPagoSubscriptionStatus("authorized")).toBe("active");
    expect(mapMercadoPagoSubscriptionStatus("paused")).toBe("paused");
    expect(mapMercadoPagoSubscriptionStatus("cancelled")).toBe("cancelled");
    expect(mapMercadoPagoSubscriptionStatus("pending")).toBe("pending");
  });

  it("traduce pagos aprobados y rechazados sin activar por query string", () => {
    expect(mapMercadoPagoPaymentStatus("approved")).toBe("aprobado");
    expect(mapMercadoPagoPaymentStatus("processed")).toBe("aprobado");
    expect(mapMercadoPagoPaymentStatus("rejected")).toBe("fallido");
    expect(mapMercadoPagoPaymentStatus("pending")).toBe("pendiente");
  });
});
