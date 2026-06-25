/** @jest-environment jsdom */

import {
  base64UrlToUint8Array,
  subscribeToPushNotifications,
} from "../web-push";
import { PWA_SERVICE_WORKER_VERSION } from "../pwa-sw-version";
import { resolvePushServiceWorkerRegistration } from "@/utils/pwa-service-worker";

jest.mock("@/utils/pwa-service-worker", () => ({
  resolvePushServiceWorkerRegistration: jest.fn(),
}));

describe("web push utils", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    jest.clearAllMocks();
  });

  it("debe decodificar una clave base64url valida aunque tenga espacios o saltos", () => {
    const bytes = base64UrlToUint8Array("  AQIDBA \n ");

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("debe decodificar una clave envuelta en comillas", () => {
    const bytes = base64UrlToUint8Array('"AQIDBA"');

    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });

  it("debe fallar con un mensaje claro cuando la clave no es valida", () => {
    expect(() => base64UrlToUint8Array("***")).toThrow(
      "La clave publica de notificaciones no tiene un formato valido."
    );
  });

  it("debe reutilizar una suscripcion existente cuando ya existe", async () => {
    const subscription = { endpoint: "https://push.example.com/1" } as PushSubscription;
    const registration = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(subscription),
        subscribe: jest.fn(),
      },
    } as unknown as ServiceWorkerRegistration;

    (resolvePushServiceWorkerRegistration as jest.Mock).mockResolvedValue(registration);

    const resolved = await subscribeToPushNotifications("AQIDBA");

    expect(resolved).toBe(subscription);
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("debe renovar una suscripcion existente cuando pertenece a otra clave publica", async () => {
    const oldSubscription = {
      endpoint: "https://push.example.com/old",
      options: {
        applicationServerKey: new Uint8Array([9, 9, 9]).buffer,
      },
      unsubscribe: jest.fn().mockResolvedValue(true),
    } as unknown as PushSubscription;
    const newSubscription = {
      endpoint: "https://push.example.com/new",
    } as PushSubscription;
    const registration = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(oldSubscription),
        subscribe: jest.fn().mockResolvedValue(newSubscription),
      },
    } as unknown as ServiceWorkerRegistration;

    (resolvePushServiceWorkerRegistration as jest.Mock).mockResolvedValue(registration);

    const resolved = await subscribeToPushNotifications("AQIDBA");

    expect(resolved).toBe(newSubscription);
    expect(oldSubscription.unsubscribe).toHaveBeenCalled();
    expect(registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    });
  });

  it("debe recrear el service worker y reintentar cuando chromium devuelve push service error", async () => {
    const retriedSubscription = {
      endpoint: "https://push.example.com/retry",
    } as PushSubscription;
    const staleRegistration = {
      unregister: jest.fn().mockResolvedValue(true),
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest
          .fn()
          .mockRejectedValueOnce(new Error("Registration failed - push service error")),
      },
    } as unknown as ServiceWorkerRegistration;
    const freshRegistration = {
      pushManager: {
        subscribe: jest.fn().mockResolvedValue(retriedSubscription),
      },
    } as unknown as ServiceWorkerRegistration;

    (resolvePushServiceWorkerRegistration as jest.Mock)
      .mockResolvedValueOnce(staleRegistration)
      .mockResolvedValueOnce(freshRegistration);

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistrations: jest.fn().mockResolvedValue([staleRegistration]),
          register: jest.fn().mockResolvedValue(freshRegistration),
        },
      },
    });

    const resolved = await subscribeToPushNotifications("AQIDBA");

    expect(resolved).toBe(retriedSubscription);
    expect(staleRegistration.unregister).toHaveBeenCalled();
    expect(global.navigator.serviceWorker.register).toHaveBeenCalledWith(
      `/sw.js?version=${PWA_SERVICE_WORKER_VERSION}`,
      {
        scope: "/",
        updateViaCache: "none",
      }
    );
    expect(freshRegistration.pushManager.subscribe).toHaveBeenCalled();
  });
});
