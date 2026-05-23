import { isVentoraStorageKey } from "../auth-device-recovery.service";

describe("authDeviceRecoveryService helpers", () => {
  it("detecta keys locales de Ventora, PWA y Supabase", () => {
    expect(isVentoraStorageKey("vidrios-saas:auth-state")).toBe(true);
    expect(isVentoraStorageKey("ventora:pwa-install-dismissed")).toBe(true);
    expect(isVentoraStorageKey("sb-yrtrwgkaopfumpidjthk-auth-token")).toBe(true);
    expect(isVentoraStorageKey("other-key")).toBe(false);
  });
});
