/** @jest-environment jsdom */

import { authLoginRateLimitService } from "../auth-login-rate-limit.service";

describe("authLoginRateLimitService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  it("no activa cooldown en el primer 429", () => {
    const state = authLoginRateLimitService.registerRateLimitedResponse(5_000);

    expect(state.blockedUntil).toBeNull();
    expect(state.recent429Count).toBe(1);
    expect(authLoginRateLimitService.readUntil()).toBeNull();
    expect(authLoginRateLimitService.getRemainingMs()).toBe(0);
  });

  it("activa cooldown en el segundo 429 dentro de la ventana", () => {
    const now = Date.now();

    authLoginRateLimitService.registerRateLimitedResponse(5_000, now);
    const state = authLoginRateLimitService.registerRateLimitedResponse(
      5_000,
      now + 1_000
    );

    expect(state.blockedUntil).toBe(now + 6_000);
    expect(authLoginRateLimitService.readUntil()).toBe(now + 6_000);
    expect(authLoginRateLimitService.getRemainingMs(now + 1_500)).toBe(4_500);
  });

  it("reinicia el contador si pasa la ventana entre 429", () => {
    const now = Date.now();

    authLoginRateLimitService.registerRateLimitedResponse(5_000, now);
    const state = authLoginRateLimitService.registerRateLimitedResponse(
      5_000,
      now + authLoginRateLimitService.getRetryWindowMs() + 1
    );

    expect(state.blockedUntil).toBeNull();
    expect(state.recent429Count).toBe(1);
  });

  it("limpia el cooldown", () => {
    authLoginRateLimitService.registerRateLimitedResponse(5_000, 1000);
    authLoginRateLimitService.registerRateLimitedResponse(5_000, 2000);
    authLoginRateLimitService.clear();

    expect(authLoginRateLimitService.readUntil()).toBeNull();
    expect(authLoginRateLimitService.getRemainingMs()).toBe(0);
    expect(authLoginRateLimitService.readState()).toEqual({
      blockedUntil: null,
      recent429Count: 0,
      last429At: null,
    });
  });
});
