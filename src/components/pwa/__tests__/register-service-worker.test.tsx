/** @jest-environment jsdom */

import { render, waitFor } from "@testing-library/react";

import { RegisterServiceWorker } from "../register-service-worker";

describe("RegisterServiceWorker", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it("debe registrar el service worker en produccion", async () => {
    process.env.NODE_ENV = "production";

    const update = jest.fn();
    const register = jest.fn().mockResolvedValue({ update });
    const getRegistrations = jest.fn();
    const cacheKeys = jest.fn();
    const cacheDelete = jest.fn();

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
      },
    });

    render(<RegisterServiceWorker />);

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
      })
    );

    expect(update).toHaveBeenCalled();
    expect(getRegistrations).not.toHaveBeenCalled();
    expect(cacheKeys).not.toHaveBeenCalled();
    expect(cacheDelete).not.toHaveBeenCalled();
  });

  it("debe limpiar service workers y caches fuera de produccion", async () => {
    process.env.NODE_ENV = "test";

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
});
