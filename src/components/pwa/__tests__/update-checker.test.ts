/** @jest-environment jsdom */

import {
  applyUpdateWithFeedback,
  fetchRemoteAppVersion,
  forceAppUpdate,
} from "../update-checker";
import { toast } from "sonner";

jest.mock("sonner", () => {
  const toastMock = jest.fn();

  toastMock.loading = jest.fn();
  toastMock.error = jest.fn();

  return {
    toast: toastMock,
  };
});

const mockedToast = toast as unknown as jest.Mock & {
  loading: jest.Mock;
  error: jest.Mock;
};

describe("update-checker", () => {
  const originalNavigator = global.navigator;
  const originalFetch = global.fetch;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("debe leer la version remota sin cache", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ version: "v2026.06.07-abcdef1" }),
    } as unknown as Response);

    await expect(fetchRemoteAppVersion()).resolves.toBe("v2026.06.07-abcdef1");
    expect(global.fetch).toHaveBeenCalledWith("/api/app-version", { cache: "no-store" });
  });

  it("debe activar un service worker que ya esta waiting", async () => {
    const postMessage = jest.fn();
    const registration = {
      waiting: { postMessage },
      installing: null,
      update: jest.fn(),
    };

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistration: jest.fn().mockResolvedValue(registration),
        },
      },
    });

    await expect(forceAppUpdate()).resolves.toBe("update-activated");
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("debe activar un service worker installing cuando ya esta installed", async () => {
    const postMessage = jest.fn();
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const registration = {
      waiting: null,
      installing: {
        state: "installed",
        postMessage,
        addEventListener,
        removeEventListener,
      },
      update: jest.fn(),
    };

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistration: jest.fn().mockResolvedValue(registration),
        },
      },
    });

    await expect(forceAppUpdate()).resolves.toBe("update-activated");
    expect(postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(removeEventListener).toHaveBeenCalledWith("statechange", expect.any(Function));
    expect(registration.update).not.toHaveBeenCalled();
  });

  it("debe resolver no-update cuando updatefound no ocurre", async () => {
    jest.useFakeTimers();

    const registration = {
      waiting: null,
      installing: null,
      addEventListener: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    Object.defineProperty(global, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          getRegistration: jest.fn().mockResolvedValue(registration),
        },
      },
    });

    const promise = forceAppUpdate();

    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(10000);

    await expect(promise).resolves.toBe("no-update");
    expect(registration.update).toHaveBeenCalled();
  });

  it("debe programar recarga fallback cuando la actualizacion se activa", async () => {
    jest.useFakeTimers();

    const update = jest.fn().mockResolvedValue("update-activated");
    const reload = jest.fn();

    await applyUpdateWithFeedback({
      update,
      reload,
      reloadDelayMs: 500,
    });

    expect(mockedToast.loading).toHaveBeenNthCalledWith(
      1,
      "Actualizando Ventora...",
      expect.objectContaining({
        id: "ventora-app-update",
        duration: Infinity,
      })
    );
    expect(mockedToast.loading).toHaveBeenNthCalledWith(
      2,
      "Aplicando actualizacion...",
      expect.objectContaining({
        id: "ventora-app-update",
        duration: Infinity,
      })
    );

    await jest.advanceTimersByTimeAsync(499);
    expect(reload).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("debe reemplazar el loading si no hay actualizacion pendiente", async () => {
    jest.useFakeTimers();

    const update = jest.fn().mockResolvedValue("no-update");
    const reload = jest.fn();

    await applyUpdateWithFeedback({
      update,
      reload,
      reloadDelayMs: 500,
    });

    expect(mockedToast.loading).toHaveBeenCalledWith(
      "Actualizando Ventora...",
      expect.objectContaining({
        id: "ventora-app-update",
      })
    );
    expect(mockedToast).toHaveBeenCalledWith(
      "No se encontro una actualizacion pendiente.",
      expect.objectContaining({
        id: "ventora-app-update",
        duration: 6000,
      })
    );

    await jest.advanceTimersByTimeAsync(500);
    expect(reload).not.toHaveBeenCalled();
  });

  it("debe convertir errores en feedback visible sin recarga infinita", async () => {
    jest.useFakeTimers();

    const update = jest.fn().mockRejectedValue(new Error("update failed"));
    const reload = jest.fn();

    await applyUpdateWithFeedback({
      update,
      reload,
      reloadDelayMs: 500,
    });

    expect(mockedToast.error).toHaveBeenCalledWith(
      "No pudimos actualizar automaticamente.",
      expect.objectContaining({
        id: "ventora-app-update",
        duration: 7000,
      })
    );

    await jest.advanceTimersByTimeAsync(500);
    expect(reload).not.toHaveBeenCalled();
  });
});
