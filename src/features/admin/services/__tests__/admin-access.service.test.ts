import {
  canAccessFounderAdminPanel,
  isFounderAdminEmail,
} from "../admin-access.service";

describe("admin-access.service", () => {
  const originalEnv = process.env.VENTORA_FOUNDER_ADMIN_EMAILS;

  beforeEach(() => {
    process.env.VENTORA_FOUNDER_ADMIN_EMAILS = "founder@test.com";
  });

  afterEach(() => {
    process.env.VENTORA_FOUNDER_ADMIN_EMAILS = originalEnv;
  });

  it("permite al founder allowlist aunque no tenga perfil SaaS con rol admin", () => {
    expect(isFounderAdminEmail("FOUNDER@test.com")).toBe(true);
    expect(
      canAccessFounderAdminPanel({
        email: "founder@test.com",
        rol: null,
      })
    ).toBe(true);
  });

  it("rechaza correos fuera del allowlist aunque tengan rol admin", () => {
    expect(
      canAccessFounderAdminPanel({
        email: "cliente@test.com",
        rol: "admin",
      })
    ).toBe(false);
  });
});
