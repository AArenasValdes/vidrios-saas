jest.mock("../auth-oauth-completion.service", () => ({
  resolveOAuthIdentity: jest.fn(),
  provisionOrganizationFromOAuthUser: jest.fn(),
}));
jest.mock("../auth-welcome-email.service", () => ({
  sendWelcomeEmail: jest.fn(),
}));

import { createAuthServerService } from "../auth-server.service";
import {
  provisionOrganizationFromOAuthUser,
  resolveOAuthIdentity,
} from "../auth-oauth-completion.service";
import type { Session, User } from "@supabase/supabase-js";

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

function createSession(user: User): Session {
  return {
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user,
  } as Session;
}

describe("authServerService.handleOAuthCallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirige a dashboard cuando el perfil ya existe", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockImplementation(async () => {
        const user = createUser();
        return {
          user,
          session: createSession(user),
        };
      }),
    };

    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "linked",
      organizationId: 77,
      userId: 9,
      syncedAuthUserId: false,
      accountComplete: true,
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
      session: createSession(createUser()),
    });
  });

  it("redirige a completar cuenta para un usuario Google nuevo", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockImplementation(async () => {
        const user = createUser();
        return {
          user,
          session: createSession(user),
        };
      }),
    };

    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "needs_signup",
    });

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "signup",
      provider: "google",
      nextPath: "https://evil.com/path",
    });

    expect(result).toEqual({
      kind: "redirect",
      path: "/auth/completar-cuenta?next=%2Factivacion",
      analytics: {
        event: "google_signup_started",
        provider: "google",
        intent: "signup",
        syncedAuthUserId: false,
      },
      session: createSession(createUser()),
    });
  });

  it("provisiona solo despues de confirmar el enlace de correo", async () => {
    const user = createUser({
      user_metadata: {
        ventora_signup: {
          version: 1,
          nombre: "Alessandro",
          empresaNombre: "Vidrios Sur",
          whatsapp: "+56912345678",
          ciudadComuna: "Santiago",
          countryCode: "CL",
          consentimientoAceptado: true,
        },
      },
    });
    const repository = {
      exchangeCodeForSession: jest.fn().mockResolvedValue({
        user,
        session: createSession(user),
      }),
    };
    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "needs_signup",
    });
    (provisionOrganizationFromOAuthUser as jest.Mock).mockResolvedValue({
      organizationId: 77,
      userId: 9,
      empresaNombre: "Vidrios Sur",
      trialEndsAt: "2026-08-29T00:00:00.000Z",
      alreadyProvisioned: false,
      accountComplete: true,
    });

    const result = await createAuthServerService({ repository }).handleOAuthCallback({
      code: "verified-email-code",
      intent: "signup",
      provider: "email",
      nextPath: "/activacion",
    });

    expect(provisionOrganizationFromOAuthUser).toHaveBeenCalledWith(
      expect.objectContaining({
        authUserId: "auth-1",
        email: "maestro@test.com",
        empresaNombre: "Vidrios Sur",
      })
    );
    expect(result).toMatchObject({
      kind: "redirect",
      path: "/activacion",
    });
  });

  it("redirige a completar cuenta si el usuario vinculado tiene datos pendientes", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockImplementation(async () => {
        const user = createUser();
        return {
          user,
          session: createSession(user),
        };
      }),
    };

    (resolveOAuthIdentity as jest.Mock).mockResolvedValue({
      status: "linked",
      organizationId: 77,
      userId: 9,
      syncedAuthUserId: false,
      accountComplete: false,
    });

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "login",
      provider: "google",
      nextPath: "/dashboard",
    });

    expect(result).toMatchObject({
      kind: "redirect",
      path: "/auth/completar-cuenta?next=%2Factivacion",
    });
  });

  it("rechaza callback sin correo", async () => {
    const repository = {
      exchangeCodeForSession: jest.fn().mockImplementation(async () => {
        const user = createUser({ email: undefined });
        return {
          user,
          session: createSession(user),
        };
      }),
    };

    const service = createAuthServerService({ repository });
    const result = await service.handleOAuthCallback({
      code: "oauth-code",
      intent: "login",
      provider: "google",
      nextPath: "/dashboard",
    });

    expect(result).toEqual({
      kind: "error_redirect",
      path: "/login?error=oauth_no_email",
      analytics: {
        event: "google_oauth_returned",
        provider: "google",
        intent: "login",
      },
    });
  });
});
