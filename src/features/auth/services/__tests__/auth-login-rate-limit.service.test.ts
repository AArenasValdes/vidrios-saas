/** @jest-environment jsdom */

import { authLoginRateLimitService } from "../auth-login-rate-limit.service";

describe("authLoginRateLimitService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.useRealTimers();
  });

  it("activa y lee un cooldown local", () => {
    const until = authLoginRateLimitService.activate(5_000);

    expect(until).not.toBeNull();
    expect(authLoginRateLimitService.readUntil()).toBe(until);
    expect(authLoginRateLimitService.getRemainingMs()).toBeGreaterThan(0);
  });

  it("limpia el cooldown", () => {
    authLoginRateLimitService.activate(5_000);
    authLoginRateLimitService.clear();

    expect(authLoginRateLimitService.readUntil()).toBeNull();
    expect(authLoginRateLimitService.getRemainingMs()).toBe(0);
  });
});
