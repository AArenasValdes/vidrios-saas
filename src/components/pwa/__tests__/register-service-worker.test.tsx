/** @jest-environment jsdom */

import { render, waitFor } from "@testing-library/react";

import { RegisterServiceWorker } from "../register-service-worker";

const mockIsCanonicalPwaHost = jest.fn();

jest.mock("@/utils/pwa-host", () => ({
  isCanonicalPwaHost: (hostname: string) => mockIsCanonicalPwaHost(hostname),
}));

describe("RegisterServiceWorker", () => {
  beforeEach(() => {
    mockIsCanonicalPwaHost.mockReturnValue(true);
  });

  afterEach(() => {
    delete window.__VIDRIOS_SAAS_SW_ENV__;
    jest.restoreAllMocks();
  });

  it("debe registrar el service worker en produccion", async () => {
    window.__VIDRIOS_SAAS_SW_ENV__ = "production";

    const update = jest.fn();
    const register = jest.fn().mockResolvedValue({
      update,
      waiting: null,
      installing: null,
      addEventListener: jest.fn(),
    });
    const getRegistrations = jest.fn();
    const cacheKeys = jest.fn();
    const cacheDelete = jest.fn();
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: cacheDelete,
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        getRegistrations,
        addEventListener,
        removeEventListener,
      },
    });

    render(<RegisterServiceWorker />);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js?version=dev", {
        scope: "/",
        updateViaCache: "none",
      })
    );

    expect(update).toHaveBeenCalled();
    expect(addEventListener).toHaveBeenCalledWith(
      "controllerchange",
      expect.any(Function)
    );
    expect(getRegistrations).not.toHaveBeenCalled();
    expect(cacheKeys).not.toHaveBeenCalled();
    expect(cacheDelete).not.toHaveBeenCalled();
  });

  it("debe limpiar service workers y caches fuera de produccion", async () => {
    window.__VIDRIOS_SAAS_SW_ENV__ = "test";

    const unregister = jest.fn().mockResolvedValue(true);
    const getRegistrations = jest.fn().mockResolvedValue([{ unregister }]);
    const register = jest.fn();
    const cacheDelete = jest.fn().mockResolvedValue(true);
    const cacheKeys = jest
      .fn()
      .mockResolvedValue(["vidrios-saas-v2", "otra-cache"]);

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: cacheDelete,
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        getRegistrations,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });

    render(<RegisterServiceWorker />);

    await waitFor(() => expect(getRegistrations).toHaveBeenCalled());
    await waitFor(() => expect(unregister).toHaveBeenCalled());
    await waitFor(() => expect(cacheKeys).toHaveBeenCalled());

    expect(register).not.toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith("vidrios-saas-v2");
    expect(cacheDelete).not.toHaveBeenCalledWith("otra-cache");
  });

  it("debe desactivar la PWA en produccion cuando el host no es canonico", async () => {
    window.__VIDRIOS_SAAS_SW_ENV__ = "production";
    mockIsCanonicalPwaHost.mockReturnValue(false);

    const unregister = jest.fn().mockResolvedValue(true);
    const getRegistrations = jest.fn().mockResolvedValue([{ unregister }]);
    const register = jest.fn();
    const cacheDelete = jest.fn().mockResolvedValue(true);
    const cacheKeys = jest
      .fn()
      .mockResolvedValue(["vidrios-saas-v8", "otra-cache"]);

    Object.defineProperty(window, "caches", {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: cacheDelete,
      },
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        register,
        getRegistrations,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });

    render(<RegisterServiceWorker />);

    await waitFor(() => expect(getRegistrations).toHaveBeenCalled());
    await waitFor(() => expect(unregister).toHaveBeenCalled());
    await waitFor(() => expect(cacheKeys).toHaveBeenCalled());

    expect(register).not.toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith("vidrios-saas-v8");
    expect(cacheDelete).not.toHaveBeenCalledWith("otra-cache");
  });
});
