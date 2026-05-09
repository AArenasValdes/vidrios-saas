import webpush from "web-push";

jest.mock("web-push", () => ({
  __esModule: true,
  default: {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
  },
}));

jest.mock("@/repositories/web-push-subscriptions.repository", () => ({
  webPushSubscriptionsRepository: {
    upsert: jest.fn(),
    listActiveByOrganizationId: jest.fn(),
    deactivateByEndpoint: jest.fn(),
    deactivateByEndpointAndOrganizationId: jest.fn(),
    deactivateByEndpointAndAuthUserId: jest.fn(),
  },
}));

import { createWebPushNotificationsService } from "../web-push-notifications.service";

describe("web-push-notifications.service", () => {
  const repository = {
    upsert: jest.fn(),
    listActiveByOrganizationId: jest.fn(),
    deactivateByEndpoint: jest.fn(),
    deactivateByEndpointAndOrganizationId: jest.fn(),
    deactivateByEndpointAndAuthUserId: jest.fn(),
  };

  const subscription = {
    endpoint: "https://push.example.com/device-1",
    expirationTime: null,
    keys: {
      p256dh: "p256dh-key",
      auth: "auth-key",
    },
  } satisfies PushSubscriptionJSON;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY = "public-test-key";
    process.env.WEB_PUSH_PRIVATE_KEY = "private-test-key";
    process.env.WEB_PUSH_SUBJECT = "mailto:notificaciones@ventora.app";
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    delete process.env.WEB_PUSH_PRIVATE_KEY;
    delete process.env.WEB_PUSH_SUBJECT;
  });

  it("debe registrar una suscripcion valida del dispositivo", async () => {
    repository.upsert.mockResolvedValue({
      endpoint: subscription.endpoint,
      isActive: true,
    });

    const service = createWebPushNotificationsService({
      repository,
      validateMembership: async () => undefined,
    });

    await service.registerSubscription(subscription, {
      organizationId: 77,
      authUserId: "user-1",
      userEmail: "dueno@ventora.cl",
      userAgent: "Android Chrome",
    });

    expect(repository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 77,
        authUserId: "user-1",
        endpoint: subscription.endpoint,
      })
    );
  });

  it("debe enviar push cuando existe una respuesta nueva de cliente", async () => {
    repository.listActiveByOrganizationId.mockResolvedValue([
      {
        endpoint: subscription.endpoint,
        subscription,
      },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

    const service = createWebPushNotificationsService({
      repository,
      validateMembership: async () => undefined,
    });

    const result = await service.sendQuoteDecisionPush({
      organizationId: 77,
      cotizacionId: "cot-1",
      codigo: "COT-1001",
      clienteNombre: "Juan Perez",
      decision: "aprobada",
    });

    expect(webpush.setVapidDetails).toHaveBeenCalled();
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: subscription.endpoint,
      }),
      expect.stringContaining("Cliente aprobo tu cotizacion"),
      expect.objectContaining({
        urgency: "high",
        TTL: 60 * 60,
      })
    );

    const [, payload] = (webpush.sendNotification as jest.Mock).mock.calls[0];
    expect(JSON.parse(String(payload))).toEqual(
      expect.objectContaining({
        kind: "cotizacion-respuesta",
        decision: "aprobada",
      })
    );

    expect(result).toEqual({
      sent: 1,
      skipped: false,
    });
  });

  it("desactiva la suscripcion usando el auth user del duenio", async () => {
    const service = createWebPushNotificationsService({
      repository,
      validateMembership: async () => undefined,
    });

    await service.unregisterSubscription("https://push.example.com/device-1", {
      organizationId: 77,
      authUserId: "user-77",
    });

    expect(repository.deactivateByEndpointAndAuthUserId).toHaveBeenCalledWith(
      "https://push.example.com/device-1",
      77,
      "user-77"
    );
  });

});
