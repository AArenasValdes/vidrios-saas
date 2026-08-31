jest.mock("@/features/auth/services/auth-route-access.service", () => ({
  resolveAuthenticatedRouteContext: jest.fn(),
  AuthRouteAccessError: class AuthRouteAccessError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));
jest.mock("@/features/subscriptions/config/mercadopago-cl.config", () => ({
  isMercadoPagoChilePlanCode: (value: string) =>
    ["founder_monthly", "founder_full_annual", "quote_only_annual"].includes(value),
}));
jest.mock("@/features/subscriptions/services/mercadopago-checkout.service", () => ({
  createMercadoPagoChileCheckout: jest.fn(),
  MercadoPagoCheckoutError: class MercadoPagoCheckoutError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createMercadoPagoChileCheckout } from "@/features/subscriptions/services/mercadopago-checkout.service";

describe("Mercado Pago create route", () => {
  beforeEach(() => jest.clearAllMocks());

  it("usa organizacion y correo autenticados, no valores del cliente", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "owner@ventora.cl" },
      profile: { organizationId: 7, rol: "admin" },
    });
    (createMercadoPagoChileCheckout as jest.Mock).mockResolvedValue({
      checkout_url: "https://www.mercadopago.cl/subscriptions/checkout",
      subscription_id: 81,
    });

    const response = await POST(
      new Request("https://www.ventorap.cl/api/subscriptions/mercadopago/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: "founder_full",
          billingPeriod: "monthly",
          amount: 1,
          organizationId: 999,
          payerEmail: "attacker@example.com",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createMercadoPagoChileCheckout).toHaveBeenCalledWith({
      organizationId: 7,
      payerEmail: "owner@ventora.cl",
      planCode: "founder_full",
      billingPeriod: "monthly",
    });
  });

  it("rechaza periodo o plan invalido", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "owner@ventora.cl" },
      profile: { organizationId: 7, rol: "admin" },
    });

    const response = await POST(
      new Request("https://www.ventorap.cl/api/subscriptions/mercadopago/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: "quote_only", billingPeriod: "weekly", country: "AR" }),
      })
    );

    expect(response.status).toBe(400);
    expect(createMercadoPagoChileCheckout).not.toHaveBeenCalled();
  });
});
