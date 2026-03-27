/** @jest-environment jsdom */

import { resolvePushServiceWorkerRegistration } from "../pwa-service-worker";

describe("pwa-service-worker utils", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("debe reutilizar un service worker existente cuando ya esta registrado", async () => {
    const registration = {
      active: { state: "activated" },
      waiting: null,
      installing: null,
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistration: jest.fn().mockResolvedValue(registration),
          register: jest.fn(),
          ready: Promise.resolve(registration),
        },
      },
    });

    const resolved = await resolvePushServiceWorkerRegistration();

    expect(resolved).toBe(registration);
    expect(global.navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it("debe registrar el service worker cuando aun no existe uno activo", async () => {
    const registration = {
      active: { state: "activated" },
      waiting: null,
      installing: null,
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistration: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
          register: jest.fn().mockResolvedValue(registration),
          ready: Promise.resolve(registration),
        },
      },
    });

    const resolved = await resolvePushServiceWorkerRegistration();

    expect(global.navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
    });
    expect(resolved).toBe(registration);
  });
});
