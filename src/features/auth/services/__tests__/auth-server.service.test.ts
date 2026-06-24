jest.mock("../auth-oauth-completion.service", () => ({
  resolveOAuthIdentity: jest.fn(),
}));

import { createAuthServerService } from "../auth-server.service";
import { resolveOAuthIdentity } from "../auth-oauth-completion.service";
import type { User } from "@supabase/supabase-js";

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "auth-1",
    email: "maestro@test.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}

describe("authServerService.handleOAuthCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirige a dashboard cuando el perfil ya existe", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockResolvedValue(createUser()),
    };

    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "linked",
      organizationId: 77,
      userId: 9,
      syncedAuthUserId: false,
    });

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "login",
      provider: "google",
      nextPath: "/dashboard",
    });

    expect(result).toEqual({
      kind: "redirect",
      path: "/dashboard",
      analytics: {
        event: "google_existing_login",
        provider: "google",
        intent: "login",
        syncedAuthUserId: false,
      },
    });
  });

  it("redirige a completar cuenta para Facebook sin signOut", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockResolvedValue(createUser()),
    };

    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "needs_signup",
    });

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "signup",
      provider: "facebook",
      nextPath: "https://evil.com/path",
    });

    expect(result).toEqual({
      kind: "redirect",
      path: "/auth/completar-cuenta?next=%2Fdashboard&intent=signup&provider=facebook",
      analytics: {
        event: "facebook_signup_started",
        provider: "facebook",
        intent: "signup",
        syncedAuthUserId: false,
      },
    });
  });

  it("rechaza callback sin correo", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockResolvedValue(createUser({ email: undefined })),
    };

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "login",
      provider: "facebook",
      nextPath: "/dashboard",
    });

    expect(result).toEqual({
      kind: "error_redirect",
      path: "/login?error=oauth_no_email",
      analytics: {
        event: "facebook_oauth_returned",
        provider: "facebook",
        intent: "login",
      },
    });
  });
});
