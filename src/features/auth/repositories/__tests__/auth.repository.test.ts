/** @jest-environment jsdom */

import { createAuthRepository } from "../auth.repository";
import type { Session } from "@supabase/supabase-js";

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
}

describe("authRepository", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("usa el fallback server-side cuando la lectura directa falla por get_org_id", async () => {
    const usersQuery = createQueryBuilder({
      data: null,
      error: new Error("42501 permission denied for function get_org_id"),
    });

    const supabaseMock = {
      from: jest.fn().mockReturnValue(usersQuery),
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token-123",
            },
          },
        }),
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          organizacionId: 3,
          rol: "admin",
        },
      }),
    }) as typeof fetch;

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    const profile = await repository.getUserProfile({
      authUserId: "user-1",
      email: "admin@test.com",
    });

    expect(profile).toEqual({
      organizacionId: 3,
      rol: "admin",
    });
    expect(global.fetch).toHaveBeenCalledWith("/api/auth/profile", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-123",
      },
    });
  });

  it("debe priorizar el token fresco del login y reintentar una vez si /api/auth/profile responde 401", async () => {
    const usersQuery = createQueryBuilder({
      data: {
        organization_id: 999,
        rol: "viewer",
      },
      error: null,
    });

    const supabaseMock = {
      from: jest.fn().mockReturnValue(usersQuery),
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token-viejo",
            } satisfies Partial<Session>,
          },
        }),
      },
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({
          profile: {
            organizacionId: 21,
            rol: "admin",
          },
        }),
      }) as typeof fetch;

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    const profile = await repository.getUserProfile(
      {
        authUserId: "user-2",
        email: "ventas@test.com",
      },
      {
        accessToken: "token-fresco",
        preferServerLookup: true,
        retryServerOnUnauthorized: true,
      }
    );

    expect(profile).toEqual({
      organizacionId: 21,
      rol: "admin",
    });
    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/auth/profile", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-fresco",
      },
    });
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/auth/profile", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-fresco",
      },
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
    expect(supabaseMock.auth.getSession).not.toHaveBeenCalled();
  });

  it("cae a la fila de users cuando /api/auth/profile no esta disponible", async () => {
    const usersQuery = createQueryBuilder({
      data: {
        organization_id: 3,
        rol: "admin",
      },
      error: null,
    });

    const supabaseMock = {
      from: jest.fn().mockReturnValue(usersQuery),
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: {
            session: {
              access_token: "token-local",
            },
          },
        }),
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      ok: false,
    }) as typeof fetch;

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    const profile = await repository.getUserProfile(
      {
        authUserId: "user-local",
        email: "admin@test.com",
      },
      {
        accessToken: "token-local",
        preferServerLookup: true,
      }
    );

    expect(profile).toEqual({
      organizacionId: 3,
      rol: "admin",
    });
    expect(supabaseMock.from).toHaveBeenCalled();
  });

  it("debe devolver sesion fresca al iniciar con password", async () => {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "sb-project-auth-token=token-sesion",
    });

    const supabaseMock = {
      auth: {
        signInWithPassword: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-3",
              email: "admin@test.com",
            },
            session: {
              access_token: "token-sesion",
            } as never,
          },
          error: null,
        }),
      },
    };

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    const result = await repository.signInWithPassword({
      email: "admin@test.com",
      password: "1234",
    });

    expect(result.user).toMatchObject({
      id: "user-3",
      email: "admin@test.com",
    });
    expect(result.accessToken).toBe("token-sesion");
  });

  it("debe cerrar sesion solo localmente cuando se pide scope local", async () => {
    const supabaseMock = {
      auth: {
        signOut: jest.fn().mockResolvedValue({
          error: null,
        }),
      },
    };

    const repository = createAuthRepository({
      browserClientFactory: () => supabaseMock as never,
    });

    await repository.signOut({
      scope: "local",
    });

    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({
      scope: "local",
    });
  });
});
