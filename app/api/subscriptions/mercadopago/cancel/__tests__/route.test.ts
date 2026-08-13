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
jest.mock("@/features/subscriptions/services/mercadopago-lifecycle.service", () => ({
  cancelMercadoPagoChileSubscription: jest.fn(),
  MercadoPagoLifecycleError: class MercadoPagoLifecycleError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { cancelMercadoPagoChileSubscription } from "@/features/subscriptions/services/mercadopago-lifecycle.service";

describe("Mercado Pago cancel route", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cancela usando exclusivamente la organizacion autenticada", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "owner@ventora.cl" },
      profile: { organizationId: 7, rol: "admin" },
    });
    (cancelMercadoPagoChileSubscription as jest.Mock).mockResolvedValue({
      subscriptionId: 81,
      currentPeriodEndsAt: "2027-08-01T00:00:00.000Z",
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(cancelMercadoPagoChileSubscription).toHaveBeenCalledWith({
      organizationId: 7,
    });
  });
});
