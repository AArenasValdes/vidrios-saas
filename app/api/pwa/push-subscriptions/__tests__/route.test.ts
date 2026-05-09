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

jest.mock("@/features/notificaciones/services/web-push-notifications.service", () => ({
  webPushNotificationsService: {
    registerSubscription: jest.fn(),
    unregisterSubscription: jest.fn(),
  },
}));

import { DELETE, POST } from "../route";
import { resolveAuthenticatedRouteContext } from "@/features/auth/services/auth-route-access.service";
import { webPushNotificationsService } from "@/features/notificaciones/services/web-push-notifications.service";

describe("/api/pwa/push-subscriptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rechaza JSON invalido al registrar una suscripcion", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-1", email: "admin@ventora.cl" },
      profile: { organizationId: "org-1", rol: "admin" },
    });

    const request = new Request("http://localhost/api/pwa/push-subscriptions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{invalido",
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(webPushNotificationsService.registerSubscription).not.toHaveBeenCalled();
    expect(payload).toEqual({
      error: "Falta la suscripcion push del dispositivo.",
    });
  });

  it("propaga el error de auth al registrar una suscripcion", async () => {
    const { AuthRouteAccessError } = jest.requireMock(
      "@/features/auth/services/auth-route-access.service"
    );
    (resolveAuthenticatedRouteContext as jest.Mock).mockRejectedValue(
      new AuthRouteAccessError(401, "No autorizado.")
    );

    const request = new Request("http://localhost/api/pwa/push-subscriptions", {
      method: "POST",
      body: JSON.stringify({
        subscription: {
          endpoint: "https://push.example.com/device-1",
          keys: { p256dh: "k1", auth: "k2" },
        },
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(webPushNotificationsService.registerSubscription).not.toHaveBeenCalled();
  });

  it("desactiva la suscripcion usando organization_id y auth_user_id", async () => {
    (resolveAuthenticatedRouteContext as jest.Mock).mockResolvedValue({
      user: { id: "auth-9", email: "seller@ventora.cl" },
      profile: { organizationId: "org-9", rol: "admin" },
    });

    const request = new Request("http://localhost/api/pwa/push-subscriptions", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "https://push.example.com/device-9",
      }),
    });

    const response = await DELETE(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(webPushNotificationsService.unregisterSubscription).toHaveBeenCalledWith(
      "https://push.example.com/device-9",
      {
        organizationId: "org-9",
        authUserId: "auth-9",
      }
    );
    expect(payload).toEqual({ ok: true });
  });
});
