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

jest.mock("@/features/billing/services/billing-checkout.service", () => ({
  createBillingCheckout: jest.fn(),
}));

import { POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { createBillingCheckout } from "@/features/billing/services/billing-checkout.service";

describe("/api/billing/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requiere usuario autenticado", async () => {
    const { AuthRouteAccessError } = jest.requireMock(
      "@/features/auth/services/auth-route-access.service"
    );
    (resolveAuthenticatedRouteContext as jest.Mock).mockRejectedValue(
      new AuthRouteAccessError(401, "No autorizado.")
    );

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planCode: "founder_full_annual",
          provider: "flow",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(createBillingCheckout).not.toHaveBeenCalled();
    expect(payload).toEqual({ error: "No autorizado." });
  });

  it("rechaza JSON invalido", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { organizationId: "7", rol: "admin" },
    });

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid",
      })
    );

    expect(response.status).toBe(400);
    expect(createBillingCheckout).not.toHaveBeenCalled();
  });

  it("rechaza plan no permitido", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { organizationId: "7", rol: "admin" },
    });

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planCode: "enterprise_setup",
          provider: "flow",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(createBillingCheckout).not.toHaveBeenCalled();
  });

  it("rechaza provider no soportado", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { organizationId: "7", rol: "admin" },
    });

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planCode: "founder_full_annual",
          provider: "stripe",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(createBillingCheckout).not.toHaveBeenCalled();
  });

  it("devuelve solo checkout_url en checkout exitoso", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { email: "admin@ventora.cl" },
      profile: { organizationId: "7", rol: "admin" },
    });
    (createBillingCheckout as jest.Mock).mockResolvedValue({
      checkout_url: "https://sandbox.flow.cl/app/web/pay.php?token=tok_123",
    });

    const response = await POST(
      new Request("http://localhost/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planCode: "founder_full_annual",
          provider: "flow",
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(createBillingCheckout).toHaveBeenCalledWith({
      organizationId: 7,
      userEmail: "admin@ventora.cl",
      planCode: "founder_full_annual",
      provider: "flow",
    });
    expect(payload).toEqual({
      checkout_url: "https://sandbox.flow.cl/app/web/pay.php?token=tok_123",
    });
    expect(payload.provider_response).toBeUndefined();
  });
});
